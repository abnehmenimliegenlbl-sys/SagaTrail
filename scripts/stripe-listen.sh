#!/usr/bin/env bash
# Stripe CLI Webhook-Forwarder für lokale Tests
# Startet via Replit-Workflow — kein Mac/Windows nötig

set -e

STRIPE_BIN="/home/runner/workspace/.local/bin/stripe"
STRIPE_VERSION="1.44.0"

if [ ! -f "$STRIPE_BIN" ]; then
  echo "Stripe CLI wird heruntergeladen..."
  mkdir -p "$(dirname "$STRIPE_BIN")"
  curl -fsSL "https://github.com/stripe/stripe-cli/releases/download/v${STRIPE_VERSION}/stripe_${STRIPE_VERSION}_linux_x86_64.tar.gz" \
    | tar -xz -C "$(dirname "$STRIPE_BIN")"
  chmod +x "$STRIPE_BIN"
  echo "Stripe CLI v${STRIPE_VERSION} bereit."
fi

echo ""
echo "Webhook-Forwarding aktiv → https://api.sagatrail.ch/api/stripe/webhook"
echo "Testkarte: 4242 4242 4242 4242 · Ablauf: 12/34 · CVC: 123"
echo ""

exec "$STRIPE_BIN" listen \
  --api-key "$STRIPE_SECRET_KEY" \
  --forward-to "https://api.sagatrail.ch/api/stripe/webhook"
