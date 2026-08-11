/**
 * Regeneriert Sagen-Texte für gegebene Kantone aus echtem historischem Quellenwissen.
 * Verwendet Claude mit expliziter Anweisung: NUR belegbare Details, keine Erfindungen.
 * Usage: node scripts/regenerate-sagas.mjs [Kanton1] [Kanton2] ...
 * Beispiel: node scripts/regenerate-sagas.mjs Solothurn Basel-Stadt
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const CANTONS = process.argv.slice(2);
if (CANTONS.length === 0) {
  console.error('Bitte Kanton(e) angeben, z.B.: node scripts/regenerate-sagas.mjs Solothurn Basel-Stadt');
  process.exit(1);
}

const LANGS = ['de', 'en', 'fr', 'it', 'es', 'pt', 'zh', 'gsw', 'ru'];

const LANG_NAMES = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
  es: 'Spanisch',
  pt: 'Portugiesisch',
  zh: 'Chinesisch (Vereinfacht)',
  gsw: 'Schweizerdeutsch',
  ru: 'Russisch',
};

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const JSON_PATH = path.resolve('artifacts/api-server/src/lib/curatedSagasPakete.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const targetSagas = data.filter(s => CANTONS.includes(s.canton));
console.log(`\nKantone: ${CANTONS.join(', ')}`);
console.log(`${targetSagas.length} Sagen zu regenerieren\n`);

async function rewriteSaga(saga) {
  console.log(`\n→ ${saga.id}: ${saga.title}`);

  const sourceInfo = `
Titel: ${saga.title}
Kanton: ${saga.canton}
Kern-Motiv: ${saga.coreMotif}
Historische Quelle: ${saga.source}
Quellennachweis: ${saga.quelle?.werk || ''} (${saga.quelle?.autor || ''}, ${saga.quelle?.jahr || ''})
Fundstelle: ${saga.quelle?.fundstelleUrl || ''}
Bisheriger deutscher Text (möglicherweise ungenau): ${saga.summary || saga.summaries?.de?.text || ''}
`.trim();

  const systemPrompt = `Du bist Experte für Schweizer Volkssagen und historische Überlieferungen. 
Deine Aufgabe ist es, Sagentexte quellentreu zu formulieren.

WICHTIGE REGELN:
1. Schreibe NUR Details, die in den historischen Quellen tatsächlich belegt sind
2. Erfinde KEINE Details, Namen, Orte oder Handlungen hinzu
3. Wenn du dir bei einem Detail unsicher bist, lasse es weg oder formuliere es als "soll..." / "der Überlieferung nach..."
4. Behalte den erzählerischen Ton einer Sage, aber bleib faktentreu
5. Länge: ca. 600-800 Zeichen pro Sprache (Lesedauer ~45-60 Sekunden)
6. Schweizerdeutsch (gsw): Hochdeutsch mit Schweizer Ausdruck, KEIN starker Dialekt
7. Der Text soll für Wanderer geeignet sein, die diesen Ort gerade besuchen`;

  const userPrompt = `Schreibe die folgende Schweizer Sage für alle angegebenen Sprachen neu — ausschließlich basierend auf historisch belegten Quellen.

${sourceInfo}

Antworte mit einem JSON-Objekt mit den Sprachcodes als Keys:
{
  "de": { "title": "...", "text": "..." },
  "en": { "title": "...", "text": "..." },
  "fr": { "title": "...", "text": "..." },
  "it": { "title": "...", "text": "..." },
  "es": { "title": "...", "text": "..." },
  "pt": { "title": "...", "text": "..." },
  "zh": { "title": "...", "text": "..." },
  "gsw": { "title": "...", "text": "..." },
  "ru": { "title": "...", "text": "..." }
}

Nur das JSON zurückgeben, kein anderer Text.`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const raw = response.content[0].text.trim();
      // Strip markdown code fences if present
      const jsonStr = raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
      const parsed = JSON.parse(jsonStr);

      // Validate all languages present
      const missing = LANGS.filter(l => !parsed[l]?.text);
      if (missing.length > 0) {
        throw new Error(`Fehlende Sprachen: ${missing.join(', ')}`);
      }

      console.log(`  ✓ ${saga.id} — alle ${LANGS.length} Sprachen`);
      return parsed;
    } catch (e) {
      attempts++;
      console.error(`  ✗ Versuch ${attempts}/3 fehlgeschlagen: ${e.message}`);
      if (attempts >= 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// Process sagas sequentially to avoid rate limits
const results = [];
for (const saga of targetSagas) {
  try {
    const newSummaries = await rewriteSaga(saga);
    results.push({ id: saga.id, summaries: newSummaries });
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    console.error(`  ✗✗ ${saga.id} übersprungen: ${e.message}`);
    results.push({ id: saga.id, summaries: null });
  }
}

// Write back to JSON
let updated = 0;
for (const result of results) {
  if (!result.summaries) continue;
  const idx = data.findIndex(s => s.id === result.id);
  if (idx === -1) continue;

  const saga = data[idx];
  // Update each language
  for (const lang of LANGS) {
    if (!saga.summaries) saga.summaries = {};
    if (!saga.summaries[lang]) saga.summaries[lang] = {};
    saga.summaries[lang].title = result.summaries[lang].title;
    saga.summaries[lang].text = result.summaries[lang].text;
    saga.summaries[lang].reviewEmpfohlen = false; // now source-based
  }
  // Also update the top-level summary (German)
  saga.summary = result.summaries.de.text;
  data[idx] = saga;
  updated++;
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`\n✅ Fertig: ${updated}/${targetSagas.length} Sagen aktualisiert → curatedSagasPakete.json`);
