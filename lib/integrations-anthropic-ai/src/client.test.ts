import assert from "node:assert/strict";
import { test } from "node:test";

test("binds Anthropic SDK methods and falls back to the Replit client", async () => {
  const envKeys = [
    "ANTHROPIC_API_KEY",
    "AI_INTEGRATIONS_ANTHROPIC_API_KEY",
    "AI_INTEGRATIONS_ANTHROPIC_BASE_URL",
  ] as const;
  const previousEnv = new Map(
    envKeys.map((key) => [key, process.env[key]] as const),
  );
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];

  process.env.ANTHROPIC_API_KEY = "test-direct-key";
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-proxy-key";
  process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "https://proxy.test/v1";

  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    const [input] = args;
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://proxy.test/")) {
      requests.push("proxy");
      return new Response(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-haiku-4-5",
          content: [{ type: "text", text: "fallback text" }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "request-id": "req_test",
          },
        },
      );
    }

    requests.push("direct");
    return new Response(
      JSON.stringify({
        type: "error",
        error: { type: "authentication_error", message: "test rejection" },
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
          "request-id": "req_test",
        },
      },
    );
  }) as typeof fetch;

  try {
    const { anthropic } = await import("./client");
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(response.content[0]?.type, "text");
    assert.equal(
      response.content[0]?.type === "text" ? response.content[0].text : "",
      "fallback text",
    );
    assert.deepEqual(requests, ["direct", "proxy"]);
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of envKeys) {
      const value = previousEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});