#!/usr/bin/env python3
"""
Regeneriert Sagen-Texte für gegebene Kantone aus echtem historischem Quellenwissen.
Verwendet Claude mit expliziter Anweisung: NUR belegbare Details, keine Erfindungen.
Usage: python3 scripts/regenerate-sagas.py Solothurn "Basel-Stadt"
"""

import sys, os, json, time, re
import requests

CANTONS = sys.argv[1:]
if not CANTONS:
    print("Bitte Kanton(e) angeben, z.B.: python3 scripts/regenerate-sagas.py Solothurn 'Basel-Stadt'")
    sys.exit(1)

API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
if not API_KEY:
    print("ANTHROPIC_API_KEY nicht gesetzt")
    sys.exit(1)

LANGS = ['de', 'en', 'fr', 'it', 'es', 'pt', 'zh', 'gsw', 'ru']
JSON_PATH = 'artifacts/api-server/src/lib/curatedSagasPakete.json'

with open(JSON_PATH, 'r') as f:
    data = json.load(f)

target_sagas = [s for s in data if s.get('canton') in CANTONS]
print(f"\nKantone: {', '.join(CANTONS)}")
print(f"{len(target_sagas)} Sagen zu regenerieren\n")

SYSTEM = """Du bist Experte für Schweizer Volkssagen und historische Überlieferungen.
Deine Aufgabe ist es, Sagentexte quellentreu zu formulieren.

WICHTIGE REGELN:
1. Schreibe NUR Details, die in den historischen Quellen tatsächlich belegt sind
2. Erfinde KEINE Details, Namen, Orte oder Handlungen hinzu
3. Wenn du dir bei einem Detail unsicher bist, formuliere es als "soll..." / "der Überlieferung nach..."
4. Behalte den erzählerischen Ton einer Sage, aber bleib faktentreu
5. Länge: ca. 600-800 Zeichen pro Sprache (Lesedauer ~45-60 Sekunden)
6. Schweizerdeutsch (gsw): Hochdeutsch mit Schweizer Ausdruck, KEIN starker Dialekt
7. Texte sind für Wanderer gedacht, die diesen Ort gerade besuchen"""

def rewrite_saga(saga):
    saga_id = saga['id']
    title = saga['title']
    print(f"  → {saga_id}: {title}")

    existing_de = saga.get('summary') or saga.get('summaries', {}).get('de', {}).get('text', '')

    source_info = f"""Titel: {title}
Kanton: {saga.get('canton', '')}
Kern-Motiv: {saga.get('coreMotif', '')}
Historische Quelle: {saga.get('source', '')}
Quellennachweis: {saga.get('quelle', {}).get('werk', '')} ({saga.get('quelle', {}).get('autor', '')}, {saga.get('quelle', {}).get('jahr', '')})
Fundstelle: {saga.get('quelle', {}).get('fundstelleUrl', '')}
Bisheriger deutscher Text (möglicherweise ungenau): {existing_de}"""

    user_prompt = f"""Schreibe die folgende Schweizer Sage für alle angegebenen Sprachen neu — ausschließlich basierend auf historisch belegten Quellen. Wenn der bisherige Text Erfindungen oder Ungenauigkeiten enthält, korrigiere sie.

{source_info}

Antworte mit einem JSON-Objekt mit den Sprachcodes als Keys:
{{
  "de": {{"title": "...", "text": "..."}},
  "en": {{"title": "...", "text": "..."}},
  "fr": {{"title": "...", "text": "..."}},
  "it": {{"title": "...", "text": "..."}},
  "es": {{"title": "...", "text": "..."}},
  "pt": {{"title": "...", "text": "..."}},
  "zh": {{"title": "...", "text": "..."}},
  "gsw": {{"title": "...", "text": "..."}},
  "ru": {{"title": "...", "text": "..."}}
}}

Nur das JSON zurückgeben, kein anderer Text."""

    for attempt in range(3):
        try:
            resp = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                json={
                    'model': 'claude-opus-4-5',
                    'max_tokens': 6000,
                    'system': SYSTEM,
                    'messages': [{'role': 'user', 'content': user_prompt}],
                },
                timeout=120,
            )
            resp.raise_for_status()
            raw = resp.json()['content'][0]['text'].strip()
            # Strip markdown fences
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            parsed = json.loads(raw)
            missing = [l for l in LANGS if not parsed.get(l, {}).get('text')]
            if missing:
                raise ValueError(f"Fehlende Sprachen: {missing}")
            print(f"    ✓ {saga_id}")
            return parsed
        except Exception as e:
            print(f"    ✗ Versuch {attempt+1}/3: {e}")
            if attempt < 2:
                time.sleep(3)
    return None

updated = 0
for saga in target_sagas:
    new_summaries = rewrite_saga(saga)
    if not new_summaries:
        print(f"    ✗✗ {saga['id']} übersprungen")
        continue

    idx = next(i for i,s in enumerate(data) if s['id'] == saga['id'])
    if 'summaries' not in data[idx]:
        data[idx]['summaries'] = {}
    for lang in LANGS:
        if lang not in data[idx]['summaries']:
            data[idx]['summaries'][lang] = {}
        data[idx]['summaries'][lang]['title'] = new_summaries[lang]['title']
        data[idx]['summaries'][lang]['text'] = new_summaries[lang]['text']
        data[idx]['summaries'][lang]['reviewEmpfohlen'] = False
    data[idx]['summary'] = new_summaries['de']['text']
    updated += 1
    # Save incrementally after each saga
    with open(JSON_PATH, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"    💾 gespeichert ({updated} bisher)")
    time.sleep(0.5)

print(f"\n✅ Fertig: {updated}/{len(target_sagas)} Sagen aktualisiert → {JSON_PATH}")
