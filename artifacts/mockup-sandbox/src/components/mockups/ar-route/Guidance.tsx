import { useState } from "react";

import "./_group.css";

type Layer = "route" | "peaks";

export function Guidance() {
  const [layer, setLayer] = useState<Layer>("route");

  return (
    <main className="ar-mockup" aria-label="Fokussierte SagaTrail AR-Wegführung">
      <img
        className="ar-camera"
        src="/__mockup/IMG_7657.png"
        alt="Kamerabild im Innenraum als Hintergrund für die neue AR-Wegführung"
      />
      <div className="ar-shade" />

      <header className="ar-topbar">
        <div>
          <p className="ar-kicker">Gipfel panorama</p>
          <p className="ar-heading">
            <span className="ar-dot" />
            284° · Blickrichtung
          </p>
        </div>
        <div className="ar-top-actions">
          <span className="ar-status">
            <i />
            GPS stabil
          </span>
          <span className="ar-close" aria-hidden="true">
            ×
          </span>
        </div>
      </header>

      <section className="ar-turn" aria-label="Nächste Wegweisung">
        <span className="ar-turn-icon">↑</span>
        <div className="ar-turn-copy">
          <p className="ar-turn-title">Geradeaus</p>
          <p className="ar-turn-detail">Dem Weg bis zur Kurve folgen</p>
        </div>
        <span className="ar-turn-distance">31 m</span>
      </section>

      {layer === "route" && (
        <div className="ar-route-focus" aria-label="Nächster Routenausschnitt">
          <div className="ar-route-line one" />
          <div className="ar-route-line two" />
          <div className="ar-route-line three" />
          <div className="ar-route-node start" />
          <div className="ar-route-node turn" />
          <div className="ar-route-node finish" />
          <div className="ar-chevron a" />
          <div className="ar-chevron b" />
          <div className="ar-chevron c" />
        </div>
      )}

      <span className="ar-next-label">
        Nächster Abschnitt · 0–50 m
      </span>

      {layer === "peaks" && (
        <aside className="ar-peak-card">
          <small>Panorama · separat</small>
          <strong>Schädelberg</strong>
          <span>2.0 km · 594 m ü. M.</span>
        </aside>
      )}

      <footer className="ar-bottom">
        <div className="ar-bottom-row">
          <div>
            <p className="ar-bottom-kicker">Wegführung aktiv</p>
            <p className="ar-bottom-title">Nächste Kurve in 31 m</p>
            <p className="ar-bottom-sub">Nur der verlässliche Nahbereich wird projiziert</p>
          </div>
          <div className="ar-bottom-legend">
            <button
              type="button"
              className="ar-legend-route"
              onClick={() => setLayer("route")}
              aria-pressed={layer === "route"}
            >
              Route
            </button>
            <button
              type="button"
              className="ar-legend-peak"
              onClick={() => setLayer("peaks")}
              aria-pressed={layer === "peaks"}
            >
              Gipfel
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}