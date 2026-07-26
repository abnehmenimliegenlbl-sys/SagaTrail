import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
import Stripe from "stripe";

const app: Express = express();

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

    try {
      // 1. stripe-replit-sync synchronisiert Stripe-Daten in die stripe.*-Tabellen
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      // 2. Eigene Business-Logik — Signatur wurde in Schritt 1 bereits geprüft,
      //    daher können wir den Buffer direkt als JSON parsen.
      try {
        const event = JSON.parse((req.body as Buffer).toString("utf8")) as Stripe.Event;
        await handleStripeEvent(event);
      } catch (bizErr: any) {
        logger.error({ err: bizErr }, "Stripe-Business-Logik-Fehler (nicht kritisch)");
        // Trotzdem 200 zurückgeben, damit Stripe nicht nochmal versucht
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe-Webhook-Fehler");
      res.status(400).json({ error: "Webhook processing error" });
    }
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
app.use("/routen", routesExplorerRouter);
app.use("/api", router);

export default app;
