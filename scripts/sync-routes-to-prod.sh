#!/usr/bin/env bash
set -e

PROD_API="https://api.sagatrail.ch/api/admin/routes/bulk-insert"
BATCH=100

TOTAL=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM external_routes;" | tr -d ' \n')
echo "Dev-Routen total: $TOTAL"

INSERTED=0
ERRORS=0

for (( OFFSET=0; OFFSET<TOTAL; OFFSET+=BATCH )); do
  JSON=$(psql "$DATABASE_URL" -t -c \
    "SELECT json_agg(row_to_json(r)) FROM (
       SELECT id, saga_id, canton, cantons, name, ref,
              distance_km, distance_tag_km, ascent_m, max_elevation_m, minutes,
              sac, terrain, lat, lng, geometry, geometry_version,
              source, featured, photo_url, photo_attribution,
              route_type, is_etappe, description, description_source
       FROM external_routes
       ORDER BY id
       LIMIT $BATCH OFFSET $OFFSET
     ) r;" | tr -d '\n' | sed 's/^ *//')

  STATUS=$(echo "$JSON" | curl -s -o /tmp/sync_resp.txt -w "%{http_code}" \
    -X POST "$PROD_API" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: $ADMIN_TOKEN" \
    --data-binary @-)

  if [ "$STATUS" != "200" ]; then
    echo "Batch $OFFSET FEHLER $STATUS: $(cat /tmp/sync_resp.txt | head -c 200)"
    (( ERRORS++ ))
  else
    (( INSERTED+=BATCH ))
    echo "  $INSERTED/$TOTAL eingespielt..."
  fi
done

echo "Fertig: ~$INSERTED Routen eingespielt, $ERRORS Fehler"
