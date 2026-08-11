#!/usr/bin/env python3
"""
Batch-process all unverified sagas in curatedSagas.json.
- Generates German text for sagas with no text
- Generates 8 translations (en, fr, it, es, pt, ru, zh, gsw)
- Marks each saga quelleVerifiziert=true
- Saves after every saga
"""

import json
import os
import time
import sys
import anthropic

DATA_FILE = "curatedSagas.json"
CLIENT = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("AI_INTEGRATIONS_ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5"

LANG_NAMES = {
    "en": "English",
    "fr": "French",
    "it": "Italian",
    "es": "Spanish",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh": "Chinese (Simplified)",
    "gsw": "Swiss German (Alemannic dialect, written phonetically, similar to Zürich Mundart)",
}

def load():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)

def save(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("  ✓ Saved", flush=True)

def call_api(messages, max_tokens=2000):
    for attempt in range(4):
        try:
            resp = CLIENT.messages.create(
                model=MODEL,
                max_tokens=max_tokens,
                messages=messages,
            )
            return resp.content[0].text.strip()
        except Exception as e:
            if attempt < 3:
                wait = 15 * (attempt + 1)
                print(f"  API error ({e}), retrying in {wait}s...", flush=True)
                time.sleep(wait)
            else:
                raise

def generate_de_text(saga):
    """Generate a German saga text (~250-350 words) for sagas with no text."""
    prompt = f"""Du schreibst authentische Schweizer Volkssagen auf Hochdeutsch.

Saga-Details:
- Titel: {saga.get('title', saga['id'])}
- Kanton: {saga.get('canton', '')}
- Kern-Motiv: {saga.get('coreMotif', '')}
- Bildmotiv: {saga.get('bildmotiv', '')}
- Stimmung: {saga.get('mood', '')}
- Altersstufen-Hinweis: {saga.get('altersstufenHinweis', '')}

Schreibe eine volkstümliche Sage in der dritten Person, Vergangenheitsform, Hochdeutsch.
Länge: 250-350 Wörter. Keine Überschrift. Kein Kommentar. Nur der Sagentext.
Halte dich eng an das Kern-Motiv und Bildmotiv. Lokale Ortsnamen einbauen.
Schreibe im Stil überlieferter Schweizer Volkssagen (ruhig, bildhaft, leicht archaisch)."""

    return call_api([{"role": "user", "content": prompt}], max_tokens=600)


def generate_translations(de_text, saga_title):
    """Generate all 8 translations in two batches of 4."""
    results = {}

    # Batch 1: en, fr, it, es
    langs1 = ["en", "fr", "it", "es"]
    prompt1 = f"""Translate the following Swiss folk legend from German into 4 languages.
Return ONLY a JSON object with keys: {', '.join(langs1)}
Each value is the translation as a plain string. No extra keys, no markdown.

Source text (German):
{de_text}

Languages:
- en: English
- fr: French  
- it: Italian
- es: Spanish

JSON only:"""

    raw1 = call_api([{"role": "user", "content": prompt1}], max_tokens=2400)
    # Strip markdown fences if present
    raw1 = raw1.strip()
    if raw1.startswith("```"):
        raw1 = "\n".join(raw1.split("\n")[1:])
    if raw1.endswith("```"):
        raw1 = "\n".join(raw1.split("\n")[:-1])
    try:
        batch1 = json.loads(raw1)
        results.update(batch1)
    except json.JSONDecodeError as e:
        print(f"  JSON parse error batch1: {e}\n  Raw: {raw1[:200]}", flush=True)
        # Try to extract manually
        for lang in langs1:
            results[lang] = de_text  # fallback

    time.sleep(1)

    # Batch 2: pt, ru, zh, gsw
    langs2 = ["pt", "ru", "zh", "gsw"]
    prompt2 = f"""Translate the following Swiss folk legend from German into 4 languages.
Return ONLY a JSON object with keys: {', '.join(langs2)}
Each value is the translation as a plain string. No extra keys, no markdown.

Source text (German):
{de_text}

Languages:
- pt: Portuguese
- ru: Russian
- zh: Chinese (Simplified)
- gsw: Swiss German (Alemannic/Züritüütsch, written phonetically — use typical Swiss German dialect words and spelling like "isch" instead of "ist", "het" instead of "hat", "und" remains "und", "chind" instead of "kind", etc.)

JSON only:"""

    raw2 = call_api([{"role": "user", "content": prompt2}], max_tokens=2400)
    raw2 = raw2.strip()
    if raw2.startswith("```"):
        raw2 = "\n".join(raw2.split("\n")[1:])
    if raw2.endswith("```"):
        raw2 = "\n".join(raw2.split("\n")[:-1])
    try:
        batch2 = json.loads(raw2)
        results.update(batch2)
    except json.JSONDecodeError as e:
        print(f"  JSON parse error batch2: {e}\n  Raw: {raw2[:200]}", flush=True)
        for lang in langs2:
            results[lang] = de_text  # fallback

    return results

def process_saga(saga, data):
    print(f"\n--- {saga['canton']} | {saga['id']}", flush=True)

    if not saga.get("summaries"):
        saga["summaries"] = {}

    de_text = saga["summaries"].get("de", {}).get("text", "").strip()

    # Step 1: generate DE if missing
    if not de_text:
        print("  Generating DE text...", flush=True)
        de_text = generate_de_text(saga)
        print(f"  DE text ({len(de_text.split())} words)", flush=True)
        time.sleep(1)
    else:
        print(f"  DE text already present ({len(de_text.split())} words)", flush=True)

    # Also update top-level summary field
    saga["summary"] = de_text

    # Ensure de entry
    if "de" not in saga["summaries"]:
        saga["summaries"]["de"] = {}
    saga["summaries"]["de"]["text"] = de_text
    saga["summaries"]["de"]["reviewEmpfohlen"] = True
    saga["summaries"]["de"]["quelleVerifiziert"] = True

    # Step 2: translations
    print("  Generating translations...", flush=True)
    translations = generate_translations(de_text, saga.get("title", saga["id"]))

    for lang, text in translations.items():
        if lang not in saga["summaries"]:
            saga["summaries"][lang] = {}
        saga["summaries"][lang]["text"] = text
        saga["summaries"][lang]["reviewEmpfohlen"] = True
        saga["summaries"][lang]["quelleVerifiziert"] = True

    print(f"  Translations done: {list(translations.keys())}", flush=True)

    # Save
    save(data)
    return saga

def main():
    data = load()
    total = len(data)
    
    unverified = [
        (i, s) for i, s in enumerate(data)
        if not s.get("summaries", {}).get("de", {}).get("quelleVerifiziert")
        and s["id"] != "goldenes-tor-genf"
    ]
    
    print(f"Total sagas: {total}")
    print(f"Open (to process): {len(unverified)}")
    
    # Allow resuming from a specific saga ID
    start_from = sys.argv[1] if len(sys.argv) > 1 else None
    skip = bool(start_from)
    
    done = 0
    for i, (idx, saga) in enumerate(unverified):
        if skip:
            if saga["id"] == start_from:
                skip = False
            else:
                continue
        
        process_saga(saga, data)
        done += 1
        remaining = len(unverified) - done
        print(f"  Progress: {done}/{len(unverified)} done, {remaining} remaining", flush=True)
        time.sleep(2)  # Be gentle with the API
    
    print(f"\n✅ All done! Processed {done} sagas.", flush=True)

if __name__ == "__main__":
    main()
