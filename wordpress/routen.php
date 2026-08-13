<?php
/**
 * SagaTrail Routen — WPCode PHP Snippet
 * Typ:  PHP Snippet
 * Seite: sagatrail.ch/routen
 */

/* ── Kanton-Daten: API-Name, Kürzel, Wappen-SVG ── */
$str_kantone = [
  ['api' => 'Aargau',                 'code' => 'AG'],
  ['api' => 'Appenzell Ausserrhoden', 'code' => 'AR'],
  ['api' => 'Appenzell Innerrhoden',  'code' => 'AI'],
  ['api' => 'Basel-Landschaft',       'code' => 'BL'],
  ['api' => 'Basel-Stadt',            'code' => 'BS'],
  ['api' => 'Bern',                   'code' => 'BE'],
  ['api' => 'Freiburg',               'code' => 'FR'],
  ['api' => 'Genf',                   'code' => 'GE'],
  ['api' => 'Glarus',                 'code' => 'GL'],
  ['api' => 'Graubünden',             'code' => 'GR'],
  ['api' => 'Jura',                   'code' => 'JU'],
  ['api' => 'Luzern',                 'code' => 'LU'],
  ['api' => 'Neuenburg',              'code' => 'NE'],
  ['api' => 'Nidwalden',              'code' => 'NW'],
  ['api' => 'Obwalden',               'code' => 'OW'],
  ['api' => 'Schaffhausen',           'code' => 'SH'],
  ['api' => 'Schwyz',                 'code' => 'SZ'],
  ['api' => 'Solothurn',              'code' => 'SO'],
  ['api' => 'St. Gallen',             'code' => 'SG'],
  ['api' => 'Tessin',                 'code' => 'TI'],
  ['api' => 'Thurgau',                'code' => 'TG'],
  ['api' => 'Uri',                    'code' => 'UR'],
  ['api' => 'Waadt',                  'code' => 'VD'],
  ['api' => 'Wallis',                 'code' => 'VS'],
  ['api' => 'Zug',                    'code' => 'ZG'],
  ['api' => 'Zürich',                 'code' => 'ZH'],
];

$str_api = 'https://saga-trail.replit.app/api';

/* Wappen-SVGs (Quelle: nzzdev/ch-canton-symbols, CC BY-SA 4.0) */
$str_wappen = [
  'AG' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#333" d="M0 0h32v32H0z"/><path fill="#4997BE" d="M17 2h13v28H17z"/><path fill="#FFF" d="M2 20h13v3H2zM22 20h3v3h-3zM25 10h3v3h-3zM19 10h3v3h-3zM2 15h13v3H2zM2 10h13v3H2z"/></svg>',
  'AR' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#333" d="M0 0h32v32H0z"/><path d="M2 30V2h28v28H2z" fill="#FFF"/><path d="M22 28h-5v-3h3V20h-3l-3 3v5h-5v-3h3V20l3-3v-8H7v-3h8l-3-3h-3V2h3l5 5V2h3l3 3v20z" fill="#333"/><path d="M17 2v3h-3l3-3z" fill="#BF4A3A"/><path fill="#333" d="M25 15h3v10h-3zM5 15h3v10H5z"/></svg>',
  'AI' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#333" d="M0 0h32v32H0z"/><path d="M2 30V2h28v28H2z" fill="#FFF"/><path d="M22 28h-5v-3h3V20h-3l-3 3v5h-5v-3h3V20l3-3v-8H7v-3h8l-3-3h-3V2h3l5 5V2h3l3 3v20z" fill="#333"/><path d="M17 2v3h-3l3-3z" fill="#BF4A3A"/></svg>',
  'BL' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path fill="#FFF" d="M2 2h28v28H2z"/><path d="M7 12v15l3-3 3 3 3-3 3 3V12l3 3h3l3-3V10L23 5H15L7 12zm10-3h3v3h-3V9z" fill="#BF4A3A"/></svg>',
  'BS' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#333" d="M0 0h32v32H0z"/><path fill="#FFF" d="M2 2h28v28H2z"/><path d="M25 28l-3-3-3 3-3-3-3 3V12l-3 3H7l-3-3V10l5-5h5l8 8v15zM15 10h-3v3h3v-3z" fill="#333"/></svg>',
  'BE' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0v32h32V0z"/><path fill="#FFD800" d="M2 2v15l13 13h15V15L17 2z"/><path fill="#333" d="M5 5v5h5v5H5v3h8v5h3V18h3v8h3V23h5v5h3V18L17 7h-3V5z"/></svg>',
  'FR' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#333" d="M0 0h32v32H0z"/><path d="M2 30V15h28v15H2z" fill="#FFF"/></svg>',
  'GE' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path fill="#FFD800" d="M2 2h13v28H2z"/><path d="M22 20V2h-3v18h-3v10h8V20h-2zm3-8V10h-3V5h3V2h5v10h-5zm-3 5h3v5h-3v-5zm5-18h3v5h-3V2z" fill="#FFD800"/><path d="M15 5H10v3l3 3v3h-3V9L5 5v20l8-8v3l-5 5 3 3 3-3v3h3V5z" fill="#010202"/><path d="M10 5v3L7 5h3zM7 25l3 3H7v-3z" fill="#BF4A3A"/></svg>',
  'GL' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path fill="#FFD800" d="M5 2h3v28H5zM12 2h8v8h-8z"/><path d="M12 30h3v-3h5v3h3V17h3V12l-3-3h-5V5h-3v5H7v3h5v18z" fill="#333"/><path fill="#FFF" d="M15 7h3v3h-3z"/><path fill="#FFD800" d="M17 12h3v3h-3z"/></svg>',
  'GR' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#333" d="M0 0h32v32H0z"/><path d="M2 17H9V2h21v28H2V17z" fill="#FFF"/><path fill="#FFD800" d="M15 2h17v15H15z"/><path fill="#4997BE" d="M15 2h5v5h-5zM25 12h5v5h-5zM25 7V2h-3v6l-.02 1.2H22V10h3v-.02L29 10l.045-2.5L25 7zM22 10.06V10h-3v.02L15 10l-.045 2.5L19 13V17h3V11.3l.02-1.24H22z"/><path d="M5 22h3V20l3-3h8v3H13v3h15v5H3v-5h2zM2 22h3v3H2z" fill="#333"/></svg>',
  'JU' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path d="M17 22V17h13v-3H17V10h13V7H17V2H2v28h15v-5h13V22H17z" fill="#FFF"/><path d="M15 10v18l-3-3-3 3V10l-3 3-3-3V7l3-3h3l5 5zM10 7H7v3h3V7z" fill="#BF4A3A"/></svg>',
  'LU' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#4997BE" d="M0 0h32v32H0z"/><path d="M15 30V2h15v28H15z" fill="#FFF"/></svg>',
  'NE' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path fill="#00A84A" d="M2 2h8v28H2z"/><path fill="#FFF" d="M10 2h10v28H10zM27 5V2h-3v3h-3v3h3v3h3V8h3V5h-3z"/></svg>',
  'NW' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path d="M15 17V15h3v3h10v10H20v3H12v-3H5V17h10zm3-8h8V7H20V5h5V2H7v3h5v3H7v3h8v5h3V9zM7 20v5h8v3h3v-3h8v-5H7z" fill="#FFF"/></svg>',
  'OW' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path d="M2 15v15h28V15H17V2H7v3h5v3H7v3h8v5H2z" fill="#FFF"/><path d="M7 17h8V15h3v3h8v8H20v3H12v-3H7V17zm3 3v3h5v3h3V23h5V20H10z" fill="#BF4A3A"/></svg>',
  'SH' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#FFD800" d="M0 0h32v32H0z"/><path d="M12 25l3-3V20l-3-3H7l-3 3V15h5V10L7 7h5v5l3-3V7h3V2h3v5h5v3h-3v3l-3 3 10 10-5 5V30h-5l-5 5v-5z" fill="#333"/><path d="M15 7v3h-3l3-3z" fill="#BF4A3A"/><path d="M22 17l3-3h3v3l-3 3h-3v-3z" fill="#333"/></svg>',
  'SZ' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path d="M27 5V2h-3v3h-3v3h3v3h3V8h3V5h-3z" fill="#FFF"/></svg>',
  'SO' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path d="M2 30V15h28v15H2z" fill="#FFF"/></svg>',
  'SG' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#00A84A" d="M0 0h32v32H0z"/><g fill="#FFF"><path d="M17 10h3v13h-3zM15 25h3v5h-3zM12 2h3l3 3-3 3h-3V2zM12 10h3v13h-3z"/></g></svg>',
  'TI' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#4997BE" d="M0 0h32v32H0z"/><path fill="#BF4A3A" d="M2 2h15v28H2z"/></svg>',
  'TG' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#00A84A" d="M0 0h32v32H0z"/><path d="M2 2l28 28V2H2z" fill="#FFF"/><path d="M15 22H10l3-3-3-3H7V15l-3-3v10h3v3H7v3h8v-3h3v3h5l-8-8zM17 10h5l-2 3 3 3h3v3l3 3V10h-3V7h3V5H20v3h-3V5H12l5 5z" fill="#FFD800"/></svg>',
  'UR' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#FFD800" d="M0 0h32v32H0z"/><path d="M25 15h-3v10l-3 3H13l-3-3V15H7l-3-3 5-5V2l5 5h3l5-5v5l5 5-3 3z" fill="#333"/><path d="M12 12l3 3h-3v-3zM20 12v3h-3l3-3z" fill="#FFF"/><path d="M15 28v-3h-3v3l3 3h3l3-3v-3h-3v3h-3z" fill="#BF4A3A"/></svg>',
  'VD' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#00A84A" d="M0 0h32v32H0z"/><path fill="#FFF" d="M2 2h28v18H2z"/><path fill="#FFD800" d="M5 5h22v3H5zM12 10h8v3h-8zM7 15h18v3H7z"/></svg>',
  'VS' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#BF4A3A" d="M0 0h32v32H0z"/><path d="M15 22V20h3V17h-3V15h3V12h-3V10h3V7h-3V2H2v28h13v-5h3V22h-3zm0-20h3v3h-3V2zm0 25h3v3h-3v-3zM7 22h3v3H7v-3zm0-5h3v3H7v-3zm0-5h3v3H7v-3zm0-5h3v3H7V7zm15 15h3v3h-3v-3zm0-5h3v3h-3v-3zm0-5h3v3h-3v-3zm0-5h3v3h-3V7z" fill="#FFF"/></svg>',
  'ZG' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#4997BE" d="M0 0h32v32H0z"/><path d="M2 10V2h28v8H2zm0 20V22h28v8H2z" fill="#FFF"/></svg>',
  'ZH' => '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path fill="#4997BE" d="M0 0h32v32H0z"/><path d="M2 2h28v28L2 2z" fill="#FFF"/></svg>',
];
?>

<!-- ============================================================
     SAGATRAIL ROUTEN  |  WPCode PHP Snippet
     Seite: sagatrail.ch/routen
     ============================================================ -->
<style>
/* ── Reset ── */
.str-wrap *, .str-wrap *::before, .str-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
.str-wrap {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
}
/* ── Full-width ── */
.str-fw { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }
.str-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

/* ── Hero ── */
.str-hero { background: #CC0000; padding: 64px 0 52px; color: #fff; }
.str-hero-badge {
  display: inline-block;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px; padding: 5px 16px;
  font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase;
  margin-bottom: 18px; color: #fff;
}
.str-hero h1 {
  font-size: clamp(1.9rem, 5vw, 3rem); font-weight: 800; line-height: 1.1;
  margin-bottom: 14px; color: #fff;
}
.str-hero p { font-size: 1.05rem; max-width: 560px; opacity: 0.9; color: #fff; }
.str-hero-stats {
  display: flex; gap: 36px; flex-wrap: wrap;
  margin-top: 32px; padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.2);
}
.str-hero-stat strong { display: block; font-size: 1.8rem; font-weight: 800; color: #fff; line-height: 1; }
.str-hero-stat span   { font-size: 0.8rem; opacity: 0.75; color: #fff; }

/* ── Kanton-Grid ── */
.str-kanton-section { padding: 48px 0 36px; background: #f7f7f5; }
.str-section-label {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #CC0000; margin-bottom: 8px;
}
.str-section-title { font-size: clamp(1.3rem, 2.5vw, 1.9rem); font-weight: 800; margin-bottom: 24px; }
.str-kanton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.str-kanton-card {
  background: #fff; border: 1.5px solid #e8e8e6; border-radius: 12px;
  padding: 12px 8px 10px; text-align: center; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  user-select: none;
}
.str-kanton-card:hover { border-color: #CC0000; box-shadow: 0 4px 14px rgba(204,0,0,0.12); transform: translateY(-2px); }
.str-kanton-card.str-active { border-color: #CC0000; background: #CC0000; }
.str-kanton-wappen {
  width: 36px; height: 36px; margin: 0 auto 6px;
  display: flex; align-items: center; justify-content: center;
}
.str-kanton-wappen svg { width: 36px; height: 36px; border-radius: 4px; }
.str-kanton-code { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; color: #1a1a1a; }
.str-kanton-name { font-size: 0.65rem; color: #777; line-height: 1.25; margin-top: 2px; }
.str-kanton-card.str-active .str-kanton-code,
.str-kanton-card.str-active .str-kanton-name { color: #fff; }

/* ── Filter-Bereich ── */
.str-filter-section { background: #f7f7f5; padding-bottom: 8px; display: none; }
.str-filter-section.str-visible { display: block; }
.str-filter-card {
  background: #fff; border: 1.5px solid #e8e8e6; border-radius: 16px;
  padding: 20px 20px 8px; margin-bottom: 16px;
}
.str-filter-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px; padding-bottom: 14px;
  border-bottom: 1px solid #f0f0ee;
}
.str-filter-icon {
  width: 34px; height: 34px; background: #CC0000; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.str-filter-icon svg { width: 18px; height: 18px; }
.str-filter-title { font-size: 1rem; font-weight: 700; color: #1a1a1a; }

/* ── Slider ── */
.str-filter-row { margin-bottom: 18px; }
.str-filter-row-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.str-filter-row-label { font-size: 0.9rem; font-weight: 600; color: #1a1a1a; }
.str-filter-row-val { font-size: 0.82rem; font-weight: 600; color: #CC0000; }
.str-dual-range {
  position: relative; height: 32px; display: flex; align-items: center;
}
.str-range-track {
  position: absolute; left: 0; right: 0; height: 4px;
  background: #e0e0e0; border-radius: 2px; pointer-events: none;
}
.str-range-fill {
  position: absolute; height: 4px; background: #CC0000; border-radius: 2px;
}
.str-range-input {
  position: absolute; width: 100%; height: 0;
  appearance: none; -webkit-appearance: none;
  background: transparent; pointer-events: none;
  outline: none;
}
.str-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23CC0000'/%3E%3Crect x='16.5' y='8' width='7' height='24' rx='1.5' fill='white'/%3E%3Crect x='8' y='16.5' width='24' height='7' rx='1.5' fill='white'/%3E%3C/svg%3E") center/cover no-repeat;
  cursor: pointer; pointer-events: auto;
  box-shadow: 0 2px 8px rgba(204,0,0,0.35);
  transition: transform 0.1s;
}
.str-range-input::-webkit-slider-thumb:hover { transform: scale(1.1); }
.str-range-input::-moz-range-thumb {
  width: 30px; height: 30px; border: none; border-radius: 50%;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23CC0000'/%3E%3Crect x='16.5' y='8' width='7' height='24' rx='1.5' fill='white'/%3E%3Crect x='8' y='16.5' width='24' height='7' rx='1.5' fill='white'/%3E%3C/svg%3E") center/cover no-repeat;
  cursor: pointer; pointer-events: auto;
  box-shadow: 0 2px 8px rgba(204,0,0,0.35);
}

/* ── Toggle ── */
.str-toggle-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-top: 1px solid #f0f0ee;
}
.str-toggle-label { font-size: 0.9rem; font-weight: 500; color: #1a1a1a; }
.str-toggle {
  position: relative; width: 48px; height: 28px;
  background: #ddd; border-radius: 14px; cursor: pointer;
  transition: background 0.2s; flex-shrink: 0;
}
.str-toggle.str-on { background: #CC0000; }
.str-toggle::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 22px; height: 22px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}
.str-toggle.str-on::after { transform: translateX(20px); }

/* ── Suchen-Button ── */
.str-search-btn {
  width: 100%; padding: 16px; background: #CC0000; color: #fff; border: none;
  border-radius: 12px; font-size: 0.85rem; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
  margin: 8px 0 20px; transition: opacity 0.15s, transform 0.1s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.str-search-btn:hover { opacity: 0.88; transform: translateY(-1px); }
.str-search-btn:active { transform: translateY(0); }
.str-route-count-hint { font-size: 0.82rem; color: #888; margin-top: 4px; }

/* ── Routen-Ergebnisse ── */
.str-results-section { padding: 8px 0 64px; background: #f7f7f5; }
.str-results-header {
  display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px;
}
.str-results-title { font-size: 1.3rem; font-weight: 800; color: #1a1a1a; }
.str-results-badge {
  background: #CC0000; color: #fff;
  border-radius: 20px; padding: 2px 10px;
  font-size: 0.78rem; font-weight: 700;
}
.str-route-list { display: flex; flex-direction: column; gap: 10px; }
.str-route-card {
  background: #fff; border: 1.5px solid #e8e8e6; border-radius: 14px;
  overflow: hidden; display: flex;
  transition: box-shadow 0.15s, transform 0.12s;
}
.str-route-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.08); transform: translateY(-1px); }
.str-route-photo {
  width: 110px; min-width: 110px; background: #eee; overflow: hidden; flex-shrink: 0;
}
.str-route-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.str-route-photo-ph {
  width: 100%; height: 100%; min-height: 90px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,#f2f2f0,#e6e6e4); font-size: 1.8rem;
}
.str-route-body { padding: 14px 16px; flex: 1; min-width: 0; }
.str-route-name { font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 7px; line-height: 1.3; }
.str-route-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; align-items: center; }
.str-tag {
  display: inline-flex; align-items: center; gap: 3px;
  border-radius: 6px; padding: 2px 7px;
  font-size: 0.72rem; font-weight: 600; white-space: nowrap;
}
.str-tag-dist { background: #f0f0f0; color: #444; }
.str-tag-asc  { background: #eef3fb; color: #2563eb; }
.str-tag-time { background: #f0fdf4; color: #16a34a; }
.str-tag-T1   { background: #dcfce7; color: #15803d; }
.str-tag-T2   { background: #d1fae5; color: #059669; }
.str-tag-T3   { background: #fff7ed; color: #ea580c; }
.str-tag-T4   { background: #fee2e2; color: #dc2626; }
.str-tag-T5   { background: #fef2f2; color: #991b1b; }
.str-tag-T6   { background: #1a1a1a; color: #fff; }
.str-route-desc {
  font-size: 0.82rem; color: #666; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.str-app-link {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.78rem; font-weight: 600; color: #CC0000; margin-top: 10px;
}
/* ── Spinner & Empty ── */
.str-spinner { text-align: center; padding: 60px 20px; }
.str-spinner-ring {
  display: inline-block; width: 40px; height: 40px;
  border: 3px solid #e8e8e6; border-top-color: #CC0000;
  border-radius: 50%; animation: str-spin 0.7s linear infinite;
}
@keyframes str-spin { to { transform: rotate(360deg); } }
.str-empty { text-align: center; padding: 50px 20px; }
.str-empty-icon { font-size: 2.8rem; margin-bottom: 14px; }
.str-empty h3 { font-size: 1rem; font-weight: 700; margin-bottom: 6px; color: #444; }
.str-empty p  { font-size: 0.85rem; color: #888; }

/* ── App-CTA ── */
.str-cta { background: #1a1a1a; padding: 52px 0; }
.str-cta h2 { font-size: clamp(1.3rem, 2.5vw, 1.9rem); font-weight: 800; color: #fff; margin-bottom: 10px; }
.str-cta p  { color: rgba(255,255,255,0.65); margin-bottom: 24px; }
.str-cta-btns { display: flex; gap: 12px; flex-wrap: wrap; }
.str-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border-radius: 10px;
  font-weight: 700; font-size: 0.88rem;
  background: #CC0000; color: #fff; transition: opacity 0.15s;
}
.str-cta-btn:hover { opacity: 0.85; }
.str-cta-btn-out { background: transparent; border: 1.5px solid rgba(255,255,255,0.28); }

@media (max-width: 560px) {
  .str-route-photo { width: 88px; min-width: 88px; }
  .str-route-body  { padding: 11px 12px; }
  .str-kanton-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px; }
}
</style>

<div class="str-wrap" id="str-root">

  <!-- HERO -->
  <div class="str-fw str-hero">
    <div class="str-inner">
      <span class="str-hero-badge">🇨🇭 Schweizer Wanderrouten</span>
      <h1>Sagenrouten in allen 26 Kantonen</h1>
      <p>GPS-geführte Wanderungen auf den Spuren alter Schweizer Sagen — kostenlos in der SagaTrail-App.</p>
      <div class="str-hero-stats">
        <div class="str-hero-stat"><strong>200+</strong><span>Wanderrouten</span></div>
        <div class="str-hero-stat"><strong>26</strong><span>Kantone</span></div>
        <div class="str-hero-stat"><strong>T1–T6</strong><span>Schwierigkeit</span></div>
      </div>
    </div>
  </div>

  <!-- KANTONSAUSWAHL -->
  <div class="str-fw str-kanton-section" id="str-kanton-section">
    <div class="str-inner">
      <div class="str-section-label">Schritt 1 · Kanton wählen</div>
      <h2 class="str-section-title">Wo möchtest du wandern?</h2>
      <div class="str-kanton-grid" id="str-kanton-grid">
        <?php foreach ($str_kantone as $k): ?>
        <div class="str-kanton-card"
             data-api="<?php echo esc_attr($k['api']); ?>"
             data-code="<?php echo esc_attr($k['code']); ?>"
             onclick="strSelectKanton('<?php echo esc_js($k['api']); ?>', '<?php echo esc_js($k['code']); ?>')">
          <div class="str-kanton-wappen">
            <?php echo isset($str_wappen[$k['code']]) ? $str_wappen[$k['code']] : ''; ?>
          </div>
          <div class="str-kanton-code"><?php echo esc_html($k['code']); ?></div>
          <div class="str-kanton-name"><?php echo esc_html($k['api']); ?></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <!-- FILTER -->
  <div class="str-fw str-filter-section" id="str-filter-section">
    <div class="str-inner">
      <div class="str-section-label">Schritt 2 · Filter &amp; Suche</div>
      <h2 class="str-section-title" id="str-filter-title">Graubünden</h2>
      <p style="font-size:0.88rem;color:#666;margin-bottom:20px;margin-top:-8px;">
        Lege Distanz, Höhenmeter und Schwierigkeit fest. Die App durchsucht dann eine externe Wanderdatenbank (OpenStreetMap, angereichert mit swisstopo-Höhenmetern) nach passenden Routen.
      </p>

      <div class="str-filter-card">
        <div class="str-filter-header">
          <div class="str-filter-icon">
            <svg fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          </div>
          <span class="str-filter-title">Filter</span>
        </div>

        <!-- Distanz -->
        <div class="str-filter-row">
          <div class="str-filter-row-head">
            <span class="str-filter-row-label">Distanz</span>
            <span class="str-filter-row-val" id="str-dist-val">0 km – 50+ km</span>
          </div>
          <div class="str-dual-range">
            <div class="str-range-track"><div class="str-range-fill" id="str-dist-fill"></div></div>
            <input type="range" class="str-range-input" id="str-dist-lo" min="0" max="50" value="0" step="1">
            <input type="range" class="str-range-input" id="str-dist-hi" min="0" max="50" value="50" step="1">
          </div>
        </div>

        <!-- Höhenmeter -->
        <div class="str-filter-row">
          <div class="str-filter-row-head">
            <span class="str-filter-row-label">Höhenmeter</span>
            <span class="str-filter-row-val" id="str-asc-val">0 hm – 3000+ hm</span>
          </div>
          <div class="str-dual-range">
            <div class="str-range-track"><div class="str-range-fill" id="str-asc-fill"></div></div>
            <input type="range" class="str-range-input" id="str-asc-lo" min="0" max="3000" value="0" step="50">
            <input type="range" class="str-range-input" id="str-asc-hi" min="0" max="3000" value="3000" step="50">
          </div>
        </div>

        <!-- Schwierigkeit -->
        <div class="str-filter-row" style="margin-bottom:4px;">
          <div class="str-filter-row-head">
            <span class="str-filter-row-label">Schwierigkeit</span>
            <span class="str-filter-row-val" id="str-sac-val">T1 – T6</span>
          </div>
          <div class="str-dual-range">
            <div class="str-range-track"><div class="str-range-fill" id="str-sac-fill"></div></div>
            <input type="range" class="str-range-input" id="str-sac-lo" min="1" max="6" value="1" step="1">
            <input type="range" class="str-range-input" id="str-sac-hi" min="1" max="6" value="6" step="1">
          </div>
        </div>

        <!-- Toggles -->
        <div class="str-toggle-row">
          <span class="str-toggle-label">Nur ganzjährige Routen</span>
          <div class="str-toggle" id="str-toggle-gj" onclick="strToggle('gj')"></div>
        </div>
      </div>

      <button class="str-search-btn" onclick="strSearch()">
        <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Passende Routen suchen
      </button>
      <p class="str-route-count-hint" id="str-hint"></p>
    </div>
  </div>

  <!-- ROUTEN-ERGEBNISSE -->
  <div class="str-fw str-results-section" id="str-results-section" style="display:none;">
    <div class="str-inner">
      <div class="str-results-header">
        <h2 class="str-results-title" id="str-results-title">Routen</h2>
        <span class="str-results-badge" id="str-results-badge" style="display:none;"></span>
      </div>
      <div id="str-route-list"></div>
    </div>
  </div>

  <!-- APP CTA -->
  <div class="str-fw str-cta">
    <div class="str-inner">
      <h2>Starte deine Sagenwanderung</h2>
      <p>GPS-Navigation, Audio-Erzählungen und historische Sagen — kostenlos in der App.</p>
      <div class="str-cta-btns">
        <a href="https://apps.apple.com/app/id6744444594" class="str-cta-btn" target="_blank" rel="noopener">🍎 &nbsp;App Store</a>
        <a href="https://play.google.com/store/apps/details?id=com.inster.sagatrail" class="str-cta-btn str-cta-btn-out" target="_blank" rel="noopener">▶ &nbsp;Google Play</a>
      </div>
    </div>
  </div>

</div><!-- .str-wrap -->

<script>
(function(){
  var API = '<?php echo esc_js($str_api); ?>';

  /* ── State ── */
  var S = {
    kanton: null,
    kantonName: null,
    allRoutes: [],
    distLo: 0,  distHi: 50,
    ascLo: 0,   ascHi: 3000,
    sacLo: 1,   sacHi: 6,
    gj: false,
  };

  /* ── Dual-Range-Slider-Setup ── */
  function makeDual(idLo, idHi, fillId, onChange) {
    var lo = document.getElementById(idLo);
    var hi = document.getElementById(idHi);
    var fill = document.getElementById(fillId);
    function update() {
      var min = parseFloat(lo.min), max = parseFloat(lo.max);
      var vLo = parseFloat(lo.value), vHi = parseFloat(hi.value);
      if (vLo > vHi) { /* Kreuzung verhindern */
        if (this === lo) { lo.value = vHi; vLo = vHi; }
        else             { hi.value = vLo; vHi = vLo; }
      }
      var pLo = (vLo - min) / (max - min) * 100;
      var pHi = (vHi - min) / (max - min) * 100;
      fill.style.left  = pLo + '%';
      fill.style.width = (pHi - pLo) + '%';
      onChange(vLo, vHi);
    }
    lo.addEventListener('input', update);
    hi.addEventListener('input', update);
    update.call(lo);
  }

  /* ── Slider-Label-Formatierung ── */
  function fmtDist(lo, hi) {
    var hStr = (hi >= 50) ? '50+ km' : hi + ' km';
    return lo + ' km – ' + hStr;
  }
  function fmtAsc(lo, hi) {
    var hStr = (hi >= 3000) ? '3000+ hm' : hi + ' hm';
    return lo + ' hm – ' + hStr;
  }
  function fmtSac(lo, hi) {
    return 'T' + lo + ' – T' + hi;
  }

  makeDual('str-dist-lo','str-dist-hi','str-dist-fill', function(lo,hi){
    S.distLo = lo; S.distHi = hi;
    document.getElementById('str-dist-val').textContent = fmtDist(lo, hi);
  });
  makeDual('str-asc-lo','str-asc-hi','str-asc-fill', function(lo,hi){
    S.ascLo = lo; S.ascHi = hi;
    document.getElementById('str-asc-val').textContent = fmtAsc(lo, hi);
  });
  makeDual('str-sac-lo','str-sac-hi','str-sac-fill', function(lo,hi){
    S.sacLo = lo; S.sacHi = hi;
    document.getElementById('str-sac-val').textContent = fmtSac(lo, hi);
  });

  /* ── Toggle ── */
  window.strToggle = function(key) {
    if (key === 'gj') {
      S.gj = !S.gj;
      document.getElementById('str-toggle-gj').classList.toggle('str-on', S.gj);
    }
  };

  /* ── Kanton wählen ── */
  window.strSelectKanton = function(apiName, code) {
    document.querySelectorAll('.str-kanton-card').forEach(function(el) {
      el.classList.toggle('str-active', el.dataset.api === apiName);
    });
    S.kanton = apiName;
    S.kantonName = apiName;
    document.getElementById('str-filter-title').textContent = apiName;
    document.getElementById('str-filter-section').classList.add('str-visible');
    document.getElementById('str-results-section').style.display = 'none';
    document.getElementById('str-hint').textContent = '';
    /* Zum Filter-Bereich scrollen */
    setTimeout(function(){
      document.getElementById('str-filter-section').scrollIntoView({ behavior:'smooth', block:'start' });
    }, 80);
    /* Routen vorladen (für schnelle Suche) */
    preloadRoutes(apiName);
  };

  /* ── Vorladen ── */
  function preloadRoutes(kanton) {
    if (S.allRoutes.length && S._loadedKanton === kanton) return;
    S._loadedKanton = kanton;
    S.allRoutes = [];
    try {
      var cached = sessionStorage.getItem('str_' + kanton);
      if (cached) { S.allRoutes = JSON.parse(cached); updateHint(); return; }
    } catch(e) {}
    fetch(API + '/cantons/' + encodeURIComponent(kanton) + '/routes')
      .then(function(r){ return r.json(); })
      .then(function(d){ S.allRoutes = Array.isArray(d) ? d : []; try { sessionStorage.setItem('str_' + kanton, JSON.stringify(S.allRoutes)); } catch(e){} updateHint(); })
      .catch(function(){ S.allRoutes = []; });
  }

  function updateHint() {
    var n = applyFilter().length;
    document.getElementById('str-hint').textContent = n + ' Routen gefunden. Danach folgt die passende Sage.';
  }

  /* ── Filter anwenden ── */
  function sacNum(sac) { if (!sac) return 0; var m=/T\s*([1-6])/i.exec(sac); return m ? parseInt(m[1]):0; }
  function applyFilter() {
    return S.allRoutes.filter(function(r) {
      var km  = parseFloat(r.distanceTagKm || r.distanceKm || 0);
      var hm  = parseInt(r.ascentM || 0, 10);
      var sac = sacNum(r.sac);
      if (km  < S.distLo || (S.distHi < 50 && km > S.distHi)) return false;
      if (hm  < S.ascLo  || (S.ascHi < 3000 && hm > S.ascHi)) return false;
      if (sac && (sac < S.sacLo || sac > S.sacHi)) return false;
      if (S.gj && r.season !== 'ganzjaehrig') return false;
      return true;
    });
  }

  /* ── Suchen ── */
  window.strSearch = function() {
    if (!S.kanton) return;
    var sec = document.getElementById('str-results-section');
    var list = document.getElementById('str-route-list');
    sec.style.display = '';
    document.getElementById('str-results-title').textContent = S.kantonName;
    sec.scrollIntoView({ behavior:'smooth', block:'start' });

    if (!S.allRoutes.length) {
      list.innerHTML = '<div class="str-spinner"><div class="str-spinner-ring"></div></div>';
      var interval = setInterval(function(){
        if (S.allRoutes.length || S._loadFailed) { clearInterval(interval); renderResults(); }
      }, 200);
      return;
    }
    renderResults();
  };

  /* ── Rendern ── */
  function esc(s){ return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
  function fmtKm(km){ return km ? parseFloat(km).toFixed(1)+' km' : null; }
  function fmtHm(m) { return m ? '+'+Math.round(m)+' hm' : null; }
  function fmtMin(m){ if(!m)return null; if(m<60)return m+' Min.'; return Math.floor(m/60)+':'+(m%60<10?'0':'')+(m%60)+' h'; }
  function sacClass(sac){ var n=sacNum(sac); return 'str-tag-T'+Math.min(6,Math.max(1,n||1)); }

  function renderResults() {
    var visible = applyFilter();
    var badge = document.getElementById('str-results-badge');
    var list  = document.getElementById('str-route-list');
    badge.textContent = visible.length + ' Route' + (visible.length!==1?'n':'');
    badge.style.display = '';

    /* Schema.org JSON-LD */
    var old = document.getElementById('str-schema');
    if (old) old.remove();
    var sc = document.createElement('script');
    sc.id='str-schema'; sc.type='application/ld+json';
    sc.textContent = JSON.stringify({
      '@context':'https://schema.org','@type':'ItemList',
      'name':'Wanderrouten '+S.kantonName,
      'description':'GPS-geführte Sagenrouten in '+S.kantonName,
      'numberOfItems':visible.length,
      'itemListElement': visible.slice(0,50).map(function(r,i){
        return {'@type':'TouristAttraction','position':i+1,'name':r.name,
          'description':r.description?r.description.replace(/<[^>]*>/g,'').substring(0,160):undefined,
          'geo':r.coordinates?{'@type':'GeoCoordinates','latitude':r.coordinates.lat,'longitude':r.coordinates.lng}:undefined};
      })
    });
    document.head.appendChild(sc);

    if (!visible.length) {
      list.innerHTML = '<div class="str-empty"><div class="str-empty-icon">🏔️</div><h3>Keine Routen für diesen Filter</h3><p>Passe Distanz, Höhenmeter oder Schwierigkeit an.</p></div>';
      return;
    }
    list.innerHTML = visible.map(function(r){
      var sac  = r.sac && r.sac!=='unbekannt' ? r.sac : null;
      var desc = r.description ? r.description.replace(/<[^>]*>/g,'').substring(0,160) : '';
      var photo = r.photoUrl
        ? '<img src="'+esc(r.photoUrl)+'" alt="'+esc(r.name)+'" loading="lazy">'
        : '<div class="str-route-photo-ph">🏔️</div>';
      var tags = '<span class="str-tag str-tag-dist">📍 '+(esc(fmtKm(r.distanceTagKm||r.distanceKm))||'—')+'</span>';
      var hm = fmtHm(r.ascentM); if(hm) tags+='<span class="str-tag str-tag-asc">↑ '+esc(hm)+'</span>';
      var tm = fmtMin(r.minutes); if(tm) tags+='<span class="str-tag str-tag-time">⏱ '+esc(tm)+'</span>';
      if(sac) tags+='<span class="str-tag '+sacClass(r.sac)+'">'+esc(sac)+'</span>';
      return '<div class="str-route-card" itemscope itemtype="https://schema.org/TouristAttraction">'
        +'<div class="str-route-photo">'+photo+'</div>'
        +'<div class="str-route-body">'
        +'<h3 class="str-route-name" itemprop="name">'+esc(r.name)+'</h3>'
        +'<div class="str-route-meta">'+tags+'</div>'
        +(desc?'<p class="str-route-desc" itemprop="description">'+esc(desc)+'…</p>':'')
        +'<a class="str-app-link" href="https://apps.apple.com/app/id6744444594" target="_blank" rel="noopener">→ In der SagaTrail-App öffnen</a>'
        +'</div></div>';
    }).join('');
  }
})();
</script>
