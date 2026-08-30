import { createRequire } from "node:module";
import type { InsertCatalogSaga } from "@workspace/db";

const _r = createRequire(import.meta.url);
const bundledSagas: InsertCatalogSaga[] = _r("./curatedSagas.json");

/**
 * Redaktionelle Ersatztexte für zwei falsch zugeordnete Solothurn-Einträge.
 * Die bestehenden IDs bleiben erhalten, damit gespeicherte Routen und
 * Nutzerfortschritte weiterhin auf dieselben Sagen zeigen.
 */
const REPLACEMENTS: Record<string, Partial<InsertCatalogSaga>> = {
  "die-beute-von-grandson-solot": {
    title: "Das versteckte Kreuz am Zeitglockenturm",
    canton: "Solothurn",
    coreMotif: "Dankbarkeit bewahrt ein Wunder als geheimes Zeichen",
    bildmotiv: "Zeitglockenturm Solothurn, eingemeißeltes Kreuz, Marktplatz",
    summary:
      "Der genaue Ort: Die Südfassade des Zeitglockenturms beim Marktplatz in der Stadt Solothurn. Wenn man genau hinsieht, erkennt man dort bis heute ein kleines, eingemeißeltes Kreuz im Mauerwerk. Während des Baus des Solothurner Zeitglockenturms im Mittelalter arbeitete ein junger, geschickter Steinmetz auf dem höchsten Gerüst. Er war übermütig und wettete mit seinen Kollegen, dass er auf einem schmalen Holzbalken in schwindelerregender Höhe auf einem Bein stehen könne. Doch als er oben auf den Balken trat, verließ ihn das Gleichgewicht. Er rutschte ab und stürzte in die Tiefe. Im Fallen schrie er in Todesangst die heilige Maria um Rettung an. Wie durch ein Wunder verfing sich sein weiter Arbeitskittel an einem herausstehenden Baunagel der Turmwand. Er hing fest, bis seine Kameraden ihn unversehrt bergen konnten. Aus tiefer Dankbarkeit für diese Rettung meißelte der Steinmetz am nächsten Tag an genau der Stelle, an der der Nagel seinen Sturz gebremst hatte, ein kleines Kreuz in den Stein. Das steinerne Kreuz ist an der Südwand des Turms bis heute als stummer Zeuge des Wunders zu sehen.",
    summaries: {
      de: {
        text:
          "Am Zeitglockenturm in Solothurn erinnert ein kleines eingemeißeltes Kreuz an einen Steinmetzen, der beim Sturz vom Gerüst durch seinen Arbeitskittel an einem Baunagel gerettet wurde. Aus Dankbarkeit meißelte er das Kreuz an der Stelle in die Südwand.",
        reviewEmpfohlen: false,
      },
    },
    source:
      "Teil der Sammlungen historischer Stadtsagen, wie sie unter anderem im Solothurner Urkundenbuch oder in alten Dokumenten zur Stadtbefestigung dokumentiert sind",
    lat: 47.20761858138622,
    lng: 7.53691340810709,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Zytglogge_01.jpg/960px-Zytglogge_01.jpg?utm_source=de.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    fotoAttribution: "Wikimedia Commons",
    ortName: "Zeitglockenturm, Solothurn",
  },
  "die-schlacht-bei-st-jakob-an-der-birs-solot": {
    title: "Der Teufelsstein im Bellacher Wald",
    canton: "Solothurn",
    coreMotif: "Ein heiliger Klang vereitelt den teuflischen Plan",
    bildmotiv: "Teufelsstein im Bellacher Wald, Granitfindling, Wald",
    summary:
      "Der genaue Ort: Der riesige Granit-Findling im Wald nördlich von Bellach. Als im Mittelalter in Solothurn die große Kathedrale erbaut werden sollte, geriet der Teufel im fernen Wallis in heftigen Zorn. Er wollte das christliche Werk unbedingt verhindern. In den Walliser Bergen packte er einen tonnenschweren Granitblock, schwang sich in die Lüfte und flog Richtung Norden, um den Stein auf das Fundament der Baustelle zu schleudern und die Stadt zu zerschmettern. Er hatte das Ziel bereits im Visier und setzte über dem Wald von Bellach zum Wurf an, als in Solothurn genau in diesem Moment die Kirchenglocken das abendliche Ave-Maria-Läuten anstimmten. Der heilige Klang raubte dem Teufel augenblicklich seine dämonische Kraft. Der riesige Fels entglitt seinen Klauen, stürzte mit lautem Donnern in den Bellacher Wald und blieb dort tief in der Erde stecken. Der Teufel selbst floh mit Geheul in die Unterwelt, und der mächtige Findling liegt noch heute als „Teufelsstein“ an der Einschlagstelle.",
    summaries: {
      de: {
        text:
          "Der Teufel wollte einen tonnenschweren Granitblock aus dem Wallis auf die Baustelle der Solothurner Kathedrale schleudern. Als in Solothurn die Abendglocken läuteten, verlor er seine Kraft und ließ den Stein fallen. Der Findling liegt noch heute als Teufelsstein im Wald nördlich von Bellach.",
        reviewEmpfohlen: false,
      },
    },
    source:
      "Teil der Sammlungen historischer Stadtsagen, wie sie unter anderem im Solothurner Urkundenbuch oder in alten Dokumenten zur Stadtbefestigung dokumentiert sind",
    lat: 47.2227299807236,
    lng: 7.502939656745565,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Kellerwald_008.jpg/1280px-Kellerwald_008.jpg?utm_source=de.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    fotoAttribution: "Wikimedia Commons",
    ortName: "Teufelsstein, Bellacher Wald",
  },
};

export const CURATED_SAGA_REPLACEMENT_IDS = Object.keys(REPLACEMENTS);

export const CURATED_SAGAS: InsertCatalogSaga[] = bundledSagas.map((saga) => ({
  ...saga,
  ...(REPLACEMENTS[saga.id] ?? {}),
}));
