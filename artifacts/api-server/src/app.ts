import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import fs from "fs";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import routesExplorerRouter from "./routes/routesExplorer";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { WebhookHandlers } from "./lib/webhookHandlers";
import { handleStripeEvent } from "./lib/partnerWebhookHandler";
import { resolveRegionalLocalLogoFile } from "./lib/routeLogoResolver";
import Stripe from "stripe";
import { CANTON_WAPPEN_SVG } from "../../mobile/constants/cantonWappenSvg";

const app: Express = express();

// Offizielle Kantonswappen für die WordPress-Routenansicht.
// Die SVGs stammen aus dem stabilen SagaTrail-Assetbestand; Wikimedia wird
// hier bewusst nicht als Laufzeitabhängigkeit verwendet.
app.get("/api/canton-wappen/:code.svg", (req, res) => {
  const code = String(req.params.code ?? "").toUpperCase();
  const svg = /^[A-Z]{2}$/.test(code) ? CANTON_WAPPEN_SVG[code] : undefined;
  if (!svg) {
    res.status(404).type("text/plain").send("Canton emblem not found");
    return;
  }
  res
    .type("image/svg+xml")
    .set("Cache-Control", "public, max-age=2592000, immutable")
    .send(svg);
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ─── Stripe-Webhook MUSS vor express.json() registriert werden ────────────────
// Der Webhook braucht den rohen Buffer, nicht geparstes JSON.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // ── Signatur-Verifikation (direkt via Stripe SDK, unabhängig von stripe-replit-sync) ──
    // Unterstützt zwei Secrets: STRIPE_WEBHOOK_SECRET (Live/Prod) + STRIPE_WEBHOOK_SECRET_CLI (Test-CLI)
    let event: Stripe.Event | undefined;
    const cliSecret = process.env.STRIPE_WEBHOOK_SECRET_CLI;
    const secrets = [webhookSecret, cliSecret].filter(Boolean) as string[];

    if (secrets.length > 0) {
      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
      let verified = false;
      for (const secret of secrets) {
        try {
          event = stripeClient.webhooks.constructEvent(req.body as Buffer, sig, secret);
          verified = true;
          break;
        } catch {
          // nächsten Secret versuchen
        }
      }
      if (!verified) {
        logger.warn("Stripe-Webhook-Signatur ungültig (alle Secrets fehlgeschlagen)");
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
    } else {
      // Kein Secret konfiguriert — Event ohne Verifikation parsen (nur Dev/Test)
      try {
        event = JSON.parse((req.body as Buffer).toString("utf8")) as Stripe.Event;
        logger.warn({ eventType: event.type }, "Stripe-Webhook ohne Signatur-Verifikation verarbeitet");
      } catch {
        res.status(400).json({ error: "Invalid JSON" });
        return;
      }
    }

    // ── stripe-replit-sync (optional, kann scheitern) ──
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    } catch (syncErr: any) {
      logger.warn({ err: syncErr }, "stripe-replit-sync fehlgeschlagen (nicht kritisch)");
    }

    // ── Eigene Business-Logik ──
    if (!event) {
      // Kann nach der Verifikations-/Parse-Logik oben nicht passieren —
      // Absicherung fuer den Typchecker und gegen zukuenftige Umbauten.
      res.status(400).json({ error: "Kein Event" });
      return;
    }
    try {
      await handleStripeEvent(event);
    } catch (bizErr: any) {
      logger.error({ err: bizErr }, "Stripe-Business-Logik-Fehler (nicht kritisch)");
    }

    res.status(200).json({ received: true });
  },
);

app.use(cors({ credentials: true, origin: true }));
// Limit erhoeht: der GPX-Import (/api/routes/gpx) sendet komplette
// GPX-Dateien als JSON-Text; typische Tracks liegen bei 0.1-5 MB.
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

// Loest den Publishable Key anhand des eingehenden Hosts auf, damit derselbe
// Server mehrere Clerk-Custom-Domains bedienen kann.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api/partner-fotos", express.static(path.join(__dirname, "../public/partner-fotos")));
// Offizielle, unveränderte SchweizMobil-Logos für die WordPress-Routenansicht.
// Die Dateien stammen aus dem gebündelten Mobile-Asset-Verzeichnis und werden
// ausschließlich lesend ausgeliefert.
const regionalLocalLogoDir = path.join(
  __dirname,
  "../../mobile/assets/schweizmobil/regional-local",
);
const regionalLocalLogoFiles = new Set(
  fs.readdirSync(regionalLocalLogoDir).filter((file) => /^WL_\d{3}(?:_[A-Z]{2})?\.jpg$/.test(file)),
);
const knownCantonCodes = new Set(Object.keys(CANTON_WAPPEN_SVG));
// Liefert für eine regionale/lokale Route die erste tatsächlich vorhandene
// offizielle Datei. Einige Routen (z. B. 85 und 99) existieren ausschließlich
// als kantonsbezogene JPGs und haben keine WL_XXX.jpg-Datei.
app.get("/api/route-logos/resolve/:number/:canton", (req, res): void => {
  const number = String(req.params.number ?? "");
  const canton = String(req.params.canton ?? "").toUpperCase();
  if (!/^\d{2,3}$/.test(number) || !/^[A-Z]{2}$/.test(canton)) {
    res.status(400).type("text/plain").send("Invalid route logo parameters");
    return;
  }

  const file = resolveRegionalLocalLogoFile(
    number,
    canton,
    regionalLocalLogoFiles,
    knownCantonCodes,
  );
  if (!file) {
    res.status(404).end();
    return;
  }

  res
    .type("image/jpeg")
    .set("Cache-Control", "public, max-age=2592000, immutable")
    .sendFile(path.join(regionalLocalLogoDir, file));
});

app.use(
  "/api/route-logos",
  express.static(regionalLocalLogoDir, {
    immutable: true,
    maxAge: "30d",
  }),
);
app.use(
  "/api/route-logos",
  express.static(path.join(__dirname, "../../mobile/assets/schweizmobil"), {
    immutable: true,
    maxAge: "30d",
  }),
);
app.use("/routen", routesExplorerRouter);
app.use("/api", router);

export default app;
