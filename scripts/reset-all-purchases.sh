#!/bin/bash
# Setzt ALLE Nutzer zurück:
# - premium = false
# - purchasedPacks = []
# - subscriptionTier = "free"
# - RC-Sync gesperrt für 30 Tage (verhindert Auto-Wiederherstellung)

ADMIN_TOKEN="${ADMIN_TOKEN:-}"
API="${1:-https://saga-trail.replit.app}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Fehler: ADMIN_TOKEN nicht gesetzt."
  echo "Nutzung: ADMIN_TOKEN=xxx bash reset-all-purchases.sh [API_URL]"
  exit 1
fi

echo "Setze alle Käufe zurück auf: $API"
echo "Bitte bestätigen (ja/nein):"
read CONFIRM
if [ "$CONFIRM" != "ja" ]; then
  echo "Abgebrochen."
  exit 0
fi

curl -s -X POST "$API/api/admin/reset-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
