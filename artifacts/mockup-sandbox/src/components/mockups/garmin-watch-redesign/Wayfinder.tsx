import { useState } from "react";

type Screen = "navigation" | "status" | "safety" | "story";

const RED = "#CC0000";
const INK = "#161719";
const PAPER = "#F4F2ED";
const MUTED = "#77756F";
const GREEN = "#1C9B57";

function GpsMark({ fresh = true }: { fresh?: boolean }) {
  return (
    <span className="gps-mark" style={{ color: fresh ? GREEN : RED }} aria-label={fresh ? "GPS fresh" : "GPS stale"}>
      <span className="walker-head" />
      <span className="walker-body" />
      <span className="walker-arm left" />
      <span className="walker-arm right" />
      <span className="walker-leg left" />
      <span className="walker-leg right" />
    </span>
  );
}

function Watch({ screen, setScreen, sosStep, setSosStep }: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  sosStep: number;
  setSosStep: (step: number) => void;
}) {
  const nav = (next: Screen) => { setScreen(next); setSosStep(0); };
  return (
    <div className="watch-shell">
      <div className="lug top" /><div className="lug bottom" />
      <div className="watch-case">
        <div className="watch-bezel">
          <div className="watch-face">
            <div className="face-header">
              <span className="tiny-label">SAGATRAIL</span>
              <span className="face-page">{screen === "navigation" ? "01" : screen === "status" ? "02" : screen === "safety" ? "03" : "04"} / 04</span>
              <GpsMark fresh={screen !== "safety" || sosStep !== 2} />
            </div>
            {screen === "navigation" && (
              <section className="navigation-screen">
                <div className="wayfinder-line"><span>ROUTE</span><i /></div>
                <div className="direction">RECHTS</div>
                <div className="maneuver">
                  <strong>180</strong><span>m</span>
                </div>
                <div className="rule" />
                <div className="nav-bottom">
                  <div><b>6.8</b><small>km REST</small></div>
                  <div className="eta"><b>1:42</b><small>ETA 2:18</small></div>
                </div>
                <div className="progress"><span /></div>
                <div className="route-caption">NÄCHSTER PUNKT · ALPWEG</div>
              </section>
            )}
            {screen === "status" && (
              <section className="context-screen">
                <div className="screen-title">STATUS</div>
                <div className="metric-hero"><strong>+640</strong><span>m AUFSTIEG</span></div>
                <div className="metric-grid">
                  <div><b>8,420</b><small>SCHRITTE</small></div>
                  <div><b>128</b><small>BPM</small></div>
                  <div><b>1:42</b><small>ZEIT</small></div>
                  <div><b>6.8</b><small>KM REST</small></div>
                </div>
                <div className="status-foot"><span className="dot green" /> PHONE LINK · LIVE</div>
              </section>
            )}
            {screen === "safety" && (
              <section className="context-screen safety-screen">
                <div className="screen-title">SICHERHEIT</div>
                <div className="checkin">
                  <span className="check-label">CHECK-IN</span>
                  <strong>AKTIV</strong>
                  <small>NOCH 28 MIN</small>
                </div>
                <div className="safety-note"><span className="dot green" /> ROUTE SICHER</div>
                <button className={`sos ${sosStep ? "confirming" : ""}`} onClick={() => setSosStep(sosStep ? 0 : 1)}>
                  {sosStep ? "SELECT · SOS AUSLÖSEN" : "MENU · SOS BEREIT"}
                </button>
                {sosStep === 1 && <div className="confirm-note">NOCH EINMAL SELECT<br />SENDEN AN NOTFALLKONTAKT</div>}
              </section>
            )}
            {screen === "story" && (
              <section className="context-screen story-screen">
                <div className="screen-title">STORY / AUDIO</div>
                <div className="story-pip">●</div>
                <strong>ALPWEG · 0:42</strong>
                <p>Das Wasser aus diesem Tal fliesst seit Jahrhunderten zur Passhöhe.</p>
                <div className="story-state">AUDIO AM TELEFON · WATCH FERNSTEUERUNG</div>
              </section>
            )}
            <div className="watch-footer">
              <button onClick={() => nav("navigation")} className={screen === "navigation" ? "active" : ""}>UP</button>
              <span>{screen === "navigation" ? "HOCH / RUNTER" : "SEITE WECHSELN"}</span>
              <button onClick={() => nav(screen === "navigation" ? "status" : screen === "status" ? "safety" : screen === "safety" ? "story" : "navigation")} className="down">DOWN</button>
            </div>
          </div>
        </div>
      </div>
      <div className="side-button" />
    </div>
  );
}

export function Wayfinder() {
  const [screen, setScreen] = useState<Screen>("navigation");
  const [sosStep, setSosStep] = useState(0);
  return (
    <main className="wayfinder-board">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@500;600;700;800&display=swap');
        *{box-sizing:border-box} .wayfinder-board{min-height:100vh;background:#e8e5de;color:${INK};font-family:Manrope,sans-serif;padding:42px 34px;display:flex;justify-content:center}
        .board{width:100%;max-width:520px}.nav-bottom small{font:700 6px Manrope;color:${MUTED}}
        .eyebrow{font:500 10px 'DM Mono';letter-spacing:.18em;color:${RED};margin-bottom:11px}.board-head{display:flex;justify-content:space-between;border-bottom:1px solid #c9c5bd;padding-bottom:17px}.board-title{font-size:25px;letter-spacing:-.06em;margin:0}.board-sub{font:10px 'DM Mono';color:${MUTED};text-align:right}.hero{background:${PAPER};margin-top:22px;border-radius:18px;padding:24px 18px;display:flex;justify-content:center;box-shadow:0 10px 30px #201d1720}.watch-shell{position:relative;width:318px;height:318px;display:grid;place-items:center}.watch-case{width:287px;height:287px;border-radius:50%;background:#a7a49d;padding:13px;box-shadow:0 13px 18px #1212114d}.watch-bezel{width:100%;height:100%;border-radius:50%;background:#1b1b1a;padding:11px}.watch-face{width:100%;height:100%;border-radius:50%;background:${PAPER};overflow:hidden;padding:27px 28px 20px;display:flex;flex-direction:column}.lug{position:absolute;width:70px;height:34px;background:#55544f;left:124px}.lug.top{top:-7px}.lug.bottom{bottom:-7px}.side-button{position:absolute;right:1px;top:105px;width:13px;height:42px;background:#67645f}.face-header{height:16px;display:flex;align-items:center;gap:7px;border-bottom:1px solid #d6d2c9}.tiny-label,.face-page,.route-caption,.story-state{font:500 7px 'DM Mono';letter-spacing:.08em}.face-page{color:${MUTED};margin-left:auto}.gps-mark{width:11px;height:16px;display:inline-block;position:relative;color:${GREEN}}.walker-head{position:absolute;width:3px;height:3px;background:currentColor;border-radius:50%;left:4px}.walker-body{position:absolute;left:5px;top:4px;width:2px;height:7px;background:currentColor}.walker-arm,.walker-leg{position:absolute;height:2px;background:currentColor}.walker-arm{top:6px;width:5px}.walker-arm.left{left:5px;transform:rotate(150deg)}.walker-arm.right{left:6px;transform:rotate(25deg)}.walker-leg{top:10px;width:6px}.walker-leg.left{left:5px;transform:rotate(125deg)}.walker-leg.right{left:5px;transform:rotate(55deg)}.navigation-screen,.context-screen{flex:1;display:flex;flex-direction:column;align-items:center}.wayfinder-line{width:100%;display:flex;gap:6px;margin-top:9px;font:500 6px 'DM Mono';color:${MUTED}}.wayfinder-line i{height:1px;background:${RED};flex:1}.direction{font-size:29px;font-weight:800;letter-spacing:-.08em;color:${RED};margin-top:10px}.maneuver{display:flex;align-items:baseline;color:${INK}}.maneuver strong{font:500 43px 'DM Mono';letter-spacing:-.12em}.maneuver span{font-size:10px;margin-left:5px}.rule{height:2px;width:100%;background:${INK};opacity:.16;margin:9px 0 8px}.nav-bottom{display:flex;width:100%;justify-content:space-between}.nav-bottom div{display:flex;align-items:baseline;gap:3px}.nav-bottom b{font:500 16px 'DM Mono'}.nav-bottom .eta{display:block;text-align:right}.progress{height:4px;background:#d4d0c8;width:100%;margin-top:9px}.progress span{display:block;height:100%;width:41%;background:${RED}}.route-caption{color:${MUTED};margin-top:7px;font-size:6px}.watch-footer{height:15px;display:flex;align-items:center;gap:7px;margin-top:4px;color:${MUTED};font:500 6px 'DM Mono'}.watch-footer button{border:0;background:none;color:${MUTED};font:500 6px 'DM Mono'}.context-screen{text-align:center}.screen-title{font-weight:700;font-size:15px;margin:13px 0 10px}.metric-hero{border-bottom:1px solid #d4d0c8;padding-bottom:8px;width:100%}.metric-hero strong{font:500 28px 'DM Mono'}.metric-hero span{font-size:7px;color:${MUTED}}.metric-grid{width:100%;display:grid;grid-template-columns:1fr 1fr;margin-top:9px;gap:7px}.metric-grid div{text-align:left;border-left:2px solid ${RED};padding-left:7px}.metric-grid b{font:500 14px 'DM Mono';display:block}.metric-grid small{font-size:6px;color:${MUTED}}.status-foot{margin-top:auto;font:500 6px 'DM Mono';color:${MUTED}}.dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:${GREEN};margin-right:4px}.safety-screen .screen-title{color:${RED}}.checkin{border-top:2px solid ${RED};border-bottom:1px solid #d4d0c8;width:100%;padding:8px 0;display:grid;grid-template-columns:1fr 1fr;text-align:left}.check-label{font-size:6px;color:${MUTED}}.checkin strong{font-size:14px;color:${GREEN};text-align:right}.checkin small{grid-column:1/-1;font:500 7px 'DM Mono';margin-top:4px}.safety-note{font:500 7px 'DM Mono';margin-top:13px}.sos{margin-top:auto;border:1px solid ${RED};background:none;color:${RED};font-weight:700;font-size:7px;padding:7px;width:100%}.sos.confirming{background:${RED};color:${PAPER}}.confirm-note{font:500 6px 'DM Mono';color:${RED};margin-top:5px}.story-pip{color:${RED};margin:1px 0 5px}.story-screen p{font-size:9px;line-height:1.45;margin:12px 7px}.story-state{color:${MUTED};margin-top:auto;font-size:5px}.legend{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.legend-item{border-top:1px solid #c9c5bd;padding-top:11px}.legend-item strong{display:block;font-size:11px}.legend-item p{font-size:10px;line-height:1.45;color:${MUTED};margin:4px 0}.redline{display:inline-block;width:17px;height:3px;background:${RED};margin-right:5px}.greenline{display:inline-block;width:7px;height:7px;border-radius:50%;background:${GREEN};margin-right:5px}
      `}</style>
      <div className="board">
        <div className="eyebrow">Design hypothesis · 01</div>
        <header className="board-head"><h1 className="board-title">Wegweiser</h1><div className="board-sub">SAGATRAIL / GARMIN<br />PHONE-AUTHORITATIVE</div></header>
        <div className="hero"><Watch screen={screen} setScreen={setScreen} sosStep={sosStep} setSosStep={setSosStep} /></div>
        <div className="legend">
          <div className="legend-item"><strong><span className="redline" />Navigation leads.</strong><p>Direction and distance are encountered first — like a clear trail marker at the decisive moment.</p></div>
          <div className="legend-item"><strong><span className="greenline" />Trust at a glance.</strong><p>Only fresh GPS earns green. Every page keeps the walking-person signal visible.</p></div>
        </div>
      </div>
    </main>
  );
}