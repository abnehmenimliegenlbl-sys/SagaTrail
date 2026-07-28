// Setzt den Werbetext (promotionalText) in App Store Connect für alle
// bearbeitbaren UND die Live-Version — Werbetext ist ohne Review änderbar.
// Texte liegen in artifacts/mobile/store/werbetexte.json.
// Aufruf: ASC_API_KEY_ISSUER_ID=... node scripts/asc_werbetext.cjs
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const APP_ID = "6788260668";
const KEY_ID = "P4743KUS27";
const KEY_PATH = path.resolve(__dirname, "../artifacts/mobile/AuthKey_submit.p8");
const TEXTE_PATH = path.resolve(__dirname, "../artifacts/mobile/store/werbetexte.json");
const ISSUER = process.env.ASC_API_KEY_ISSUER_ID;
if (!ISSUER) { console.error("ASC_API_KEY_ISSUER_ID fehlt"); process.exit(1); }

function jwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = b64({ alg: "ES256", kid: KEY_ID, typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64({ iss: ISSUER, iat: now, exp: now + 600, aud: "appstoreconnect-v1" });
  const sig = crypto
    .sign("sha256", Buffer.from(`${header}.${payload}`), {
      key: fs.readFileSync(KEY_PATH, "utf8"),
      dsaEncoding: "ieee-p1363",
    })
    .toString("base64url");
  return `${header}.${payload}.${sig}`;
}

async function api(method, url, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${jwt()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

(async () => {
  const texte = JSON.parse(fs.readFileSync(TEXTE_PATH, "utf8"));
  const versionen = await api(
    "GET",
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5&fields[appStoreVersions]=versionString,appStoreState`
  );
  for (const v of versionen.data) {
    const state = v.attributes.appStoreState;
    // Werbetext ist in fast allen Zuständen änderbar; abgelehnte/ersetzte auslassen
    if (["REPLACED_WITH_NEW_VERSION", "REMOVED_FROM_SALE", "REJECTED"].includes(state)) continue;
    const loks = await api(
      "GET",
      `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?limit=20`
    );
    for (const lok of loks.data) {
      const locale = lok.attributes.locale; // z.B. "de-DE", "en-US"
      const neu = texte[locale];
      if (!neu) continue;
      if (lok.attributes.promotionalText === neu) {
        console.log(`${v.attributes.versionString} [${state}] ${locale}: unverändert`);
        continue;
      }
      await api("PATCH", `/v1/appStoreVersionLocalizations/${lok.id}`, {
        data: {
          type: "appStoreVersionLocalizations",
          id: lok.id,
          attributes: { promotionalText: neu },
        },
      });
      console.log(`${v.attributes.versionString} [${state}] ${locale}: Werbetext gesetzt ✔`);
    }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
