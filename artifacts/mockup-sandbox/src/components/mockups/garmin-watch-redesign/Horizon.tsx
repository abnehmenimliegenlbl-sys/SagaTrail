import { useState } from "react";

type Page = "nav" | "status" | "safety" | "story";

const red = "#CC0000";
const ink = "#171719";
const paper = "#F4F3F0";
const green = "#1E9854";

function GpsMark({ fresh = true }: { fresh?: boolean }) {
  return (
    <span className="hz-gps" style={{ color: fresh ? green : red }} aria-label={fresh ? "GPS frisch" : "GPS veraltet"}>
      <svg viewBox="0 0 22 24" aria-hidden="true">
        <circle cx="11" cy="4.5" r="2.3" fill="currentColor" />
        <path d="M11 8v6M11 9 6.3 12M11 9l4.7 3M11 14l-3.7 6M11 14l4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <i />
    </span>
  );
}

function Ridge() {
  return (
    <svg className="hz-ridge" viewBox="0 0 260 92" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 74 29 62 49 68 79 39 98 57 122 19 151 55 177 30 205 61 229 49 260 64v28H0Z" fill="#d8d6d0" />
      <path d="M0 82 36 70 62 76 91 55 116 68 142 46 169 70 197 54 224 72 260 61v31H0Z" fill="#aaa9a5" />
      <path d="M0 74 29 62 49 68 79 39 98 57 122 19 151 55 177 30 205 61 229 49 260 64" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M122 19 132 37 143 45" fill="none" stroke={red} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Watch({ page, onPage }: { page: Page; onPage: (p: Page) => void }) {
  const [sos, setSos] = useState(false);
  const nav = page === "nav";
  return (
    <div className="hz-watch-shell">
      <div className="hz-watch-top" />
      <div className="hz-watch">
        <div className="hz-screen">
          <header className="hz-topline">
            <span>SAGATRAIL / {page.toUpperCase()}</span>
            <GpsMark fresh={page !== "safety"} />
          </header>
          {nav && (
            <section className="hz-nav">
              <div className="hz-direction">
                <span className="hz-chevron" aria-hidden="true">↳</span>
                <strong>RECHTS</strong>
                <small>180 M</small>
              </div>
              <div className="hz-distance"><b>6.8</b><span>KM BIS ZIEL</span></div>
              <div className="hz-horizon">
                <Ridge />
                <span className="hz-you">●</span>
                <span className="hz-route-line" />
                <small>ROUTE 42% · VORWÄRTS</small>
              </div>
              <div className="hz-bottom-stats"><span>1:42 <em>ELAPSED</em></span><span>ETA 2:18</span><span>+640 M <em>ASCENT</em></span></div>
            </section>
          )}
          {page === "status" && (
            <section className="hz-page">
              <div className="hz-page-kicker">LIVE ROUTE / PHONE-AUTORITÄT</div>
              <h2>UNTERWEGS</h2>
              <div className="hz-big-stat">42<span>%</span></div>
              <div className="hz-progress"><i /></div>
              <div className="hz-metrics"><span>8,420<small>SCHRITTE</small></span><span>128<small>BPM</small></span><span>+640<small>HÖHENMETER</small></span></div>
              <div className="hz-sync"><GpsMark /> <b>GPS FRISCH</b><span>vor 04 s</span></div>
            </section>
          )}
          {page === "safety" && (
            <section className="hz-page hz-safety">
              <div className="hz-page-kicker">SICHERHEIT / MENU</div>
              <h2>CHECK-IN</h2>
              <div className="hz-check-ring"><b>18:00</b><small>NOCH ZEIT</small></div>
              <p>Telefon meldet den<br />nächsten Check-in.</p>
              <button className="hz-sos" onClick={() => setSos(!sos)}>{sos ? "SOS BESTÄTIGEN" : "SELECT 2× · SOS"}</button>
              {sos && <div className="hz-confirm">NOCHMALS SELECT<br /><small>NOTRUF AN TELEFON</small></div>}
            </section>
          )}
          {page === "story" && (
            <section className="hz-page hz-story">
              <div className="hz-page-kicker">STORY / AUDIO</div>
              <h2>DER RIDGELAUF</h2>
              <div className="hz-playline"><span className="hz-play">▶</span><b>TELEFON SPIELT AB</b></div>
              <p>Die erste Route über diesen Grat<br />wurde 1894 markiert.</p>
              <div className="hz-story-foot">WATCH STEUERT · AUDIO BLEIBT AM TELEFON</div>
            </section>
          )}
          <footer className="hz-footer">
            <button onClick={() => onPage(page === "nav" ? "story" : page === "status" ? "nav" : page === "safety" ? "status" : "safety")}>▲</button>
            <span>{nav ? "HOCH / RUNTER · MENU" : "HOCH / RUNTER"}</span>
            <button onClick={() => onPage(page === "nav" ? "status" : page === "status" ? "safety" : page === "safety" ? "story" : "nav")}>▼</button>
          </footer>
        </div>
      </div>
      <div className="hz-watch-bottom" />
    </div>
  );
}

export function Horizon() {
  const [page, setPage] = useState<Page>("nav");
  return (
    <main className="hz-board">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}.hz-board{min-height:100vh;background:#dfddd8;color:${ink};padding:30px 24px 34px;font-family:'DM Mono',monospace;display:grid;place-items:center}
        .hz-board:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.18;background-image:radial-gradient(#777 0.5px,transparent .5px);background-size:7px 7px}
        .hz-watch-shell{width:min(100%,460px);position:relative;padding:28px 0 24px}.hz-watch-top,.hz-watch-bottom{position:absolute;left:50%;width:112px;height:76px;transform:translateX(-50%);background:#282827;z-index:0}.hz-watch-top{top:0;border-radius:22px 22px 9px 9px}.hz-watch-bottom{bottom:0;height:65px;border-radius:9px 9px 22px 22px}
        .hz-watch{position:relative;z-index:1;width:min(100%,360px);aspect-ratio:1;margin:auto;border-radius:50%;padding:9px;background:#171717;box-shadow:0 18px 25px #69645d80, inset 0 0 0 2px #686560}.hz-watch:after{content:"GARMIN";position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);color:#85827e;font:600 10px 'Barlow Condensed';letter-spacing:2px}.hz-screen{width:100%;height:100%;border-radius:50%;overflow:hidden;background:${paper};position:relative;padding:25px 27px 21px;display:flex;flex-direction:column}
        .hz-topline{height:20px;display:flex;justify-content:space-between;align-items:start;font-size:7px;letter-spacing:.7px;color:#66635e}.hz-gps{display:flex;align-items:center;gap:3px;font-size:7px;font-weight:500}.hz-gps svg{width:13px;height:14px}.hz-gps i{display:block;width:4px;height:4px;border-radius:50%;background:currentColor}.hz-nav{flex:1;display:flex;flex-direction:column;position:relative}.hz-direction{display:flex;align-items:center;gap:7px;margin-top:7px;color:${red};font-family:'Barlow Condensed';line-height:1}.hz-direction strong{font-size:36px;letter-spacing:1px}.hz-direction small{font:700 13px 'DM Mono';color:${ink};margin-top:14px}.hz-chevron{font:500 50px 'Barlow Condensed';line-height:.7;transform:translateY(-2px)}.hz-distance{position:absolute;right:0;top:59px;text-align:right}.hz-distance b{font:700 30px 'Barlow Condensed';display:block;line-height:.8}.hz-distance span{font-size:6px;letter-spacing:.5px}.hz-horizon{position:absolute;left:-27px;right:-27px;top:106px;height:112px;overflow:hidden}.hz-ridge{position:absolute;bottom:0;width:100%;height:91px}.hz-route-line{position:absolute;left:50%;top:30px;width:2px;height:75px;background:${red};transform:rotate(18deg);transform-origin:top}.hz-you{position:absolute;left:48%;top:25px;color:${red};font-size:15px}.hz-horizon small{position:absolute;bottom:7px;left:0;right:0;text-align:center;font-size:6px;letter-spacing:1px;color:#54524e}.hz-bottom-stats{position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:space-between;font-size:10px;font-weight:500}.hz-bottom-stats em{display:block;font-style:normal;font-size:5px;color:#6a6863;margin-top:3px}.hz-footer{height:16px;display:flex;align-items:center;justify-content:space-between;color:#595752;font-size:6px;letter-spacing:.4px}.hz-footer button{border:0;background:none;color:${ink};font:700 15px 'Barlow Condensed';padding:0;cursor:pointer}.hz-page{flex:1;display:flex;flex-direction:column;padding-top:16px}.hz-page-kicker{font-size:7px;color:#68655f;letter-spacing:.8px}.hz-page h2{font:800 31px 'Barlow Condensed';letter-spacing:1px;margin:3px 0 0;color:${red}}.hz-big-stat{font:800 72px 'Barlow Condensed';line-height:.9;margin-top:13px}.hz-big-stat span{font-size:30px;margin-left:3px}.hz-progress{height:6px;background:#cecbc5;margin-top:9px;position:relative}.hz-progress i{position:absolute;left:0;top:0;bottom:0;width:42%;background:${red}}.hz-metrics{display:grid;grid-template-columns:1.2fr 1fr 1.2fr;gap:7px;margin-top:34px}.hz-metrics span{font:700 17px 'Barlow Condensed';border-top:1px solid #aaa69e;padding-top:6px}.hz-metrics small{display:block;font:6px 'DM Mono';color:#66635f;margin-top:4px}.hz-sync{margin-top:auto;border-top:1px solid #aaa69e;padding-top:8px;display:flex;align-items:center;gap:5px;font-size:8px}.hz-sync .hz-gps svg{width:14px}.hz-sync span{margin-left:auto;color:#68655f;font-size:7px}.hz-safety h2{margin-top:4px}.hz-check-ring{width:104px;height:104px;border-radius:50%;border:5px solid ${green};display:grid;place-content:center;text-align:center;margin:13px auto 7px}.hz-check-ring b{font:700 25px 'Barlow Condensed'}.hz-check-ring small{font-size:6px;margin-top:2px}.hz-safety p{text-align:center;font-size:8px;line-height:1.6;margin:4px 0;color:#5e5b56}.hz-sos{margin:11px auto 0;border:1.5px solid ${red};background:transparent;color:${red};padding:7px 12px;font:700 8px 'DM Mono';cursor:pointer}.hz-confirm{text-align:center;color:${red};font-size:8px;margin-top:8px;line-height:1.4}.hz-confirm small{font-size:6px;color:#555}.hz-playline{display:flex;align-items:center;gap:9px;margin-top:25px;border-top:1px solid #aaa69e;border-bottom:1px solid #aaa69e;padding:12px 0;font-size:9px}.hz-play{font-size:14px;color:${red}}.hz-story p{font:500 12px 'Barlow Condensed';line-height:1.25;margin-top:22px}.hz-story-foot{font-size:6px;color:#68655f;margin-top:auto;line-height:1.6}.hz-board button:focus-visible{outline:2px solid ${red};outline-offset:3px}
        @media(max-width:430px){.hz-board{padding:18px 10px}.hz-watch{width:min(100%,340px)}}
      `}</style>
      <Watch page={page} onPage={setPage} />
    </main>
  );
}