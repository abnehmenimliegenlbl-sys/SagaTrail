#!/usr/bin/env python3
import json, os, time, re, requests

API_KEY = os.environ['ANTHROPIC_API_KEY']
JSON_PATH = 'artifacts/api-server/src/lib/curatedSagasPakete.json'
data = json.load(open(JSON_PATH))
LANGS = ['de','en','fr','it','es','pt','zh','gsw','ru']
REMAINING = ['schnabelgeiss-basel', 'st-johanns-gespenst']
target = [s for s in data if s['id'] in REMAINING]

SYSTEM = ('Du bist Experte für Schweizer Volkssagen. Schreibe NUR historisch belegte Details, '
          'keine Erfindungen. Formuliere Unsicheres als "soll..." / "der Überlieferung nach...". '
          'Länge: 600-800 Zeichen pro Sprache. Schweizerdeutsch (gsw): Hochdeutsch mit Schweizer Ausdruck.')

for saga in target:
    print(f'  -> {saga["id"]}')
    existing = saga.get('summary') or saga.get('summaries', {}).get('de', {}).get('text', '')
    prompt = (
        'Schreibe diese Basler Sage quellentreu neu in allen 9 Sprachen.\n'
        f'Titel: {saga["title"]}\n'
        f'Quelle: {saga.get("source", "")}\n'
        f'Bisheriger Text (ggf. ungenau): {existing}\n\n'
        'Gib ein JSON-Objekt zurueck mit Keys de/en/fr/it/es/pt/zh/gsw/ru, '
        'jeweils {"title": "...", "text": "..."}. Nur JSON, kein anderer Text.'
    )

    for attempt in range(3):
        try:
            r = requests.post(
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
                    'messages': [{'role': 'user', 'content': prompt}],
                },
                timeout=120,
            )
            r.raise_for_status()
            raw = r.json()['content'][0]['text'].strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            parsed = json.loads(raw)
            missing = [l for l in LANGS if not parsed.get(l, {}).get('text')]
            if missing:
                raise ValueError(f'Fehlend: {missing}')
            idx = next(i for i, s in enumerate(data) if s['id'] == saga['id'])
            if 'summaries' not in data[idx]:
                data[idx]['summaries'] = {}
            for lang in LANGS:
                if lang not in data[idx]['summaries']:
                    data[idx]['summaries'][lang] = {}
                data[idx]['summaries'][lang]['title'] = parsed[lang]['title']
                data[idx]['summaries'][lang]['text'] = parsed[lang]['text']
                data[idx]['summaries'][lang]['reviewEmpfohlen'] = False
            data[idx]['summary'] = parsed['de']['text']
            with open(JSON_PATH, 'w') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f'    OK gespeichert')
            break
        except Exception as e:
            print(f'    Fehler Versuch {attempt+1}: {e}')
            if attempt < 2:
                time.sleep(3)
    time.sleep(0.5)

print('Fertig')
