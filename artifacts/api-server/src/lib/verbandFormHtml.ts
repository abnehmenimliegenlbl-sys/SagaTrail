/**
 * HTML-Snippet für sagatrail.ch/tourismusverband (WPCode).
 * Ersetzt den «Gespräch anfragen»-Button durch ein vollständiges Kontaktformular.
 * Das Snippet ist eigenständig – kein WordPress-JS oder externe Deps nötig.
 */
export const VERBAND_FORM_SNIPPET = `
<!-- SagaTrail Tourismusverband-Formular – WPCode Snippet -->
<style>
.st-vf-wrap{max-width:640px;margin:0 auto;padding:0 4px}
.st-vf-form{display:flex;flex-direction:column;gap:20px;text-align:left}
.st-vf-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:520px){.st-vf-row{grid-template-columns:1fr}}
.st-vf-group{display:flex;flex-direction:column;gap:6px}
.st-vf-label{font-size:13px;font-weight:600;color:#1a1a1a}
.st-vf-req{color:#CC0000;margin-left:2px}
.st-vf-input{
  padding:11px 14px;border:1.5px solid #ddd;border-radius:8px;
  font-size:15px;font-family:inherit;background:#fff;color:#1a1a1a;
  transition:border-color .15s;outline:none;width:100%;box-sizing:border-box;
}
.st-vf-input:focus{border-color:#CC0000;box-shadow:0 0 0 3px rgba(204,0,0,.1)}
.st-vf-input::placeholder{color:#aaa}

/* Kantone Multi-Select */
.st-vf-kanton-wrap{border:1.5px solid #ddd;border-radius:8px;overflow:hidden;background:#fff}
.st-vf-kanton-wrap:focus-within{border-color:#CC0000;box-shadow:0 0 0 3px rgba(204,0,0,.1)}
.st-vf-kanton-all{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;background:#f9f8f6;border-bottom:1px solid #eee;
  cursor:pointer;font-size:14px;font-weight:600;color:#1a1a1a;
}
.st-vf-kanton-all input{width:17px;height:17px;accent-color:#CC0000;cursor:pointer}
.st-vf-kanton-grid{
  display:grid;grid-template-columns:repeat(3,1fr);
  padding:10px 14px;gap:6px 0;max-height:220px;overflow-y:auto;
}
@media(max-width:480px){.st-vf-kanton-grid{grid-template-columns:repeat(2,1fr)}}
.st-vf-kanton-item{display:flex;align-items:center;gap:7px;font-size:13px;color:#333;cursor:pointer;white-space:nowrap}
.st-vf-kanton-item input{width:15px;height:15px;accent-color:#CC0000;cursor:pointer;flex-shrink:0}

/* Hinweis */
.st-vf-hint{font-size:12px;color:#888;margin-top:2px}

/* Submit */
.st-vf-btn{
  width:100%;padding:15px;background:#CC0000;color:#fff;
  border:none;border-radius:10px;font-size:16px;font-weight:700;
  cursor:pointer;transition:opacity .15s,transform .1s;font-family:inherit;
}
.st-vf-btn:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
.st-vf-btn:disabled{opacity:.5;cursor:not-allowed}

/* States */
.st-vf-success{
  background:#f0faf4;border:1.5px solid #6dbf8a;border-radius:12px;
  padding:32px 24px;text-align:center;
}
.st-vf-success h3{color:#1a6e37;font-size:20px;margin-bottom:10px}
.st-vf-success p{color:#444;font-size:15px;line-height:1.6}
.st-vf-error-msg{
  background:#fff4f4;border:1px solid #f5b7b7;border-radius:8px;
  padding:10px 14px;color:#a80000;font-size:13px;margin-top:4px;display:none
}
</style>

<div class="st-vf-wrap" id="st-vf-root">
  <form class="st-vf-form" id="st-vf-form" novalidate>

    <!-- Verbandsname -->
    <div class="st-vf-group">
      <label class="st-vf-label" for="vf-name">Name des Verbands <span class="st-vf-req">*</span></label>
      <input class="st-vf-input" id="vf-name" type="text"
             placeholder="z.B. Graubünden Ferien" required maxlength="200">
    </div>

    <!-- E-Mail -->
    <div class="st-vf-group">
      <label class="st-vf-label" for="vf-email">E-Mail-Adresse <span class="st-vf-req">*</span></label>
      <input class="st-vf-input" id="vf-email" type="email"
             placeholder="info@verband.ch" required maxlength="200">
      <span class="st-vf-hint">Diese Adresse wird später für den Verbands-Login verwendet.</span>
    </div>

    <!-- Ansprechpartner -->
    <div class="st-vf-row">
      <div class="st-vf-group">
        <label class="st-vf-label" for="vf-kontakt-name">Name Ansprechpartner <span class="st-vf-req">*</span></label>
        <input class="st-vf-input" id="vf-kontakt-name" type="text"
               placeholder="Vorname Nachname" required maxlength="200">
      </div>
      <div class="st-vf-group">
        <label class="st-vf-label" for="vf-kontakt-tel">Telefon</label>
        <input class="st-vf-input" id="vf-kontakt-tel" type="tel"
               placeholder="+41 79 000 00 00" maxlength="50">
      </div>
    </div>

    <!-- Kantone -->
    <div class="st-vf-group">
      <label class="st-vf-label">Zuständige Kantone <span class="st-vf-req">*</span></label>
      <div class="st-vf-kanton-wrap">
        <label class="st-vf-kanton-all">
          <input type="checkbox" id="vf-alle" onchange="stVfAlleToggle(this)">
          Alle 26 Kantone auswählen
        </label>
        <div class="st-vf-kanton-grid" id="vf-kanton-grid"></div>
      </div>
      <span class="st-vf-hint">Mehrfachauswahl möglich.</span>
    </div>

    <div class="st-vf-error-msg" id="vf-error"></div>

    <button type="submit" class="st-vf-btn" id="vf-submit">
      Pilotpartnerschaft anfragen &amp; Vertrag erhalten
    </button>

  </form>
</div>

<script>
(function(){
  var KANTONE = [
    'Aargau','Appenzell Ausserrhoden','Appenzell Innerrhoden',
    'Basel-Landschaft','Basel-Stadt','Bern','Freiburg','Genf',
    'Glarus','Graubünden','Jura','Luzern','Neuenburg','Nidwalden',
    'Obwalden','Schaffhausen','Schwyz','Solothurn','St. Gallen',
    'Tessin','Thurgau','Uri','Waadt','Wallis','Zug','Zürich'
  ];
  var API = 'https://api.sagatrail.ch/api/verband/anfrage';

  // Kanton-Checkboxen aufbauen
  var grid = document.getElementById('vf-kanton-grid');
  KANTONE.forEach(function(k){
    var lbl = document.createElement('label');
    lbl.className = 'st-vf-kanton-item';
    var cb = document.createElement('input');
    cb.type = 'checkbox'; cb.name = 'kanton'; cb.value = k;
    cb.onchange = function(){ syncAlleCheckbox(); };
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(k));
    grid.appendChild(lbl);
  });

  function syncAlleCheckbox(){
    var cbs = document.querySelectorAll('#vf-kanton-grid input[type=checkbox]');
    var all = Array.from(cbs).every(function(c){ return c.checked; });
    document.getElementById('vf-alle').checked = all;
  }

  window.stVfAlleToggle = function(cb){
    document.querySelectorAll('#vf-kanton-grid input[type=checkbox]')
      .forEach(function(c){ c.checked = cb.checked; });
  };

  function showError(msg){
    var el = document.getElementById('vf-error');
    el.style.display = 'block';
    el.textContent = msg;
  }
  function hideError(){
    document.getElementById('vf-error').style.display = 'none';
  }

  document.getElementById('st-vf-form').addEventListener('submit', async function(e){
    e.preventDefault();
    hideError();

    var name      = document.getElementById('vf-name').value.trim();
    var email     = document.getElementById('vf-email').value.trim();
    var kontakt   = document.getElementById('vf-kontakt-name').value.trim();
    var telefon   = document.getElementById('vf-kontakt-tel').value.trim();
    var alleBox   = document.getElementById('vf-alle');
    var kantonCbs = Array.from(document.querySelectorAll('#vf-kanton-grid input[type=checkbox]:checked'))
                        .map(function(c){ return c.value; });

    if(!name)   { showError('Bitte gib den Namen des Verbands ein.'); return; }
    if(!email || !email.includes('@')) { showError('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    if(!kontakt){ showError('Bitte gib den Namen des Ansprechpartners ein.'); return; }
    if(!alleBox.checked && kantonCbs.length === 0){
      showError('Bitte wähle mindestens einen Kanton aus.'); return;
    }

    var kantone = alleBox.checked ? 'alle' : kantonCbs;

    var btn = document.getElementById('vf-submit');
    btn.disabled = true;
    btn.textContent = 'Wird gesendet…';

    try {
      var res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verbandName: name,
          email: email,
          kontaktName: kontakt,
          kontaktTelefon: telefon || undefined,
          kantone: kantone
        })
      });
      if(!res.ok){
        var err = await res.json().catch(function(){ return {}; });
        throw new Error(err.error || 'Unbekannter Fehler (HTTP ' + res.status + ')');
      }
      // Erfolg
      document.getElementById('st-vf-root').innerHTML =
        '<div class="st-vf-success">' +
          '<h3>✓ Anfrage erhalten!</h3>' +
          '<p>Den Pilotpartnerschaftsvertrag haben wir soeben an <strong>' + email + '</strong> gesendet.<br>' +
          'Bitte drucke ihn aus, unterzeichne ihn und sende ihn zurück an <a href="mailto:info@sagatrail.ch">info@sagatrail.ch</a>.<br><br>' +
          'Wir melden uns innerhalb von 2 Werktagen.</p>' +
        '</div>';
    } catch(err){
      btn.disabled = false;
      btn.textContent = 'Pilotpartnerschaft anfragen & Vertrag erhalten';
      showError('Fehler: ' + err.message + '. Bitte versuche es erneut oder schreib uns direkt an info@sagatrail.ch');
    }
  });
})();
</script>
`;
