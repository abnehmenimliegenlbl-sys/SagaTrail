import "./_group.css";

export function Current() {
  return (
    <main className="ar-mockup" aria-label="Aktuelle SagaTrail AR-Routendarstellung">
      <img
        className="ar-camera"
        src="/__mockup/IMG_7659.png"
        alt="Kamerabild mit aktuell eingeblendeter grüner AR-Route"
      />
      <div className="ar-shade" />
      <div className="ar-current-badge">AKTUELL · REFERENZ</div>

      <header className="ar-topbar">
        <div>
          <p className="ar-kicker">Gipfel panorama</p>
          <p className="ar-heading">
            <span className="ar-dot" />
            341° · live
          </p>
        </div>
        <div className="ar-top-actions">
          <span className="ar-status">
            <i />
            AR
          </span>
          <span className="ar-close" aria-hidden="true">
            ×
          </span>
        </div>
      </header>

      <section className="ar-turn" aria-label="Nächste Abzweigung">
        <span className="ar-turn-icon">↱</span>
        <div className="ar-turn-copy">
          <p className="ar-turn-title">Abzweigung voraus</p>
          <p className="ar-turn-detail">Gleich rechts halten</p>
        </div>
        <span className="ar-turn-distance">31.0 km</span>
      </section>

      <div className="ar-current-copy">
        <strong>Route und Gipfelmarker überlagern sich</strong>
        <span>Die gesamte Geometrie bleibt sichtbar · keine klare Laufrichtung</span>
      </div>

      <footer className="ar-bottom">
        <div className="ar-bottom-row">
          <div>
            <p className="ar-bottom-kicker">Gipfel im Blick</p>
            <p className="ar-bottom-title">Tüllinger Berg</p>
            <p className="ar-bottom-sub">2.7 km · 452 m ü. M.</p>
          </div>
          <div className="ar-bottom-legend">
            <span className="ar-legend-route">Route</span>
            <span className="ar-legend-peak">Gipfel</span>
          </div>
        </div>
      </footer>
    </main>
  );
}