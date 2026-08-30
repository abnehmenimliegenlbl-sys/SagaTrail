import { createRequire } from "node:module";
import type { InsertCatalogSaga } from "@workspace/db";

const _r = createRequire(import.meta.url);
const bundledSagas: InsertCatalogSaga[] = _r("./curatedSagas.json");

const HIDDEN_CROSS_SUMMARIES: NonNullable<InsertCatalogSaga["summaries"]> = {
  de: {
    text:
      "Am Zeitglockenturm in Solothurn erinnert ein kleines eingemeißeltes Kreuz an einen Steinmetzen, der beim Sturz vom Gerüst durch seinen Arbeitskittel an einem Baunagel gerettet wurde. Aus Dankbarkeit meißelte er das Kreuz an der Stelle in die Südwand.",
    reviewEmpfohlen: false,
  },
  gsw: {
    text:
      "Am Zeitglockenturm in Solothurn erinnert ein kleines eingemeisseltes Kreuz an einen Steinmetzen, der beim Sturz vom Gerüst durch seinen Arbeitskittel an einem Baunagel gerettet wurde. Aus Dankbarkeit meisselte er das Kreuz an der Stelle in die Südwand.",
    reviewEmpfohlen: false,
  },
  fr: {
    text:
      "À la tour de l’Horloge de Soleure, une petite croix gravée rappelle un tailleur de pierre qui, en tombant d’un échafaudage, fut sauvé par sa blouse de travail accrochée à un clou. Par gratitude, il grava la croix à cet endroit sur le mur sud.",
    reviewEmpfohlen: false,
  },
  it: {
    text:
      "Alla Torre dell’Orologio di Soletta, una piccola croce incisa ricorda uno scalpellino che, cadendo dall’impalcatura, fu salvato dalla veste da lavoro rimasta impigliata in un chiodo. Per gratitudine incise la croce proprio in quel punto della parete meridionale.",
    reviewEmpfohlen: false,
  },
  en: {
    text:
      "A small carved cross on Solothurn’s Clock Tower recalls a stonemason who fell from the scaffolding but was saved when his work coat caught on a building nail. Out of gratitude, he carved the cross into the south wall at that very spot.",
    reviewEmpfohlen: false,
  },
  zh: {
    text:
      "索洛图恩钟楼上的一枚小十字架，纪念一位从脚手架上坠落却因工作服挂在建筑钉上而获救的石匠。为了表达感激，他在南墙的事发处刻下了这枚十字架。",
    reviewEmpfohlen: false,
  },
  es: {
    text:
      "Una pequeña cruz grabada en la Torre del Reloj de Soleura recuerda a un cantero que cayó del andamio, pero se salvó cuando su bata de trabajo quedó enganchada en un clavo de la obra. En agradecimiento, grabó la cruz en ese mismo lugar de la pared sur.",
    reviewEmpfohlen: false,
  },
  pt: {
    text:
      "Uma pequena cruz gravada na Torre do Relógio de Soleura recorda um pedreiro que caiu do andaime, mas foi salvo quando a sua bata de trabalho ficou presa num prego da construção. Por gratidão, gravou a cruz exatamente nesse lugar da parede sul.",
    reviewEmpfohlen: false,
  },
  ru: {
    text:
      "Небольшой высеченный крест на часовой башне Золотурна напоминает о каменотёсе, который упал со строительных лесов, но был спасён, когда его рабочая одежда зацепилась за строительный гвоздь. В благодарность он высек крест на южной стене именно в этом месте.",
    reviewEmpfohlen: false,
  },
};

const DEVILS_STONE_SUMMARIES: NonNullable<InsertCatalogSaga["summaries"]> = {
  de: {
    text:
      "Der Teufel wollte einen tonnenschweren Granitblock aus dem Wallis auf die Baustelle der Solothurner Kathedrale schleudern. Als in Solothurn die Abendglocken läuteten, verlor er seine Kraft und ließ den Stein fallen. Der Findling liegt noch heute als Teufelsstein im Wald nördlich von Bellach.",
    reviewEmpfohlen: false,
  },
  gsw: {
    text:
      "Der Teufel wollte einen tonnenschweren Granitblock aus dem Wallis auf die Baustelle der Solothurner Kathedrale schleudern. Als in Solothurn die Abendglocken läuteten, verlor er seine Kraft und liess den Stein fallen. Der Findling liegt noch heute als Teufelsstein im Wald nördlich von Bellach.",
    reviewEmpfohlen: false,
  },
  fr: {
    text:
      "Le diable voulait lancer un bloc de granit de plusieurs tonnes depuis le Valais sur le chantier de la cathédrale de Soleure. Lorsque les cloches du soir sonnèrent à Soleure, il perdit sa force et laissa tomber la pierre. Le bloc repose encore aujourd’hui dans la forêt au nord de Bellach sous le nom de Pierre du Diable.",
    reviewEmpfohlen: false,
  },
  it: {
    text:
      "Il diavolo voleva scagliare dal Vallese un enorme blocco di granito sulla costruzione della cattedrale di Soletta. Quando a Soletta suonarono le campane della sera, perse la sua forza e lasciò cadere la pietra. Il masso si trova ancora oggi nel bosco a nord di Bellach ed è chiamato Pietra del Diavolo.",
    reviewEmpfohlen: false,
  },
  en: {
    text:
      "The devil wanted to hurl a granite block weighing several tons from Valais onto the construction site of Solothurn Cathedral. When the evening bells rang in Solothurn, he lost his power and dropped the stone. The boulder still lies in the forest north of Bellach, known as the Devil’s Stone.",
    reviewEmpfohlen: false,
  },
  zh: {
    text:
      "魔鬼想把一块重达数吨的花岗岩从瓦莱州扔到索洛图恩大教堂的工地上。索洛图恩的晚钟响起时，他失去了力量，只能让石头坠落。这块巨石至今仍位于贝拉赫以北的森林中，被称为“魔鬼之石”。",
    reviewEmpfohlen: false,
  },
  es: {
    text:
      "El diablo quería lanzar desde el Valais un bloque de granito de varias toneladas contra las obras de la catedral de Soleura. Cuando sonaron las campanas de la tarde en Soleura, perdió sus fuerzas y dejó caer la piedra. El bloque todavía se encuentra en el bosque al norte de Bellach, conocido como la Piedra del Diablo.",
    reviewEmpfohlen: false,
  },
  pt: {
    text:
      "O diabo queria lançar do Valais um bloco de granito de várias toneladas contra a construção da catedral de Soleura. Quando os sinos da noite tocaram em Soleura, perdeu a força e deixou cair a pedra. O rochedo ainda se encontra na floresta a norte de Bellach, conhecido como a Pedra do Diabo.",
    reviewEmpfohlen: false,
  },
  ru: {
    text:
      "Дьявол хотел сбросить многотонный гранитный валун из Вале на стройку Золотурнского собора. Когда в Золотурне зазвонили вечерние колокола, он потерял силу и выпустил камень. Валун и сегодня лежит в лесу к северу от Беллаха и известен как Чёртов камень.",
    reviewEmpfohlen: false,
  },
};

const HASENMATT_DWARFS_SUMMARIES: NonNullable<
  InsertCatalogSaga["summaries"]
> = {
  de: {
    text:
      "Unterhalb des Hasenmatt-Gipfels lebten einst hilfsbereite Erdmännlein, die kranken Bergbauern halfen und das Vieh vor Unwettern schützten. Als übermütige Burschen die Wichtel verspotteten und vertrieben, zogen sie sich für immer in die Tiefen des Berges zurück.",
    reviewEmpfohlen: false,
  },
  gsw: {
    text:
      "Unterhalb des Hasenmatt-Gipfels lebten einst hilfsbereite Erdmännlein, die den Bergbauern und Sennen heimlich halfen. Sie molken das Vieh, schützten es vor Unwettern und verlangten nur eine Schale Milch oder Nidle. Nachdem übermütige Burschen sie verspottet und vertrieben hatten, verschwanden sie für immer in den Tiefen des Berges.",
    reviewEmpfohlen: false,
  },
  fr: {
    text:
      "Sous le sommet de la Hasenmatt vivaient autrefois de petits êtres bienveillants qui aidaient les paysans de montagne malades et protégeaient le bétail des orages. Après que de jeunes garçons les eurent ridiculisés et chassés, ils se retirèrent pour toujours dans les profondeurs de la montagne.",
    reviewEmpfohlen: false,
  },
  it: {
    text:
      "Sotto la vetta della Hasenmatt vivevano un tempo piccoli esseri benevoli che aiutavano i contadini di montagna malati e proteggevano il bestiame dai temporali. Dopo essere stati derisi e cacciati da alcuni giovani, si ritirarono per sempre nelle profondità della montagna.",
    reviewEmpfohlen: false,
  },
  en: {
    text:
      "Long ago, kind little earth folk lived beneath the summit of Hasenmatt, helping sick mountain farmers and protecting their livestock from storms. After some reckless young men mocked and drove them away, the little people withdrew forever into the depths of the mountain.",
    reviewEmpfohlen: false,
  },
  zh: {
    text:
      "很久以前，哈森马特山顶下住着一群善良的小精灵，他们帮助生病的山民，也在暴风雨来临前保护牲畜。几个轻浮的年轻人嘲笑并驱赶了他们，于是这些小精灵永远退回了山的深处。",
    reviewEmpfohlen: false,
  },
  es: {
    text:
      "Hace mucho tiempo, unos pequeños seres bondadosos vivían bajo la cima de Hasenmatt, ayudando a los campesinos de montaña enfermos y protegiendo el ganado de las tormentas. Después de que unos jóvenes imprudentes se burlaran de ellos y los expulsaran, se retiraron para siempre a las profundidades de la montaña.",
    reviewEmpfohlen: false,
  },
  pt: {
    text:
      "Há muito tempo, pequenos seres bondosos viviam sob o cume de Hasenmatt, ajudando os camponeses das montanhas doentes e protegendo o gado das trovoadas. Depois de alguns jovens imprudentes troçarem deles e os expulsarem, retiraram-se para sempre para as profundezas da montanha.",
    reviewEmpfohlen: false,
  },
  ru: {
    text:
      "Когда-то под вершиной Хазенматт жили добрые маленькие духи, которые помогали заболевшим горным крестьянам и защищали скот от гроз. После того как несколько легкомысленных юношей стали насмехаться над ними и прогнали их, духи навсегда скрылись в глубинах горы.",
    reviewEmpfohlen: false,
  },
};

/**
 * Redaktionelle Ersatztexte für falsch zugeordnete Solothurn-Einträge.
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
    summaries: HIDDEN_CROSS_SUMMARIES,
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
    summaries: DEVILS_STONE_SUMMARIES,
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
  "die-durstigen-eidgenossen-solot": {
    title: "Die Erdmännlein auf der Hasenmatt",
    canton: "Solothurn",
    coreMotif: "Undank vertreibt hilfreiche Berggeister",
    bildmotiv: "Hasenmatt, Jura, Erdmännlein, Höhlen und Felsspalten",
    mood: "Mystisch und melancholisch",
    summary:
      "Der genaue Ort: Die Höhlen, Felsspalten und Karstlöcher direkt unterhalb des Gipfels der Hasenmatt (1445 m ü. M.), dem höchsten Punkt des Kantons Solothurn in der Gemeinde Selzach. Tief im Inneren der Hasenmatt, verborgen in finsteren Felsklüften, lebte vor langen Zeiten ein kleines, friedliches Volk von Erdmännlein (Wichteln). Sie waren scheu und zeigten sich den Menschen nur selten, doch sie besassen ein ausserordentlich gutes Herz für die Bergbauern und Sennen. War ein Bauer krank, erledigten die Wichtel nachts heimlich das Melken. Drohte ein schweres Sommergewitter, trieben sie das Vieh rechtzeitig in den sicheren Stall oder schichteten das frisch gemähte Heu zu Schobern auf, bevor der Regen es verderben konnte. Als Dank verlangten sie nie Geld; die Bauern stellten ihnen lediglich abends eine Schale frische Nidle (Rahm) oder Milch vor die Höhleneingänge. Das friedliche Zusammenleben endete, als eine Gruppe junger, übermütiger Burschen aus dem Tal beschloss, sich über die kleinen Wesen lustig zu machen. Sie versteckten sich hinter den Felsen, streuten Asche auf die Wege, um die Spuren der Wichtel zu verraten, und bewarfen die Höhleneingänge mit Steinen. Als die Erdmännlein heraustraten, wurden sie mit lautem Spott und gellendem Gelächter vertrieben. Tief gekränkt über diesen Undank der Menschen zogen sich die Wichtel in derselben Nacht komplett zurück. Sie sammelten ihre wenigen Habseligkeiten und wanderten für immer durch die tiefsten Spalten in das Herz des Berges. Seit diesem Tag hat kein Mensch auf der Hasenmatt je wieder ein Erdmännlein gesehen, und die Bauern mussten ihre schwere Arbeit fortan ganz alleine bewältigen.",
    summaries: HASENMATT_DWARFS_SUMMARIES,
    source:
      "Schweizerische Gesellschaft für Volkskunde (SGV): Archivierte Feldaufnahmen zu den Jura-Erdmännlein.",
    lat: 47.242107407634336,
    lng: 7.450791968901107,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/20260620_Hasenmatt-6.tif/lossy-page1-1280px-20260620-Hasenmatt-6.tif.jpg?utm_source=en.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    fotoAttribution: "Wikimedia Commons",
    ortName: "Hasenmatt, Selzach",
  },
};

export const CURATED_SAGA_REPLACEMENT_IDS = Object.keys(REPLACEMENTS);

export const CURATED_SAGAS: InsertCatalogSaga[] = bundledSagas.map((saga) => ({
  ...saga,
  ...(REPLACEMENTS[saga.id] ?? {}),
}));
