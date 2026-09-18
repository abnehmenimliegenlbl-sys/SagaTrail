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
             <span className="hz-brand"><img src="/__mockup/images/horizon-sagatrail-logo.png" alt="SagaTrail" /><b>SAGATRAIL</b><i>/</i>{page === "nav" ? "NAV" : page.toUpperCase()}</span>
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
         .hz-watch{position:relative;z-index:1;width:min(100%,360px);aspect-ratio:1;margin:auto;border-radius:50%;padding:9px;background:#171717;box-shadow:0 18px 25px #69645d80, inset 0 0 0 2px #686560}.hz-watch:after{content:"GARMIN";position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);color:#85827e;font:600 10px 'Barlow Condensed';letter-spacing:2px}.hz-screen{width:100%;height:100%;border-radius:50%;overflow:hidden;background:${paper};position:relative;padding:25px 34px 29px;display:flex;flex-direction:column}
         .hz-topline{height:20px;display:flex;justify-content:center;gap:16px;align-items:start;font-size:6px;letter-spacing:.55px;color:#3f3d39}.hz-gps{display:flex;align-items:center;gap:3px;font-size:6px;font-weight:500}.hz-gps svg{width:13px;height:14px}.hz-gps i{display:block;width:4px;height:4px;border-radius:50%;background:currentColor}.hz-nav{flex:1;display:flex;flex-direction:column;position:relative}.hz-direction{display:flex;align-items:center;gap:5px;margin-top:9px;color:${red};font-family:'Barlow Condensed';line-height:1}.hz-direction strong{font-size:31px;letter-spacing:.8px}.hz-direction small{font:700 11px 'DM Mono';color:${ink};margin-top:10px}.hz-chevron{font:500 42px 'Barlow Condensed';line-height:.7;transform:translateY(-2px)}.hz-distance{position:absolute;right:0;top:62px;text-align:right}.hz-distance b{font:700 27px 'Barlow Condensed';display:block;line-height:.8}.hz-distance span{font-size:5px;letter-spacing:.45px}.hz-horizon{position:absolute;left:-14px;right:-14px;top:106px;height:108px;overflow:hidden}.hz-ridge{position:absolute;bottom:0;width:100%;height:85px}.hz-route-line{position:absolute;left:50%;top:30px;width:2px;height:70px;background:${red};transform:rotate(18deg);transform-origin:top}.hz-you{position:absolute;left:48%;top:25px;color:${red};font-size:15px}.hz-horizon small{position:absolute;bottom:7px;left:0;right:0;text-align:center;font-size:5px;letter-spacing:.8px;color:#3f3d39}.hz-bottom-stats{position:absolute;bottom:21px;left:0;right:0;display:flex;justify-content:space-between;font-size:8px;font-weight:500}.hz-bottom-stats em{display:block;font-style:normal;font-size:4px;color:#3f3d39;margin-top:2px}.hz-footer{height:14px;display:flex;align-items:center;justify-content:space-between;color:#3f3d39;font-size:5px;letter-spacing:.3px}.hz-footer button{border:0;background:none;color:${ink};font:700 14px 'Barlow Condensed';padding:0;cursor:pointer}.hz-page{flex:1;display:flex;flex-direction:column;padding-top:14px}.hz-page-kicker{font-size:6px;color:#3f3d39;letter-spacing:.7px}.hz-page h2{font:800 29px 'Barlow Condensed';letter-spacing:.8px;margin:3px 0 0;color:${red}}.hz-big-stat{font:800 66px 'Barlow Condensed';line-height:.9;margin-top:12px}.hz-big-stat span{font-size:28px;margin-left:3px}.hz-progress{height:5px;background:#cecbc5;margin-top:8px;position:relative}.hz-progress i{position:absolute;left:0;top:0;bottom:0;width:42%;background:${red}}.hz-metrics{display:grid;grid-template-columns:1.2fr 1fr 1.2fr;gap:5px;margin-top:28px}.hz-metrics span{font:700 16px 'Barlow Condensed';border-top:1px solid #aaa69e;padding-top:5px}.hz-metrics small{display:block;font:5px 'DM Mono';color:#3f3d39;margin-top:3px}.hz-sync{margin-top:auto;border-top:1px solid #aaa69e;padding-top:7px;display:flex;align-items:center;gap:4px;font-size:7px}.hz-sync .hz-gps svg{width:14px}.hz-sync span{margin-left:auto;color:#3f3d39;font-size:6px}.hz-safety h2{margin-top:4px}.hz-check-ring{width:96px;height:96px;border-radius:50%;border:4px solid ${green};display:grid;place-content:center;text-align:center;margin:12px auto 6px}.hz-check-ring b{font:700 23px 'Barlow Condensed'}.hz-check-ring small{font-size:5px;margin-top:2px}.hz-safety p{text-align:center;font-size:7px;line-height:1.5;margin:4px 0;color:#3f3d39}.hz-sos{margin:10px auto 0;border:1.5px solid ${red};background:transparent;color:${red};padding:6px 10px;font:700 7px 'DM Mono';cursor:pointer}.hz-confirm{text-align:center;color:${red};font-size:7px;margin-top:7px;line-height:1.35}.hz-confirm small{font-size:5px;color:#3f3d39}.hz-playline{display:flex;align-items:center;gap:8px;margin-top:22px;border-top:1px solid #aaa69e;border-bottom:1px solid #aaa69e;padding:10px 0;font-size:8px}.hz-play{font-size:13px;color:${red}}.hz-story p{font:500 11px 'Barlow Condensed';line-height:1.2;margin-top:19px}.hz-story-foot{font-size:5px;color:#3f3d39;margin-top:auto;line-height:1.5}.hz-board button:focus-visible{outline:2px solid ${red};outline-offset:3px}
         .hz-brand{display:flex;align-items:center;gap:3px}.hz-brand img{width:15px;height:15px;object-fit:contain;display:block;margin-top:-2px}.hz-brand b{font-weight:700;color:${ink}}.hz-brand i{font-style:normal;color:#817d76}
         @media(max-width:430px){.hz-board{padding:18px 10px}.hz-watch{width:min(100%,340px)}}
      `}</style>
      <Watch page={page} onPage={setPage} />
    </main>
  );
}