import { useState } from "react";

type Page = "nav" | "status" | "safety" | "story";

const red = "#CC0000";
const ink = "#121314";
const paper = "#F2F0EB";
const green = "#239454";

function Person({ fresh = true }: { fresh?: boolean }) {
  return (
    <span className="gps-person" aria-label={fresh ? "GPS frisch" : "GPS schwach"}>
      <i style={{ background: fresh ? green : red }} />
      <b style={{ background: fresh ? green : red }} />
      <em style={{ background: fresh ? green : red }} />
    </span>
  );
}

function RingMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ring-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function Instrument() {
  const [page, setPage] = useState<Page>("nav");
  const [sos, setSos] = useState<"idle" | "confirm" | "sent">("idle");
  const [checkin, setCheckin] = useState(false);

  const pages: Page[] = ["nav", "status", "safety", "story"];
  const go = (direction: number) => {
    setPage((current) => {
      const next = (pages.indexOf(current) + direction + pages.length) % pages.length;
      return pages[next];
    });
  };

  return (
    <main className="instrument-board">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .instrument-board{min-height:100vh;background:#dedbd4;color:${ink};display:grid;place-items:center;padding:28px 18px;font-family:'DM Mono',monospace;overflow:hidden}
        .instrument-board *{box-sizing:border-box}
        .studio{width:min(100%,520px);display:flex;flex-direction:column;align-items:center;gap:18px}
        .eyebrow{width:100%;display:flex;justify-content:space-between;align-items:center;color:#65635e;font-size:10px;letter-spacing:.15em;text-transform:uppercase;padding:0 7px}
        .eyebrow strong{color:${red};font-weight:500}
        .watch{width:326px;height:326px;background:#252626;border-radius:50%;padding:32px;position:relative;box-shadow:0 20px 38px #77736a55, inset 0 0 0 3px #454545}
        .watch:before,.watch:after{content:"";position:absolute;left:50%;transform:translateX(-50%);width:82px;height:20px;background:#2b2b2a;z-index:-1}
        .watch:before{top:-18px;border-radius:10px 10px 3px 3px}.watch:after{bottom:-18px;border-radius:3px 3px 10px 10px}
        .lug{position:absolute;width:7px;height:28px;background:#a6a49d;border-radius:5px;top:103px}.lug.left{left:4px}.lug.right{right:4px}
        .screen{width:260px;height:260px;border-radius:50%;background:${paper};overflow:hidden;position:relative;border:2px solid #85827b;box-shadow:inset 0 0 0 8px #e4e1d9}
        .screen:after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 26px #00000016;pointer-events:none}
        .screen-inner{position:absolute;inset:18px;display:flex;flex-direction:column;z-index:1}
        .watch-top{height:30px;width:164px;align-self:center;display:flex;align-items:center;justify-content:space-between;font-size:9px;letter-spacing:.12em;color:#62615c}
        .watch-top b{font-family:'Barlow Condensed';font-size:12px;letter-spacing:.14em;color:${ink}}
        .gps{display:flex;align-items:center;gap:4px;letter-spacing:0;font-size:8px}
        .gps-person{display:inline-block;position:relative;width:11px;height:16px;vertical-align:middle}
        .gps-person i{display:block;width:4px;height:4px;border-radius:50%;position:absolute;left:4px;top:0}.gps-person b{display:block;width:3px;height:8px;position:absolute;left:4px;top:5px;border-radius:2px;transform:rotate(0deg)}.gps-person em{display:block;width:10px;height:2px;position:absolute;left:1px;top:13px;transform:rotate(-28deg);border-radius:2px}
        .nav-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding-bottom:4px}
        .direction{font-family:'Barlow Condensed';font-size:45px;line-height:.82;letter-spacing:.06em;color:${red};font-weight:700}
        .direction-mark{position:absolute;top:3px;width:28px;height:28px;border-left:4px solid ${red};border-bottom:4px solid ${red};transform:rotate(-45deg)}
        .distance{font-family:'Barlow Condensed';font-size:39px;font-weight:600;letter-spacing:.015em;line-height:1;margin-top:23px}.distance small{font-family:'DM Mono';font-size:11px;letter-spacing:.05em}
        .nextline{font-size:9px;color:#5d5c58;text-transform:uppercase;letter-spacing:.08em;margin-top:7px}
        .progress{width:184px;height:4px;background:#c8c5bd;margin:5px auto 4px;position:relative}.progress i{display:block;width:42%;height:100%;background:${red}}
        .bottom-strip{width:150px;margin:0 auto;display:flex;justify-content:space-between;align-items:end;font-size:7px;letter-spacing:.01em;border-top:1px solid #bdbab2;padding-top:5px}
        .bottom-strip strong{font-size:13px;font-weight:500}.bottom-strip span{color:#66645f}.bottom-strip em{font-style:normal;color:${red}}
        .page-view{flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px}
        .page-title{font-family:'Barlow Condensed';font-size:29px;letter-spacing:.08em;color:${red};line-height:1}
        .hairline{height:1px;background:#b9b6ae}.metric-line{display:flex;justify-content:space-between;align-items:baseline;font-size:9px;color:#66645f;text-transform:uppercase}.metric-line strong{font-family:'Barlow Condensed';font-size:22px;color:${ink};letter-spacing:.03em}.metric-line b{color:${red};font-weight:500}
        .status-orbit{display:grid;grid-template-columns:1fr 1fr;gap:13px 10px;margin-top:4px}.status-orbit .ring-metric{border-top:2px solid ${ink};padding-top:4px}.ring-metric span{font-size:8px;color:#686660;display:block;letter-spacing:.1em}.ring-metric strong{display:block;font-family:'Barlow Condensed';font-size:25px;line-height:1.05;font-weight:600}.ring-metric small{font-size:8px;color:#686660}
        .alert{border:2px solid ${red};padding:8px 10px;text-align:center;color:${red};font-family:'Barlow Condensed';font-size:20px;letter-spacing:.08em}.alert small{display:block;font:8px 'DM Mono';color:${ink};letter-spacing:.02em;margin-top:4px}
        .check{font-family:'Barlow Condensed';font-size:20px;letter-spacing:.07em;color:${green}}.sos-button{border:0;background:${red};color:#fff;font:600 15px 'Barlow Condensed';letter-spacing:.1em;padding:8px;cursor:pointer}.sos-button.secondary{background:${ink}}
        .story-mark{height:44px;border-left:5px solid ${red};padding-left:10px;font-family:'Barlow Condensed';font-size:23px;letter-spacing:.06em}.story-copy{font-size:9px;line-height:1.55;color:#4f4e49}.phone-note{font-size:8px;color:#686660;border-top:1px solid #b9b6ae;padding-top:8px}
        .controls{display:flex;align-items:center;gap:14px}.control{background:transparent;border:1px solid #918e87;color:${ink};font:500 10px 'DM Mono';letter-spacing:.08em;padding:9px 14px;cursor:pointer}.control:hover{border-color:${red};color:${red}}.dots{display:flex;gap:5px}.dot{width:5px;height:5px;border-radius:50%;background:#aaa7a0}.dot.active{background:${red};width:18px;border-radius:4px}
        .caption{font-size:10px;color:#716e67;letter-spacing:.1em;text-transform:uppercase}.caption span{color:${red}}
        @media(max-width:390px){.watch{transform:scale(.88);margin:-20px 0}.instrument-board{padding-top:12px;gap:0}}
      `}</style>
      <section className="studio">
        <header className="eyebrow"><span>SAGATRAIL / GARMIN</span><strong>INSTRUMENT 01</strong></header>
        <div className="watch" aria-label="Garmin watch preview">
          <span className="lug left" /><span className="lug right" />
          <div className="screen">
            <div className="screen-inner">
              <div className="watch-top"><b>{page === "nav" ? "NAVIGATION" : page.toUpperCase()}</b><span className="gps"><Person fresh /> GPS</span></div>
              {page === "nav" && <div className="nav-main">
                <div className="direction-mark" />
                <div className="direction">RECHTS</div>
                <div className="distance">180 <small>M</small></div>
                <div className="nextline">NÄCHSTER MANÖVERPUNKT</div>
              </div>}
              {page === "status" && <div className="page-view"><div className="page-title">LIVE / ROUTE</div><div className="hairline" /><div className="status-orbit"><RingMetric label="VERBLEIBEND" value="6.8 km" /><RingMetric label="ZEIT" value="1:42" sub="ETA 2:18" /><RingMetric label="AUFSTIEG" value="+640 m" /><RingMetric label="PULS" value="128" sub="BPM" /></div></div>}
              {page === "safety" && <div className="page-view"><div className="page-title">SICHERHEIT</div><div className="check">{checkin ? "CHECK-IN AKTIV" : "BEREIT FÜR CHECK-IN"}</div><div className="hairline" /><div className="metric-line"><span>Telefon</span><b>VERBUNDEN</b></div><div className="metric-line"><span>GPS-FIX</span><b>FRISCH</b></div>{sos === "sent" ? <div className="alert">SOS GESENDET<small>TELEFON ÜBERNIMMT</small></div> : sos === "confirm" ? <button className="sos-button" onClick={() => setSos("sent")}>NOCHMALS: SOS SENDEN</button> : <button className="sos-button" onClick={() => setSos("confirm")}>SOS / SELECT 2×</button>}</div>}
              {page === "story" && <div className="page-view"><div className="page-title">STORY / AUDIO</div><div className="story-mark">KAPITEL 04<br />ALPENWEG</div><div className="story-copy">Die Route folgt dem alten Saumpfad am Grat. Die Geschichte läuft auf dem Telefon.</div><div className="phone-note">AUDIO: AKTIV · WATCH STEUERT NICHT DIE WIEDERGABE</div></div>}
              {page === "nav" && <><div className="progress"><i /></div><div className="bottom-strip"><span><strong>6.8</strong> km <em>•</em> <strong>42%</strong></span><span>1:42 <em>│</em> ETA 2:18</span></div></>}
            </div>
          </div>
        </div>
        <div className="controls"><button className="control" onClick={() => go(-1)}>▲ UP</button><div className="dots">{pages.map((item) => <i key={item} className={`dot ${page === item ? "active" : ""}`} />)}</div><button className="control" onClick={() => go(1)}>▼ DOWN</button></div>
        <div className="caption"><span>PHONE-AUTHORITATIVE</span> · ONE GLANCE / REAL ROUTE</div>
        {page === "safety" && <button className="control" onClick={() => setCheckin(!checkin)}>{checkin ? "CHECK-IN STOPPEN" : "MENU · CHECK-IN 30 MIN"}</button>}
      </section>
    </main>
  );
}