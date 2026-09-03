import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * Kleine, unabhängige Webansicht für Angehörige. Sie braucht weder Clerk noch
 * die mobile App und aktualisiert die öffentliche JSON-Ansicht automatisch.
 */
router.get("/:token", (req, res): void => {
  const token = String(req.params.token ?? "");
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) {
    res.status(404).type("text/plain").send("Freigabe nicht gefunden");
    return;
  }
  const safeToken = encodeURIComponent(token);
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SagaTrail Sicherheitsstatus</title>
<style>
body{margin:0;background:#101719;color:#f4f2eb;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}
main{width:min(560px,calc(100% - 32px));box-sizing:border-box;background:#192326;border:1px solid #46565a;border-radius:20px;padding:28px;box-shadow:0 14px 50px #0007}
h1{font-size:24px;margin:0 0 8px}h2{font-size:19px;margin:22px 0 8px}p{line-height:1.5;color:#c5cfcd}
.status{display:flex;align-items:center;gap:10px;font-weight:700;margin:18px 0}.dot{width:12px;height:12px;border-radius:50%;background:#61c58b}.dot.warn{background:#e7b84b}.dot.off{background:#d76565}
.location{background:#111b1d;border-radius:12px;padding:14px;margin-top:14px}.muted{font-size:13px;color:#9eadaa}.map{display:inline-block;margin-top:12px;color:#9ed8bf}
small{color:#84938f}
</style></head><body><main><h1>SagaTrail Sicherheitsstatus</h1><div id="app"><p>Wird geladen …</p></div></main>
<script>
const token="${safeToken}";
const app=document.getElementById("app");
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(d){
 const expired=d.status==="expired", ended=d.status==="ended", offline=d.status!=="active";
 const label=expired?"Link abgelaufen":ended?"Freigabe beendet":"Wanderung wird begleitet";
 const cls=offline?"off":"";
 let body="<p>Route: <strong>"+esc(d.routeName)+"</strong></p>";
 if(d.latestLocation){
  const l=d.latestLocation, age=Math.max(0,Math.round((Date.now()-Date.parse(l.updatedAt))/60000));
  body+="<div class=location><strong>Letzter Standort</strong><br><span class=muted>vor "+age+" Min. · Genauigkeit "+(l.accuracy?Math.round(l.accuracy)+" m":"unbekannt")+"</span><br><a class=map target=_blank rel=noopener href='https://www.openstreetmap.org/?mlat="+l.lat+"&mlon="+l.lng+"#map=16/"+l.lat+"/"+l.lng+"'>Auf Karte öffnen</a></div>";
 } else body+="<p>Noch kein aktueller GPS-Standort eingegangen.</p>";
 body+="<p class=muted>Gültig bis "+new Date(d.expiresAt).toLocaleString("de-CH")+"</p>";
 app.innerHTML="<div class='status "+cls+"'><span class=dot></span>"+label+"</div>"+body;
}
async function load(){try{const r=await fetch("/api/safety-shares/"+token,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error();render(d)}catch(e){app.innerHTML="<p>Diese Sicherheitsfreigabe ist nicht verfügbar oder nicht mehr gültig.</p>"}}
load();setInterval(load,15000);
</script></body></html>`;
  res.type("html").set("Cache-Control", "no-store").send(html);
});

export default router;