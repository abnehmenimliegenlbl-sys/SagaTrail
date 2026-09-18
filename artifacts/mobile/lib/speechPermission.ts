export type SpeechPermissionResponse = {
  granted?: boolean;
  status?: string;
} | null | undefined;

export type SpeechPermissionReadState = "granted" | "denied" | "unknown";

/**
 * expo-speech-recognition returns `status` on iOS, while some platforms and
 * wrappers also expose the convenience boolean `granted`.
 */
export function isSpeechPermissionGranted(
  response: SpeechPermissionResponse,
): boolean {
  return response?.granted === true || response?.status === "granted";
}

/**
 * Native permission reads can fail transiently while iOS is returning from a
 * permission sheet or an app-state transition. Do not turn such a failed read
 * into a confirmed denial.
 */
export async function readSpeechPermissionWithRetry(
  read: () => Promise<SpeechPermissionResponse>,
): Promise<SpeechPermissionReadState> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await read();
      return isSpeechPermissionGranted(response) ? "granted" : "denied";
    } catch {
      if (attempt === 2) return "unknown";
      await new Promise<void>((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  return "unknown";
}