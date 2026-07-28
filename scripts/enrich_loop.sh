#!/bin/bash
# Ruft den lokalen Enrich-Endpoint in Schleife auf bis alles fertig ist.
# Admin-Token kommt aus der Umgebung (Secret ADMIN_TOKEN), niemals hardcoden.
TOKEN="${ADMIN_TOKEN:?ADMIN_TOKEN env var fehlt}"
URL="http://localhost:8080/api/admin/routes/enrich-next?n=10"

while true; do
  RESP=$(curl -s -X POST "$URL" -H "x-admin-token: $TOKEN" --max-time 900)
  DONE=$(echo "$RESP" | grep -o '"done":true')
  PENDING=$(echo "$RESP" | grep -o '"pending":[0-9]*' | cut -d: -f2)
  CPENDING=$(echo "$RESP" | grep -o '"cantonsPending":[0-9]*' | cut -d: -f2)
  echo "$(date +%H:%M:%S) pending=$PENDING cantonsPending=$CPENDING"
  if [ -n "$DONE" ]; then echo "FERTIG"; break; fi
  [ -z "$RESP" ] && sleep 20
  sleep 2
done
