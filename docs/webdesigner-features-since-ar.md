# SagaTrail – Feature-Briefing für Webdesigner

## Zweck dieses Dokuments

Dieses Dokument beschreibt die sichtbaren SagaTrail-Funktionen, die seit der
Einführung der AR- und Terrain-Ansichten hinzugekommen oder wesentlich
erweitert worden sind.

Es ist als Übergabe an Webdesigner gedacht. Beschrieben werden daher vor allem:

- welche Screens und UI-Bereiche existieren,
- welche Informationen dort sichtbar sind,
- welche Zustände gestaltet werden müssen,
- welche Unterschiede zwischen Web, iPhone, Android, Apple Watch und Garmin
  gelten,
- welche Aussagen die Oberfläche aus Datenschutz- und Sicherheitsgründen nicht
  machen darf.

Die Oberfläche soll SagaTrail als **Schweizer Wander-App mit echten Routen,
kuratierten Sagen, Live-Navigation und verantwortungsvollen Sicherheitsfunktionen**
erkennbar machen. Die App soll nicht wie ein generischer Karten- oder
Fitness-Tracker wirken.

---

## 1. Grundprinzipien der Produktdarstellung

### Das Telefon bleibt autoritativ

Das iPhone beziehungsweise Android-Telefon ist die zentrale Instanz für:

- GPS und GPS-Frische,
- aktive Route und Navigation,
- Kapitel- und Erzählfortschritt,
- Sicherheitsstatus und SOS,
- den verbindlichen Wanderstatus.

Watch-Oberflächen sind Begleiter. Sie dürfen nie den Eindruck erwecken, dass
die Watch eine unabhängig laufende zweite Navigation mit eigener
Standortwahrheit ist.

### Keine simulierten Live-Daten

Wenn GPS, Netzwerk, Watch-Verbindung oder Sensorwerte veraltet sind, muss die
Oberfläche das sichtbar machen. Ein alter Wert darf nicht wie ein aktueller
Live-Wert aussehen.

Benötigte Zustände:

- wird geladen,
- aktuell,
- teilweise verfügbar,
- veraltet,
- nicht verbunden,
- keine Berechtigung,
- offline,
- Fehler mit erneutem Versuch,
- noch keine Daten.

### Echte Inhalte statt generischer Platzhalter

Sagen stammen aus kuratierten gemeinfreien Quellen. Routen stammen aus dem
Schweizer Wander- und OSM-/swisstopo-Umfeld. Die Oberfläche soll Quellen,
Herkunft und Unsicherheiten verständlich behandeln und keine künstliche
Gewissheit suggerieren.

### Sprache und Darstellung

Die App-Oberfläche und die Erzählung sind getrennte Ebenen. Die Sprache der
Navigation, Buttons, Zustände und Systemhinweise kann unabhängig von der
Sprache einer Erzählung betrachtet werden. Alle UI-Flächen müssen für lange
deutsche, französische und italienische Texte funktionieren.

---

## 2. Startseite, Kantone und Katalog

### Startseite

Die Startseite ist der Einstieg in die Schweizer Wanderwelt. Sie soll:

- die Auswahl eines Kantons ermöglichen,
- gespeicherte oder zuletzt verwendete Inhalte sichtbar machen,
- den Einstieg in die Sammlung anbieten,
- Premium- und Sagenpakete verständlich, aber nicht aufdringlich zeigen,
- eine eigene Route als separaten Einstieg anbieten.

### Kanton-Auswahl

Alle 26 Schweizer Kantone sind auswählbar. Der Kanton wird visuell über Name,
Kürzel und Wappen beziehungsweise regionale Identität vermittelt.

Zu gestalten sind:

- Kanton-Liste oder Kanton-Raster,
- Ladezustand beim Nachladen der Routen,
- leerer Kanton,
- Netzwerkfehler,
- Premium-Sperre für nicht freigeschaltete Kantone,
- Heimatkanton als kostenloser Einstieg,
- bereits gekaufte Kantonspakete,
- Pack-Fortschritt, zum Beispiel `x/1` standardmässig und `x/9` bei einem
  erweiterten Sagenpaket.

### Dynamischer Routenkatalog

Routen werden kantonsweise online geladen. Es gibt **keinen ehrlichen
Offline-Ersatz für fehlende Routen**. Wenn der Abruf fehlschlägt, muss die
Oberfläche einen klaren Fehlerzustand zeigen und darf keine erfundene Route
anzeigen.

Wichtige Filter und Informationen:

- Distanz,
- Höhenmeter,
- SAC-Schwierigkeit T1–T6,
- unbekannte Schwierigkeit,
- Routenart beziehungsweise offizielles Wanderland-Label,
- Startkanton,
- Etappenbezeichnung,
- saisonale Eignung,
- Familien-, Hunde- und Barrierefreiheitsinformationen, sofern bestätigt.

Bei einem eingeschränkten T1–T6-Filter werden Routen mit unbekannter
Schwierigkeit bewusst nicht als scheinbar passende Schwierigkeit einsortiert.
Der leere Zustand soll erklären, dass der Filter erweitert werden muss.

---

## 3. Routendetail und Sagenzuordnung

### Routendetail-Screen

Der Routendetail-Screen verbindet die sachliche Tourinformation mit dem
erzählerischen Einstieg.

Darzustellen sind:

- Routentitel und offizielles Logo, falls vorhanden,
- Start und Ziel,
- Distanz,
- Höhenmeter bergauf,
- geschätzte Dauer,
- SAC-Schwierigkeit oder „unbekannt“,
- Höhenprofil,
- saisonaler Hinweis,
- Wetter und abgeleitete Wegzustandsinformation,
- Karte mit Routenlinie,
- verfügbare Sagen- oder Kapitelinformation,
- Einstieg in die Wanderung,
- Download- beziehungsweise Offline-Option,
- Premium-Sperre, wenn der Inhalt nicht freigeschaltet ist.

Offizielle Routendaten und berechnete Geometriedaten können unterschiedliche
Werte liefern. Offizielle Distanz- oder Höhenmeter-Tags haben Vorrang in der
redaktionellen Anzeige; die Geometrie wird für Karte und Navigation verwendet.

### Sagenzuordnung

Eine Route erhält die nächstgelegene kuratierte Sage der Region. Es werden
keine frei erfundenen Sagen pro Route als Tatsachen dargestellt.

Die Sagenansicht braucht:

- Titel und regionale Einordnung,
- Quellenhinweis,
- Sprache,
- Inhaltsvorschau,
- Altersstufe,
- Erzählstil,
- Kapitelübersicht,
- Start der Wanderung mit dieser Sage.

---

## 4. Erzählung, Audio und Kapitel

### Live-Erzählung

Während der Wanderung wird die Geschichte Kapitel für Kapitel entlang des
Weges erzählt. Die Erzählung ist für eine Nutzung ohne dauernden Blick auf das
Telefon ausgelegt.

Die UI muss zeigen können:

- aktuelles Kapitel,
- nächstes Kapitel,
- Fortschritt,
- Wiedergabe,
- Pause,
- erneutes Abspielen,
- Audio wird geladen,
- Audio nicht verfügbar,
- Text als Fallback,
- Sprache und Erzählstil.

### Audio-Kanäle

Erzählung und Navigationshinweise teilen sich einen exklusiven hörbaren Kanal.
Wenn ein Navigationshinweis kommt, darf nicht gleichzeitig eine zweite
Sprachspur konkurrieren. Beim Routenwechsel wird die laufende Audiowiedergabe
vollständig beendet, bevor die neue Route beginnt.

### Entscheidungsstellen

An bestimmten Stellen kann die Nutzerin oder der Nutzer die Wahrnehmung der
Geschichte beeinflussen. Diese Entscheidungen müssen als eigenständiger
Interaktionszustand gestaltet werden:

- Entscheidung wird angezeigt,
- GPS-Fortschritt ist während der offenen Entscheidung angehalten,
- Antwort per Tippen,
- Antwort per Sprache, sofern verfügbar,
- Sprachberechtigung fehlt,
- Spracheingabe wurde nicht verstanden,
- bestätigte Antwort,
- Audio-Bestätigung nach der Auswahl.

Die Sprachbedienung ist eine Ergänzung. Die gesamte Funktion muss auch mit
Buttons nutzbar sein.

### Navigation bleibt getrennt von der Sage

Abbiegehinweise, Richtungswechsel und Sicherheitswarnungen sind keine
Erzählkapitel. Sie brauchen eigene visuelle und akustische Priorität.

---

## 5. Aktive Wanderung

Der Hike-Screen ist der wichtigste Live-Screen der App.

### Hauptinformationen

- aktuelle Route,
- aktuelles Kapitel,
- nächste Navigationsanweisung,
- Entfernung bis zur nächsten Anweisung,
- verbleibende Distanz,
- Höhenmeter,
- vergangene Zeit,
- Schritte,
- aktuelle Steigung beziehungsweise Geländeabschnitt,
- GPS-Frische,
- Audio- und Erzählstatus,
- Sicherheitsstatus.

### Startmodi

Wenn sich die Nutzerin oder der Nutzer nicht am offiziellen Routenstart
befindet, kann die App eine Startumleitung oder einen Weg zum Start anbieten.
Die UI muss klar unterscheiden zwischen:

- direktem Start auf der Route,
- Weg zum offiziellen Start,
- Umleitung akzeptiert,
- Umleitung wird berechnet,
- Rückkehr zur offiziellen Route,
- Route noch nicht gestartet.

Die Neuberechnung darf nicht sichtbar starten, bevor der Startmodus eindeutig
gewählt wurde.

### GPS-Sicherheitszustand

Bei fehlendem oder zu altem GPS müssen mindestens folgende Funktionen pausieren
oder als nicht aktuell markiert werden:

- Kapitel-Fortschritt,
- POI-Auslösung,
- Abbiegehinweise,
- Geländeerzählung,
- Live-Standortdarstellung.

Die Oberfläche soll statt eines scheinbar aktuellen Punktes eine klare
Meldung wie „GPS-Signal veraltet“ oder „Warte auf Standort“ zeigen.

---

## 6. Kartenansicht und Layer

Die Karte besteht aus einer Grundkarte und mehreren unabhängigen Layern.
Designer sollen diese Ebenen visuell unterscheidbar halten.

### Grundkarte und Route

- Grundkarte,
- offizielle oder geladene Routenlinie,
- aktive Navigation,
- Startpunkt,
- Zielfahne,
- aktueller Standort,
- Kartenlegende,
- Vollbildkarte,
- Rotation und Größenänderung,
- Karten-Ladezustand.

### Dynamische Layer

Je nach Route und Datenlage können sichtbar sein:

- allgemeine POIs,
- Sicherheits-POIs,
- benannte Gipfel,
- SAC-Hütten,
- Parkplätze,
- Trinkwasserstellen,
- ÖV-Stationen und Rückreiseverbindungen,
- Seilbahnen,
- Partnerbetriebe,
- offizielle regionale Routenlogos.

Jeder Layer braucht mindestens die Zustände „wird geladen“, „Daten
vorhanden“, „keine Daten“ und „Fehler“. Ein leerer Layer darf nicht wie ein
technischer Defekt aussehen.

### Kartenkachel-Fehler

Einzelne Hintergrundkacheln können beim Kartenanbieter fehlerhaft aus dem
Cache kommen. Die App lädt sie nach Abschluss von Route, Fahnen, POIs und
Sicherheits-POIs nochmals mit einer Cache-Umgehung nach.

Für das Design bedeutet das:

- keine sichtbare Ersatzkarte von einem anderen Anbieter einblenden,
- keine schwarze oder graue Ersatzfläche als dauerhaftes Kartenfeature
  gestalten,
- Kartenfehler lokal und unaufdringlich behandeln,
- die Kartenansicht nicht bei jedem Layer-Update komplett neu laden.

---

## 7. Gipfelpanorama, Terrain und AR

### Gipfelpanorama

Das Panorama ist eine 360-Grad-Horizontansicht, keine zweite normale
Kartenansicht.

Funktionen:

- aktueller Kompasskurs als initiale Blickrichtung,
- horizontales Wischen über den gesamten Horizont,
- benannte Gipfel,
- Distanz und Richtung,
- perspektivische Bergflächen,
- Tiefenstaffelung,
- Berühren eines Gipfels für Details,
- Übergang in die AR-Ansicht.

Alle benannten Gipfel sollen im Panorama grundsätzlich auffindbar bleiben.
Die initiale Blickrichtung darf nicht die einzigen sichtbaren Gipfel
bestimmen.

### Lokales Terrainmodell

Das lokale Terrain basiert auf Schweizer Höhen- und Kartendaten. Es darf:

- Geländeformen verständlich machen,
- Gipfel räumlich einordnen,
- Routen in die Landschaft projizieren,
- belegte Geländeverdeckung darstellen.

Es darf nicht:

- fehlende Höhenwerte erfinden,
- unbekannte Bereiche künstlich verdecken,
- ein rotes oder cyanfarbenes abstraktes Rechteck als „Berg“ zeigen,
- ein Routenprofil als vollständiges Umgebungs-Terrain missverstehen.

Wenn Terrainabdeckung oder Beobachterhöhe fehlen, wird die Unsicherheit
angezeigt oder die Verdeckung weggelassen. Fehlende Daten werden nie als
„keine Berge“ interpretiert.

### AR-Ansicht

Die AR-Ansicht verwendet die Kamera mit Gravity-and-Heading-Ausrichtung.
Sie braucht:

- Kameraansicht,
- Gelände beziehungsweise Gipfelmarker,
- Route im Gelände,
- aktuelle Position,
- Zielmarkierung,
- Bergname und Distanz,
- klare Zurück-Navigation,
- Berechtigungszustand,
- fehlende Sensor- oder GPS-Daten,
- Ladezustand des Terrainmodells.

Die AR-Route:

- zeigt die gesamte aktive Route,
- nutzt die aktuelle Navigationsgeometrie inklusive akzeptierter Startumleitung,
- färbt Steigungen nach den bekannten Bändern,
- nutzt grün, gelb, orange und rot für ansteigende absolute Steigung,
- komprimiert die weit entfernten Abschnitte für eine lesbare AR-Darstellung,
- endet mit einer dauerhaft sichtbaren Zielfahne,
- verwendet unter den farbigen Abschnitten eine zusammenhängende Mittellinie.

Die Zielfahne ist eine schwarz-weisse Zielflagge und kein roter Platzhalter.
Die AR-Ansicht hat absichtlich kein zentrales Fadenkreuz.

### Web-Fallback

Auf der Weboberfläche gibt es keine echte native AR-Kamera. Dafür müssen
verständliche Fallbacks gestaltet werden:

- interaktive Panoramaansicht,
- Terrainkarte,
- Gipfelliste,
- Route-Terrain-Ansicht,
- Hinweis „AR auf iPhone oder Android öffnen“,
- fehlende Sensorberechtigungen nur auf nativen Geräten erklären.

---

## 8. POIs, Gipfel und Entdeckungen

### POI-Detailkarte

Ein POI kann als Marker, automatisch geöffnete Kachel oder Detailansicht
erscheinen. Die Detailansicht kann enthalten:

- Name,
- Kategorie,
- Distanz,
- Kurzbeschreibung,
- Bild,
- Quellenhinweis,
- Öffnungszeiten,
- Partnerkennzeichnung,
- Navigation zum POI,
- „gesehen“ beziehungsweise Sammlung.

### Annäherungslogik

Automatisch geöffnete POI-Kacheln sollen nicht bei jedem GPS-Rauschen
auf- und zuklappen. Sie schließen erst nach mehreren klaren
Entfernungszunahmen. Ein kurzer GPS-Sprung darf die Kachel nicht sofort
entfernen.

### Gipfel außerhalb des Standard-POI-Flows

Benannte Gipfel werden im Panorama separat und bei Bedarf verzögert geladen.
Sie sind nicht einfach ein weiterer kleiner Karten-POI. Die UI soll sie als
Landschafts- und Orientierungsinformation behandeln.

---

## 9. Wetter, Wegzustand, ÖV und Infrastruktur

Auf Route und aktivem Hike können zusätzliche Kontextkarten erscheinen:

- aktuelles Wetter,
- Temperatur,
- Wind,
- Niederschlag,
- Sturmhinweis,
- Sonnenuntergang,
- Ankunft nach Sonnenuntergang,
- abgeleitete Wegzustandseinschätzung,
- Saison-Hinweis,
- Rückreise mit öffentlichen Verkehrsmitteln,
- nahe Haltestellen,
- Abfahrten,
- Hütten und Öffnungszeiten,
- Parkplätze,
- Trinkwasser.

Wegzustand und Saison sind abgeleitete Einschätzungen. Die Oberfläche darf
nicht behaupten, damit eine offizielle Sperrung, Lawinenwarnung oder
Rettungsfreigabe darzustellen. Ein Link zu offiziellen Warnquellen soll
visuell möglich bleiben.

Bei ÖV-Daten müssen mindestens diese Zustände sichtbar sein:

- Verbindung gefunden,
- mehrere Abfahrten,
- keine Verbindung,
- Daten veraltet,
- Dienst nicht erreichbar.

---

## 10. Offline-Funktionen

### Offline-fähig

Die App kann ausgewählte Inhalte für unterwegs speichern:

- Sagen und Kapitel,
- relevante Sprachausgabe,
- begrenzter Kartenkorridor,
- bestimmte lokale Daten.

### Nicht pauschal offline-fähig

Routen werden dynamisch pro Kanton geladen und haben keinen eingebauten
Routen-Seed als stille Ersatzquelle. Kartendaten und Live-Funktionen können
eine Verbindung benötigen.

Die Download-Oberfläche muss deshalb konkret zeigen:

- Story erfolgreich gespeichert,
- Kartenkorridor erfolgreich gespeichert,
- wie viel Speicher verwendet wird,
- welche Bausteine fehlen,
- Download läuft,
- Download pausiert,
- Download fehlgeschlagen,
- Download löschen,
- online erforderlich.

Auf der Weboberfläche sind native Dateisystem-Downloads für Offline-Karten
nicht verfügbar. Dort muss ein ehrlicher Hinweis erscheinen, statt eine
scheinbar vollständige Offline-Funktion zu simulieren.

---

## 11. Sicherheit, SOS und Sicherheitslinks

### SOS

Der SOS-Bereich muss eine deutliche, aber nicht unnötig alarmierende
Bestätigung enthalten. Ein versehentlicher Tap darf nicht sofort als
erfolgreicher Notruf dargestellt werden.

Mögliche Zustände:

- SOS bereit,
- Bestätigung erforderlich,
- Nachricht beziehungsweise Notruf wird vorbereitet,
- versendet,
- vom Telefon bestätigt,
- fehlgeschlagen,
- keine Verbindung,
- Notrufnummern und Kontaktoptionen.

Die App unterstützt je nach Plattform und Konfiguration Rega 1414,
europäischen Notruf 112 und einen Notfallkontakt. Die Oberfläche muss
erklären, was tatsächlich ausgelöst wurde.

### Temporäre Sicherheitslinks

Sicherheitslinks sind zeitlich begrenzte, nicht erratbare Links für eine
vertrauenswürdige Kontaktperson.

Ein öffentlicher Status darf nur zeigen:

- Route,
- Sicherheitsstatus,
- Ablaufzeit,
- letzten frischen Standort,
- ob der Standort aktuell, veraltet oder nicht verfügbar ist.

Er darf nicht zeigen:

- Kontoidentität,
- vollständige Standort-Historie,
- alte Standorte als aktuelle Position,
- unbeschränkte Route des gesamten Nutzerkontos.

Benötigte Ansichten:

- Link erstellen,
- Link teilen,
- aktiver Link,
- letzter Standort,
- Standort veraltet,
- Link abgelaufen,
- Link widerrufen,
- alte Standortdaten nach Ablauf löschen.

### Sicherheits-Check-in

Der Sicherheits-Check-in unterstützt Zeiträume wie 30, 60 oder 120 Minuten.
Die UI muss Start, verbleibende Zeit, Verlängerung, Bestätigung und Ablauf
unterscheiden.

### Gruppenwanderung

Gruppenstandorte sind ausdrückliche Opt-in-Daten. Die Oberfläche braucht:

- Gruppe erstellen,
- Beitrittscode beziehungsweise Einladung,
- Leader-Status,
- Mitgliederliste,
- Standortfreigabe ein/aus,
- freigegebene Mitgliederpositionen,
- Standort nicht verfügbar,
- Gruppe verlassen,
- Synchronisationsfehler.

Standortfreigabe ist im aktuellen Modell auf die aktive Vordergrundnutzung
ausgerichtet und muss jederzeit löschbar sein.

---

## 12. Apple-Watch-Begleiter

Die Apple Watch ist eine eingebettete Begleit-App der SagaTrail-iPhone-App.

### Sichtbare Inhalte

- Routennamen,
- nächste Navigationsanweisung,
- Entfernung bis zur Anweisung,
- Distanz,
- Höhenmeter,
- Dauer,
- Schritte,
- Herzfrequenz aus HealthKit,
- aktueller Wanderstatus,
- Verbindungsstatus,
- veralteter Status,
- SOS-Bestätigung.

Die Watch kann einen begrenzten, vereinfachten Routenkontext und den aktuellen
Punkt erhalten, aber nur bei frischem GPS. POI- und Sicherheitslink-Koordinaten
werden nicht an die Watch weitergegeben.

### Zustände

- iPhone verbunden,
- iPhone nicht verbunden,
- Daten aktuell,
- Daten älter als 45 Sekunden,
- HealthKit-Berechtigung ausstehend,
- HealthKit nicht erlaubt,
- Herzfrequenz aktuell,
- Herzfrequenz nicht verfügbar,
- SOS-Bestätigung ausstehend,
- SOS vom Telefon bestätigt,
- SOS fehlgeschlagen.

Die Watch darf keine eigene GPS-Wahrheit oder scheinbar aktuelle Position
anzeigen, wenn die Verbindung oder GPS-Frische fehlt.

---

## 13. Garmin-Begleiter

Garmin ist ein eigenständiger Connect-IQ-Watch-MVP. Die Datenübertragung ist
bewusst koordinatenfrei.

### Sichtbare Inhalte

- nächste Richtung,
- Entfernung bis zur nächsten Anweisung,
- bis zu drei kommende Abbiegehinweise,
- aktuelles Gelände beziehungsweise Steigungsabschnitt,
- Off-Route-Hinweis ohne Position,
- Wetter,
- Sonnenuntergangs- und Dunkelheitshinweis,
- vergangene Zeit,
- Distanz,
- Höhenmeter,
- verbleibende Route,
- Schritte,
- lokale Herzfrequenz,
- Sicherheits-Check-in,
- kurze Sicherheits- und Erzählhinweise,
- Verbindungs- und Datenfrische.

### Garmin-Sicherheitsregeln

Garmin erhält und speichert:

- keine Rohkoordinaten,
- keine Geometrie,
- keine Standort-Historie.

SOS wird erst nach einer bewussten zweiten Bestätigung ausgelöst. Eine
erfolgreiche Übertragung zur Uhr ist noch keine bestätigte SOS-Zustellung.

Wenn Garmin Connect Mobile, das Gerät oder die Verbindung fehlen, muss die
Oberfläche klar „Companion erforderlich“ beziehungsweise „nicht verbunden“
zeigen und darf SOS nicht als erfolgreich anbieten.

---

## 14. Premium, Kantonspakete und Empfehlungen

### Premium

Die Premium-Oberfläche soll verständlich erklären:

- welcher Inhalt kostenlos ist,
- welcher Kanton beziehungsweise welches Paket gesperrt ist,
- was ein Kauf freischaltet,
- ob ein Kauf bereits aktiv ist,
- Wiederherstellung von Käufen,
- laufendes Laden,
- bereits abonniert,
- Kauf fehlgeschlagen,
- Kauf wird wiederhergestellt.

Ein aktives Premium-Konto darf nicht durch einen fehlenden oder verspäteten
Store-Status wieder gesperrt werden.

### Kantonspakete

Kantonspakete werden über das Profil beziehungsweise den Kaufstatus
freigeschaltet. Die UI soll nicht nur ein Store-Abonnement anzeigen, sondern
den tatsächlich verfügbaren Inhalt klar markieren.

### Empfehlungen und Referral

Die Referral-Funktion umfasst:

- persönlichen Einladungscode,
- Einladung teilen,
- ausstehende Belohnung,
- Belohnung nach qualifiziertem Kauf,
- Belohnung abholen,
- bereits abgeholt,
- keine Berechtigung,
- Fehler und erneuter Versuch.

---

## 15. Foto-basierte Objekterkennung

Die Objekterkennung ist eine Premium-Funktion und wird bewusst auf Anfrage
gestartet.

Die UI braucht:

- Kamera- oder Fotoauswahl,
- Einwilligungs- beziehungsweise Premium-Hinweis,
- Analyse läuft,
- Treffer mit Konfidenz oder vorsichtiger Formulierung,
- mehrere mögliche Treffer,
- Treffer bestätigen,
- Ergebnis verwerfen,
- kein Ergebnis,
- Analyse fehlgeschlagen,
- erneuter Versuch.

Die App darf einen Treffer nicht als sichere Tatsache präsentieren, wenn die
Erkennung nur eine Vermutung liefert. Ortskontext darf nur aus tatsächlich
nahen Live-POIs im relevanten Radius stammen.

---

## 16. Sammlung, Rückblick und Teilen

### Sammlung

Die Sammlung zeigt:

- entdeckte Sagen,
- abgeschlossene Routen,
- freigeschaltete Kapitel,
- Erfolge,
- persönliche Medien beziehungsweise Journalinhalte,
- Sprach- und Fortschrittsstatus.

### Hike Summary

Nach einer Wanderung können sichtbar sein:

- Route,
- Zeit,
- Distanz,
- Höhenmeter,
- Schritte,
- Kapitel,
- Entscheidungen,
- Entdeckungen,
- Erfolge,
- Sicherheits- beziehungsweise Abschlussstatus,
- Teilen.

### Share Card

Eine Share Card darf die Wanderung atmosphärisch darstellen, muss aber
private Sicherheitsdaten schützen. Keine Tokens, privaten Sicherheitslinks,
präzisen sensiblen Live-Standorte oder vollständigen Standort-Historien
automatisch teilen.

---

## 17. Konto, Einstellungen und Berechtigungen

Zu gestalten sind:

- Anmeldung,
- Registrierung,
- Passwort vergessen,
- Profil,
- Sprache,
- Hell-/Dunkelmodus,
- Audio- und Erzählpräferenzen,
- Altersstufe,
- Benachrichtigungen,
- Standortberechtigung,
- Mikrofonberechtigung,
- HealthKit-Berechtigung,
- Kamera-Berechtigung,
- Apple-Watch-Status,
- Garmin-Geräteauswahl,
- Käufe wiederherstellen,
- Datenschutz,
- Konto löschen,
- Abmelden.

Berechtigungen werden zuerst im SagaTrail-Design erklärt und erst danach dem
nativen Betriebssystemdialog überlassen. Die Web-Version braucht jeweils eine
verständliche Erklärung, wenn eine native Berechtigung nicht verfügbar ist.

---

## 18. Responsive und plattformspezifische Anforderungen

### Mobile Web

- Bedienung mit Daumen,
- große primäre Aktionen,
- keine wichtigen Informationen nur über Hover,
- Karten und Bottom Sheets müssen kleine Bildschirme berücksichtigen,
- Safe Areas für Statusleiste und Home Indicator,
- kurze Statusmeldungen,
- lange Orts- und Routennamen umbrechen lassen.

### Desktop Web

- Karten- und Detailansicht können nebeneinander stehen,
- Kapitel- und Audioinformationen dürfen als Seitenpanel erscheinen,
- Filter sollen dauerhaft auffindbar sein,
- keine reine Mobile-Vergrösserung,
- Tastaturfokus und sichtbare Fokuszustände.

### Native iOS und Android

- Berechtigungen und Sensorzustände,
- Vollbildkarte,
- native Audioausgabe,
- AR und Terrain,
- Hintergrund-GPS,
- Apple Watch beziehungsweise Garmin.

### Web-Fallbacks

Web darf keine nativen Funktionen vortäuschen. Stattdessen:

- AR → Panorama/Terrain-Ansicht,
- HealthKit → Hinweis auf Apple Watch,
- Watch-Verbindung → Installations- oder Gerätehinweis,
- native Offline-Karten → Online-Kartenstatus,
- Hintergrund-GPS → Browser-Berechtigungs- und Frischehinweis.

---

## 19. Design- und Textregeln

1. **Live ist nur live, wenn die Daten frisch sind.**
2. **Unbekannt bleibt unbekannt.** Keine erfundene Schwierigkeit, Höhe,
   Position oder Erkennungsgewissheit.
3. **SOS ist nicht automatisch erfolgreich**, nur weil eine Nachricht an eine
   andere Komponente übergeben wurde.
4. **Offline ist funktionsbezogen.** Story-Download und Kartenkorridor können
   unterschiedliche Zustände haben.
5. **Telefon und Watch sind keine zwei unabhängigen Navigationssysteme.**
6. **Sagen, Navigation und Sicherheitsmeldungen brauchen unterschiedliche
   visuelle Prioritäten.**
7. **Karte, Route, POIs und Sicherheitslayer müssen getrennt erkennbar sein.**
8. **Jede Netzwerkfunktion braucht einen sichtbaren Fehler- und Leerzustand.**
9. **Keine Screens mit simulierten Koordinaten oder erfundenen Live-Werten.**
10. **Datenschutz ist Teil der Darstellung, nicht nur ein Rechtstext.**

---

## 20. Übergabe-Checkliste für Webdesign

Vor der Umsetzung sollten für jeden Screen mindestens diese Varianten
vorliegen:

- Normalzustand,
- Loading,
- leer,
- Fehler,
- offline,
- veraltet,
- gesperrt/Premium,
- Berechtigung fehlt,
- erfolgreiche Aktion,
- Abbruch oder erneuter Versuch.

Zusätzlich prüfen:

- deutsche, englische, französische und italienische Texte,
- kleine mobile Breite,
- Desktop-Breite,
- dunkles und helles Theme,
- große Schrift beziehungsweise Dynamic Type,
- Tastatur- und Screenreader-Fokus,
- sichere Darstellung von SOS und Standortdaten,
- keine Darstellung alter GPS-Daten als live,
- keine Anzeige von Watch- oder Garmin-Funktionen, wenn das Gerät nicht
  verbunden oder die Funktion auf der Plattform nicht verfügbar ist.
