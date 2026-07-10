<?php
/**
 * WPCode Snippet: SagaTrail Marketing-Landingpage
 *
 * Einrichtung in WordPress:
 * 1. Plugin "WPCode" installieren/aktivieren.
 * 2. WPCode -> "Snippet hinzufuegen" -> "Eigenes Snippet erstellen".
 * 3. Code-Typ auf "PHP Snippet" stellen und den kompletten Inhalt dieser Datei einfuegen.
 * 4. Einfuegen-Methode: "Nur ausfuehren" (Auto Insert ist NICHT noetig, da es ein Shortcode ist).
 * 5. Snippet aktivieren (Status auf "Aktiv").
 * 6. Auf einer beliebigen Seite/Beitrag den Shortcode [sagatrail_landing] einfuegen
 *    (z.B. in einer neuen Seite "Startseite" mit dem Block-Editor als "Shortcode"-Block).
 *
 * Die Seite ist komplett self-contained (eigenes CSS, kein Theme-Styling noetig)
 * und passt sich automatisch an Mobilgeraete an.
 */

if (!function_exists('sagatrail_landing_shortcode')) {
    function sagatrail_landing_shortcode($atts) {
        $atts = shortcode_atts(
            array(
                'ios_url'    => 'https://apps.apple.com/app/sagatrail',
                'android_url'=> 'https://play.google.com/store/apps/details?id=ch.sagatrail.app',
            ),
            $atts,
            'sagatrail_landing'
        );

        ob_start();
        ?>
        <div class="st-landing">
            <style>
                .st-landing {
                    --st-red: #DA291C;
                    --st-red-dark: #B8221A;
                    --st-gold: #B8935A;
                    --st-ink: #181A1E;
                    --st-muted: #6B7280;
                    --st-bg: #F4F5F7;
                    --st-card: #FFFFFF;
                    --st-border: rgba(218,41,28,0.18);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: var(--st-ink);
                    background: var(--st-bg);
                    line-height: 1.5;
                    overflow-x: hidden;
                }
                .st-landing * { box-sizing: border-box; }
                .st-landing a { text-decoration: none; }
                .st-landing img { max-width: 100%; display: block; }

                .st-wrap {
                    max-width: 1120px;
                    margin: 0 auto;
                    padding: 0 24px;
                }

                /* Hero */
                .st-hero {
                    position: relative;
                    background: linear-gradient(160deg, var(--st-red) 0%, var(--st-red-dark) 55%, #7A140E 100%);
                    color: #fff;
                    padding: 88px 0 120px;
                    overflow: hidden;
                }
                .st-hero::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at 85% 15%, rgba(255,255,255,0.12), transparent 45%),
                        radial-gradient(circle at 10% 90%, rgba(184,147,90,0.25), transparent 40%);
                    pointer-events: none;
                }
                .st-hero-inner {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    gap: 56px;
                    flex-wrap: wrap;
                }
                .st-hero-text { flex: 1 1 420px; min-width: 280px; }
                .st-cross {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 56px;
                    height: 56px;
                    background: #fff;
                    border-radius: 14px;
                    margin-bottom: 28px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
                }
                .st-cross svg { width: 28px; height: 28px; }
                .st-hero h1 {
                    font-size: 44px;
                    line-height: 1.12;
                    font-weight: 800;
                    margin: 0 0 18px;
                    letter-spacing: -0.02em;
                }
                .st-hero p.st-sub {
                    font-size: 19px;
                    color: rgba(255,255,255,0.92);
                    max-width: 480px;
                    margin: 0 0 34px;
                }
                .st-cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
                .st-store-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: #fff;
                    color: var(--st-ink);
                    padding: 12px 22px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 15px;
                    box-shadow: 0 6px 18px rgba(0,0,0,0.16);
                    transition: transform 0.15s ease;
                }
                .st-store-btn:hover { transform: translateY(-2px); color: var(--st-ink); }
                .st-store-btn svg { width: 20px; height: 20px; flex-shrink: 0; }
                .st-hero-note { font-size: 13.5px; color: rgba(255,255,255,0.75); }

                .st-hero-visual {
                    flex: 0 0 auto;
                    width: 260px;
                    display: flex;
                    justify-content: center;
                }
                .st-phone {
                    width: 240px;
                    height: 490px;
                    background: #101216;
                    border-radius: 40px;
                    padding: 12px;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06);
                }
                .st-phone-screen {
                    width: 100%;
                    height: 100%;
                    border-radius: 28px;
                    background: linear-gradient(180deg, #F4F5F7 0%, #ffffff 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    padding: 20px;
                    text-align: center;
                }
                .st-phone-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 18px;
                    background: var(--st-red);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .st-phone-icon svg { width: 32px; height: 32px; }
                .st-phone-screen strong { color: var(--st-ink); font-size: 15px; }
                .st-phone-screen span { color: var(--st-muted); font-size: 12.5px; }

                /* Section headings */
                .st-section { padding: 84px 0; }
                .st-section.alt { background: #fff; }
                .st-eyebrow {
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--st-red);
                    margin-bottom: 10px;
                }
                .st-h2 {
                    font-size: 32px;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    margin: 0 0 14px;
                }
                .st-lead {
                    font-size: 17px;
                    color: var(--st-muted);
                    max-width: 560px;
                    margin: 0 0 48px;
                }
                .st-center { text-align: center; margin-left: auto; margin-right: auto; }

                /* Feature grid */
                .st-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }
                @media (max-width: 860px) { .st-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 560px) { .st-grid { grid-template-columns: 1fr; } }
                .st-card {
                    background: var(--st-card);
                    border: 1px solid var(--st-border);
                    border-radius: 18px;
                    padding: 28px 24px;
                }
                .st-section.alt .st-card { background: var(--st-bg); }
                .st-card-icon {
                    width: 46px;
                    height: 46px;
                    border-radius: 12px;
                    background: rgba(218,41,28,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .st-card-icon svg { width: 22px; height: 22px; fill: var(--st-red); }
                .st-card h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
                .st-card p { font-size: 14.5px; color: var(--st-muted); margin: 0; }

                /* Steps */
                .st-steps {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 32px;
                }
                @media (max-width: 760px) { .st-steps { grid-template-columns: 1fr; } }
                .st-step-num {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--st-red);
                    color: #fff;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .st-step h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
                .st-step p { font-size: 14.5px; color: var(--st-muted); margin: 0; }

                /* Premium banner */
                .st-premium {
                    background: linear-gradient(135deg, #1B1D22, #101216);
                    border-radius: 24px;
                    padding: 48px 40px;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 32px;
                    flex-wrap: wrap;
                }
                .st-premium-text { flex: 1 1 320px; }
                .st-badge-gold {
                    display: inline-block;
                    background: rgba(184,147,90,0.18);
                    color: var(--st-gold);
                    font-size: 12.5px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    padding: 6px 12px;
                    border-radius: 999px;
                    margin-bottom: 14px;
                }
                .st-premium h3 { font-size: 24px; font-weight: 800; margin: 0 0 10px; }
                .st-premium p { color: rgba(255,255,255,0.72); margin: 0; max-width: 440px; }
                .st-premium-cta {
                    background: var(--st-gold);
                    color: #101216;
                    font-weight: 700;
                    padding: 14px 28px;
                    border-radius: 12px;
                    font-size: 15px;
                    white-space: nowrap;
                }

                /* Language strip */
                .st-langs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    justify-content: center;
                }
                .st-lang-pill {
                    background: var(--st-bg);
                    border: 1px solid var(--st-border);
                    border-radius: 999px;
                    padding: 8px 16px;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: var(--st-ink);
                }

                /* Final CTA */
                .st-final {
                    background: var(--st-red);
                    color: #fff;
                    text-align: center;
                    padding: 80px 24px;
                }
                .st-final h2 { font-size: 30px; font-weight: 800; margin: 0 0 14px; }
                .st-final p { color: rgba(255,255,255,0.9); margin: 0 0 32px; }
                .st-final .st-cta-row { justify-content: center; }

                /* Legal */
                .st-legal {
                    padding: 60px 24px;
                    background: var(--st-cream, #fdf8f0);
                }
                .st-legal h2 { font-size: 26px; font-weight: 800; margin: 0 0 20px; color: var(--st-ink); }
                .st-legal h3 { font-size: 16px; font-weight: 700; margin: 22px 0 6px; color: var(--st-red); }
                .st-legal p { margin: 0 0 4px; color: var(--st-ink); opacity: .9; line-height: 1.6; }
                .st-legal a { color: var(--st-red); }

                /* Footer */
                .st-footer {
                    background: #101216;
                    color: rgba(255,255,255,0.55);
                    text-align: center;
                    padding: 28px 24px;
                    font-size: 13px;
                }
                .st-footer a { color: rgba(255,255,255,0.8); }
            </style>

            <!-- HERO -->
            <section class="st-hero">
                <div class="st-wrap st-hero-inner">
                    <div class="st-hero-text">
                        <span class="st-cross">
                            <svg viewBox="0 0 24 24" fill="none"><rect x="10" y="3" width="4" height="18" rx="1" fill="#DA291C"/><rect x="3" y="10" width="18" height="4" rx="1" fill="#DA291C"/></svg>
                        </span>
                        <h1>Schweizer Sagen.<br>Echte Wanderwege.<br>Live erzaehlt.</h1>
                        <p class="st-sub">SagaTrail verwandelt jede Wanderung in ein Hoerspiel: Steh an einem echten Schweizer Wanderweg, und die App erzaehlt dir per GPS genau die Sage, die zu diesem Ort gehoert &mdash; in deiner Sprache, im richtigen Moment.</p>
                        <div class="st-cta-row">
                            <a class="st-store-btn" href="<?php echo esc_url($atts['ios_url']); ?>" target="_blank" rel="noopener">
                                <svg viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                                App Store
                            </a>
                            <a class="st-store-btn" href="<?php echo esc_url($atts['android_url']); ?>" target="_blank" rel="noopener">
                                <svg viewBox="0 0 512 512" fill="currentColor"><path d="M325.3 234.3L104.6 13.6c-9.6-9.6-25.6-2.8-25.6 10.6v463.6c0 13.4 16 20.2 25.6 10.6l220.7-220.7c6.2-6.2 6.2-16.2 0-22.4zM370 279l52.1-52.1c11.3-11.3 11.3-29.6 0-40.9L370 133.9 316.8 187.1 370 240.3zm-33.9 78.6L133.6 496.4c4.5 2.5 10.1 2.7 15 .2l211.6-115.3-24.1-23.7zM148.6 15.6c-4.9-2.5-10.5-2.3-15 .2l202.5 138.7 24.1-23.6L148.6 15.6z"/></svg>
                                Google Play
                            </a>
                        </div>
                        <p class="st-hero-note">Kostenlos starten &middot; Kein Konto noetig fuer die erste Wanderung</p>
                    </div>
                    <div class="st-hero-visual">
                        <div class="st-phone">
                            <div class="st-phone-screen">
                                <div class="st-phone-icon">
                                    <svg viewBox="0 0 24 24" fill="none"><path d="M3 18l6-10 4 6 3-4 5 8H3z" fill="#FFFFFF"/></svg>
                                </div>
                                <strong>SagaTrail</strong>
                                <span>Sagen. Wege. Schweiz.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- FEATURES -->
            <section class="st-section alt">
                <div class="st-wrap">
                    <div class="st-eyebrow st-center">Was SagaTrail besonders macht</div>
                    <h2 class="st-h2 st-center">Eine App, die die Schweiz erzaehlt</h2>
                    <p class="st-lead st-center">Kuratierte, historisch verbuergte Sagen treffen auf echte GPS-gefuehrte Wanderrouten &mdash; keine KI-erfundenen Geschichten, sondern echtes Schweizer Kulturerbe.</p>
                    <div class="st-grid">
                        <div class="st-card">
                            <div class="st-card-icon">
                                <svg viewBox="0 0 24 24"><path d="M12 3l9 8h-2v9H5v-9H3l9-8z"/></svg>
                            </div>
                            <h3>Sagen live erzaehlt</h3>
                            <p>Professionell vertonte Sagen starten automatisch, sobald du den passenden Ort auf der Route erreichst.</p>
                        </div>
                        <div class="st-card">
                            <div class="st-card-icon">
                                <svg viewBox="0 0 24 24"><path d="M3 18l6-10 4 6 3-4 5 8H3z"/></svg>
                            </div>
                            <h3>Echte Wanderwege</h3>
                            <p>Routen basieren auf echten Schweizer Wanderwegen &mdash; mit Karte, Hoehenprofil und Schwierigkeitsgrad.</p>
                        </div>
                        <div class="st-card">
                            <div class="st-card-icon">
                                <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
                            </div>
                            <h3>GPS-gesteuerte Navigation</h3>
                            <p>Live-Standort und Sprachhinweise fuehren dich sicher entlang der Route &mdash; auch unterwegs ohne Blick aufs Handy.</p>
                        </div>
                        <div class="st-card">
                            <div class="st-card-icon">
                                <svg viewBox="0 0 24 24"><path d="M12 3a1 1 0 011 1v9.59l2.3-2.3a1 1 0 111.4 1.42l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.42l2.3 2.3V4a1 1 0 011-1zM5 18a1 1 0 011 1v1h12v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2a1 1 0 011-1z"/></svg>
                            </div>
                            <h3>Offline verfuegbar</h3>
                            <p>Sagen, Karten und Audio lassen sich vorab herunterladen &mdash; perfekt fuer Regionen ohne Empfang.</p>
                        </div>
                        <div class="st-card">
                            <div class="st-card-icon">
                                <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.4 6h-3.2a15.8 15.8 0 00-1.6-4.1A8.03 8.03 0 0119.4 8zM12 4c.8 1.1 1.5 2.5 2 4h-4c.5-1.5 1.2-2.9 2-4zM4.3 14a8.1 8.1 0 010-4h3.6a16.6 16.6 0 000 4H4.3zm.9 2h3.2a15.8 15.8 0 001.6 4.1A8.03 8.03 0 015.2 16zm3.2-8H5.2a8.03 8.03 0 014.8-4.1A15.8 15.8 0 008.4 8zM12 20c-.8-1.1-1.5-2.5-2-4h4c-.5 1.5-1.2 2.9-2 4zm2.4-6H9.6a14.6 14.6 0 010-4h4.8a14.6 14.6 0 010 4zm.2 5.9c.7-1.2 1.2-2.6 1.6-4.1h3.2a8.03 8.03 0 01-4.8 4.1zM16.1 14a16.6 16.6 0 000-4h3.6a8.1 8.1 0 010 4h-3.6z"/></svg>
                            </div>
                            <h3>Mehrsprachig</h3>
                            <p>Erlebe die Schweizer Sagenwelt in acht Sprachen &mdash; inklusive Schweizerdeutsch.</p>
                        </div>
                        <div class="st-card">
                            <div class="st-card-icon">
                                <svg viewBox="0 0 24 24"><path d="M12 2l2.4 6.6L21 9l-5 4.5L17.4 21 12 17.3 6.6 21 8 13.5 3 9l6.6-.4z"/></svg>
                            </div>
                            <h3>Fortschritt &amp; Erfolge</h3>
                            <p>Sammle Wanderungen, Schrittzahlen und Abzeichen &mdash; dein persoenliches Sagenbuch der Schweiz.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- HOW IT WORKS -->
            <section class="st-section">
                <div class="st-wrap">
                    <div class="st-eyebrow st-center">So einfach geht's</div>
                    <h2 class="st-h2 st-center">In drei Schritten unterwegs</h2>
                    <p class="st-lead st-center">&nbsp;</p>
                    <div class="st-steps">
                        <div class="st-step">
                            <div class="st-step-num">1</div>
                            <h3>App laden &amp; Kanton waehlen</h3>
                            <p>Waehle deinen Kanton oder lass dir die naechstgelegene Sage in deiner Umgebung vorschlagen.</p>
                        </div>
                        <div class="st-step">
                            <div class="st-step-num">2</div>
                            <h3>Route starten</h3>
                            <p>Folge der Karte zum Wanderweg &mdash; SagaTrail zeigt dir Distanz und Richtung zum Ausgangspunkt.</p>
                        </div>
                        <div class="st-step">
                            <div class="st-step-num">3</div>
                            <h3>Sage geniessen</h3>
                            <p>Sobald du am richtigen Ort bist, startet die Erzaehlung automatisch &mdash; ganz freihaendig.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PREMIUM -->
            <section class="st-section alt">
                <div class="st-wrap">
                    <div class="st-premium">
                        <div class="st-premium-text">
                            <span class="st-badge-gold">SagaTrail Premium</span>
                            <h3>Alle Kantone, alle Sagen, ohne Limit</h3>
                            <p>Mit Premium schaltest du saemtliche Sagenpakete, Offline-Karten und exklusive Routen in allen 26 Kantonen frei.</p>
                        </div>
                        <a class="st-premium-cta" href="<?php echo esc_url($atts['ios_url']); ?>" target="_blank" rel="noopener">Jetzt entdecken</a>
                    </div>
                </div>
            </section>

            <!-- LANGUAGES -->
            <section class="st-section">
                <div class="st-wrap">
                    <div class="st-eyebrow st-center">Fuer die ganze Schweiz</div>
                    <h2 class="st-h2 st-center">Verfuegbar in 8 Sprachen</h2>
                    <p class="st-lead st-center">&nbsp;</p>
                    <div class="st-langs">
                        <span class="st-lang-pill">Deutsch</span>
                        <span class="st-lang-pill">Schweizerdeutsch</span>
                        <span class="st-lang-pill">Franzoesisch</span>
                        <span class="st-lang-pill">Italienisch</span>
                        <span class="st-lang-pill">Raetoromanisch</span>
                        <span class="st-lang-pill">Englisch</span>
                        <span class="st-lang-pill">Spanisch</span>
                        <span class="st-lang-pill">Portugiesisch</span>
                    </div>
                </div>
            </section>

            <!-- FINAL CTA -->
            <section class="st-final">
                <div class="st-wrap">
                    <h2>Bereit fuer deine erste Sage?</h2>
                    <p>Lade SagaTrail kostenlos herunter und entdecke die Schweiz neu.</p>
                    <div class="st-cta-row">
                        <a class="st-store-btn" href="<?php echo esc_url($atts['ios_url']); ?>" target="_blank" rel="noopener">
                            <svg viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                            App Store
                        </a>
                        <a class="st-store-btn" href="<?php echo esc_url($atts['android_url']); ?>" target="_blank" rel="noopener">
                            <svg viewBox="0 0 512 512" fill="currentColor"><path d="M325.3 234.3L104.6 13.6c-9.6-9.6-25.6-2.8-25.6 10.6v463.6c0 13.4 16 20.2 25.6 10.6l220.7-220.7c6.2-6.2 6.2-16.2 0-22.4zM370 279l52.1-52.1c11.3-11.3 11.3-29.6 0-40.9L370 133.9 316.8 187.1 370 240.3zm-33.9 78.6L133.6 496.4c4.5 2.5 10.1 2.7 15 .2l211.6-115.3-24.1-23.7zM148.6 15.6c-4.9-2.5-10.5-2.3-15 .2l202.5 138.7 24.1-23.6L148.6 15.6z"/></svg>
                            Google Play
                        </a>
                    </div>
                </div>
            </section>

            <!-- DATENSCHUTZ -->
            <section class="st-legal" id="datenschutz">
                <div class="st-wrap">
                    <h2>Datenschutz</h2>

                    <h3>Welche Daten wir erheben</h3>
                    <p>SagaTrail verarbeitet Standortdaten (nur waehrend einer aktiven Wanderung), dein Profil (Name, Archetyp, Heimatkanton, Sprache, Altersstufe) sowie deinen Story-Fortschritt und freigeschaltete Sammlungen.</p>

                    <h3>Wo die Daten liegen</h3>
                    <p>Alle Daten werden ausschliesslich lokal auf deinem Geraet gespeichert bzw. sicher mit deinem Konto synchronisiert, wenn du eingeloggt bist. Du kannst deine Daten jederzeit in den Einstellungen exportieren oder vollstaendig loeschen.</p>

                    <h3>Standort</h3>
                    <p>Der Standort wird nur genutzt, um Erzaehlmomente an den passenden Wegpunkten auszuloesen. Du kannst die Berechtigung jederzeit im Betriebssystem widerrufen; die App funktioniert dann mit eingeschraenkter Funktionalitaet weiter.</p>

                    <h3>Kinder</h3>
                    <p>Fuer die Altersstufe Kinder ist die Bestaetigung einer erziehungsberechtigten Person erforderlich. Inhalte werden altersgerecht entschaerft.</p>

                    <h3>Kontakt</h3>
                    <p>Bei Fragen zum Datenschutz erreichst du uns unter <a href="mailto:info@inster.abb">info@inster.abb</a>.</p>

                    <p style="opacity:.7;font-size:.9em;margin-top:24px;">Hinweis: Dieser Text wird demnaechst ueberarbeitet und aktualisiert.</p>
                </div>
            </section>

            <footer class="st-footer">
                &copy; <?php echo esc_html(date('Y')); ?> SagaTrail &middot; <a href="#datenschutz">Datenschutz</a> &middot; <a href="mailto:info@inster.abb">info@inster.abb</a>
            </footer>
        </div>
        <?php
        return ob_get_clean();
    }
    add_shortcode('sagatrail_landing', 'sagatrail_landing_shortcode');
}
