import type { InsertCatalogSaga } from "@workspace/db";

  /**
   * Kuratierte, gemeinfrei belegte Sagen als verbindliche Katalog-Ausgangsdaten.
   * Jede Sage stammt aus einer gemeinfreien historischen Sammlung mit
   * nachvollziehbarer Quelle. Koordinaten sind nur gesetzt, wenn die Quelle die
   * Sage einem realen Ort zuordnet (sonst koordinatenSicherheit
   * "nicht_lokalisierbar"). Zusammenfassungen sind je Zielsprache eigenstaendig
   * verfasst; unsichere Sprachqualitaet ist mit reviewEmpfohlen markiert.
   */
  export const CURATED_SAGAS: InsertCatalogSaga[] = [
{
  "id": "teufelsbrucke",
  "title": "Die Teufelsbrücke in der Schöllenen",
  "canton": "Uri",
  "coreMotif": "Pakt mit dem Teufel",
  "mood": "Düster und stürmisch",
  "summary": "Die Schöllenenschlucht war unpassierbar, bis die verzweifelten Urner riefen, da solle doch der Teufel eine Brücke bauen. Der Teufel erschien und baute sie – zum Preis der ersten Seele, die hinüberginge. Die listigen Urner jagten einen Geissbock über die Brücke; ergrimmt wollte der Teufel sie mit einem Felsblock zerschmettern, doch das Zeichen eines Kreuzes lenkte den Stein ab.",
  "summaries": {
    "gsw": {
      "text": "D Schöllenenschlucht isch unpassierbar gsi, bis d Urner verzwiflet grüeft hend, de Tüüfel söll halt e Brugg boue. De Tüüfel isch cho und hät si boue – für di erscht Seel, wo drübergaht. Aber d Urner hend en Geissbock übere gjagt; wüetig hät de Tüüfel si mit eme Fels wele verschla, doch es Chrüüz hät de Stei ablänkt.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Die Schöllenenschlucht war unpassierbar, bis die verzweifelten Urner riefen, da solle doch der Teufel eine Brücke bauen. Der Teufel erschien und baute sie – zum Preis der ersten Seele, die hinüberginge. Die listigen Urner jagten einen Geissbock über die Brücke; ergrimmt wollte der Teufel sie mit einem Felsblock zerschmettern, doch das Zeichen eines Kreuzes lenkte den Stein ab.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Les gorges des Schöllenen étaient infranchissables, jusqu'à ce que les Uranais désespérés s'écrient que le diable n'avait qu'à bâtir un pont. Le diable parut et le construisit, réclamant en paiement la première âme qui le franchirait. Les rusés Uranais y firent passer un bouc; furieux, le diable voulut écraser l'ouvrage d'un bloc de rocher, mais le signe d'une croix détourna la pierre.",
      "reviewEmpfohlen": false
    },
    "it": {
      "text": "La gola della Schöllenen era invalicabile, finché gli Urani disperati non gridarono che il diavolo costruisse pure un ponte. Il diavolo apparve e lo edificò, chiedendo in cambio la prima anima che lo attraversasse. Gli astuti Urani vi fecero passare un caprone; furibondo, il diavolo volle fracassare l'opera con un masso, ma il segno di una croce deviò la pietra.",
      "reviewEmpfohlen": false
    },
    "en": {
      "text": "The Schöllenen gorge was impassable until the desperate people of Uri cried that the Devil himself should build a bridge. The Devil appeared and built it, demanding in payment the first soul to cross. The cunning Uri folk drove a billy goat across; enraged, the Devil tried to smash the bridge with a boulder, but the sign of a cross turned the stone aside.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "舍勒能峡谷原本无法通行，直到绝望的乌里人喊道，干脆让魔鬼来造一座桥。魔鬼果然现身建起了桥，索取第一个过桥之人的灵魂作为报酬。机智的乌里人赶了一只公山羊先过桥；魔鬼大怒，欲用巨石砸毁石桥，却因十字架的记号而偏离了目标。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "El desfiladero de Schöllenen era intransitable hasta que los desesperados habitantes de Uri gritaron que el diablo mismo construyera un puente. El diablo apareció y lo levantó, exigiendo como pago la primera alma que lo cruzara. Los astutos uraneses hicieron pasar un macho cabrío; furioso, el diablo quiso destrozar el puente con una roca, pero la señal de una cruz desvió la piedra.",
      "reviewEmpfohlen": false
    },
    "pt": {
      "text": "O desfiladeiro de Schöllenen era intransponível até que os desesperados habitantes de Uri gritaram que o próprio diabo construísse uma ponte. O diabo surgiu e a ergueu, exigindo como pagamento a primeira alma que a atravessasse. Os astutos habitantes de Uri fizeram passar um bode; furioso, o diabo quis esmagar a ponte com um rochedo, mas o sinal de uma cruz desviou a pedra.",
      "reviewEmpfohlen": false
    }
  },
  "altersstufenHinweis": "Den Seelenpakt und die Drohung des Teufels für jüngere Kinder abmildern; den listigen Ausgang mit dem Geissbock betonen.",
  "quelle": {
    "autor": "Alois Lütolf",
    "werk": "Sagen, Bräuche und Legenden aus den fünf Orten Lucern, Uri, Schwyz, Unterwalden und Zug",
    "jahr": "1862",
    "fundstelleUrl": "https://reader.digitale-sammlungen.de/resolve/display/bsb10453839.html"
  },
  "source": "Alois Lütolf: Sagen, Bräuche und Legenden aus den fünf Orten Lucern, Uri, Schwyz, Unterwalden und Zug (1862)",
  "lat": 46.6529,
  "lng": 8.5837,
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "tell",
  "title": "Wilhelm Tell – Apfelschuss und Tellensprung",
  "canton": "Uri",
  "coreMotif": "Freiheit und Auflehnung",
  "mood": "Trotzig, entschlossen",
  "summary": "Der Landvogt Gessler zwang Wilhelm Tell, mit der Armbrust einen Apfel vom Kopf seines eigenen Sohnes zu schiessen. Tell traf, doch weil er einen zweiten Pfeil für den Vogt bereithielt, wurde er gefangen über den Urnersee geführt. Als ein Sturm losbrach, gab man ihm das Ruder; bei der Tellsplatte sprang er auf den Felsen und stiess das Boot zurück in die tosenden Wellen.",
  "summaries": {
    "gsw": {
      "text": "De Landvogt Gessler hät de Wilhelm Tell zwunge, mit de Armbruscht en Öpfel vom Chopf vo sim eigne Suhn z schüsse. De Tell hät troffe, aber wil er en zweite Pfil für de Vogt parat gha hät, isch er gfange über de Urnersee gfüehrt worde. Wos gstürmt hät, hät me em s Ruder gäh; bi de Tellsplatte isch er ufe Fels gsprunge und hät s Schiff zrugg i d Wälle gstosse.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Der Landvogt Gessler zwang Wilhelm Tell, mit der Armbrust einen Apfel vom Kopf seines eigenen Sohnes zu schiessen. Tell traf, doch weil er einen zweiten Pfeil für den Vogt bereithielt, wurde er gefangen über den Urnersee geführt. Als ein Sturm losbrach, gab man ihm das Ruder; bei der Tellsplatte sprang er auf den Felsen und stiess das Boot zurück in die tosenden Wellen.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Le bailli Gessler contraignit Guillaume Tell à percer d'un carreau d'arbalète une pomme posée sur la tête de son propre fils. Tell atteignit la cible, mais comme il gardait une seconde flèche pour le bailli, il fut emmené prisonnier sur le lac d'Uri. Quand la tempête éclata, on lui confia la rame; à la Tellsplatte, il bondit sur le rocher et repoussa la barque dans les flots déchaînés.",
      "reviewEmpfohlen": false
    },
    "it": {
      "text": "Il balivo Gessler costrinse Guglielmo Tell a colpire con la balestra una mela posta sul capo del proprio figlio. Tell colpì il bersaglio, ma poiché teneva pronta una seconda freccia per il balivo, fu condotto prigioniero sul lago di Uri. Quando scoppiò la tempesta gli affidarono il remo; presso la Tellsplatte balzò sulla roccia e respinse la barca tra le onde furiose.",
      "reviewEmpfohlen": false
    },
    "en": {
      "text": "The bailiff Gessler forced William Tell to shoot an apple from the head of his own son with a crossbow. Tell struck true, but because he kept a second bolt ready for the bailiff, he was taken prisoner across Lake Uri. When a storm broke, he was handed the oar; at the Tellsplatte he leapt onto the rock and shoved the boat back into the raging waves.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "总督盖斯勒强迫威廉·退尔用弩射下放在自己儿子头上的苹果。退尔一箭命中，却因为准备了第二支箭要射总督，而被押解着渡过乌里湖。风暴骤起时，人们把船桨交给他；在退尔石畔，他纵身跳上岩石，把小船重新推回怒涛之中。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "El bailío Gessler obligó a Guillermo Tell a atravesar con la ballesta una manzana colocada sobre la cabeza de su propio hijo. Tell acertó, pero como guardaba una segunda flecha para el bailío, fue llevado prisionero por el lago de Uri. Al estallar la tormenta le entregaron el remo; en la Tellsplatte saltó a la roca y empujó la barca de vuelta a las olas embravecidas.",
      "reviewEmpfohlen": false
    },
    "pt": {
      "text": "O bailio Gessler obrigou Guilherme Tell a acertar, com a besta, uma maçã sobre a cabeça do próprio filho. Tell acertou, mas, por ter uma segunda flecha reservada para o bailio, foi levado prisioneiro pelo lago de Uri. Quando a tempestade eclodiu, entregaram-lhe o remo; junto à Tellsplatte, saltou para o rochedo e empurrou o barco de volta às ondas revoltas.",
      "reviewEmpfohlen": false
    }
  },
  "altersstufenHinweis": "Die Todesdrohung beim Apfelschuss behutsam halten; Mut und Freiheitswillen in den Vordergrund stellen.",
  "quelle": {
    "autor": "Hans Schriber",
    "werk": "Das Weisse Buch von Sarnen",
    "jahr": "um 1470",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Weisses_Buch_von_Sarnen"
  },
  "source": "Hans Schriber: Das Weisse Buch von Sarnen (um 1470)",
  "lat": 46.9726,
  "lng": 8.6112,
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "gallus",
  "title": "Gallus und der Bär an der Steinach",
  "canton": "St. Gallen",
  "coreMotif": "Heiligenlegende und wilde Natur",
  "mood": "Ehrfürchtig, wundersam",
  "summary": "Der irische Mönch Gallus folgte der Steinach in die Wildnis und stürzte im Dornengestrüpp – ein Zeichen, hier zu bleiben. In der Nacht trat ein Bär aus dem Wald; Gallus gebot ihm, Holz ans Feuer zu legen, und reichte ihm dafür ein Brot. Der Bär gehorchte und zog sich in die Berge zurück; an dieser Stelle erwuchs später das Kloster St. Gallen.",
  "summaries": {
    "gsw": {
      "text": "De iirisch Münch Gallus isch de Steinach na i d Wildnis und im Dorngstrüpp gheit – es Zeiche, dass er da bliibe söll. I de Nacht isch en Bär us em Wald cho; de Gallus hät em befohle, Holz as Füür z legge, und em derfür es Brot gäh. De Bär hät ghorcht und sich i d Berge zruggzoge; da isch spöter s Chloster St. Galle gwachse.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Der irische Mönch Gallus folgte der Steinach in die Wildnis und stürzte im Dornengestrüpp – ein Zeichen, hier zu bleiben. In der Nacht trat ein Bär aus dem Wald; Gallus gebot ihm, Holz ans Feuer zu legen, und reichte ihm dafür ein Brot. Der Bär gehorchte und zog sich in die Berge zurück; an dieser Stelle erwuchs später das Kloster St. Gallen.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Le moine irlandais Gall suivit la Steinach dans les solitudes sauvages et tomba dans les ronces – signe qu'il devait s'y établir. La nuit, un ours sortit de la forêt; Gall lui ordonna de mettre du bois sur le feu et lui tendit un pain en récompense. L'ours obéit puis se retira dans les montagnes; à cet endroit s'éleva plus tard le monastère de Saint-Gall.",
      "reviewEmpfohlen": false
    },
    "it": {
      "text": "Il monaco irlandese Gallo seguì la Steinach nelle solitudini selvagge e cadde tra i rovi – segno che lì doveva restare. Nella notte un orso uscì dal bosco; Gallo gli ordinò di mettere legna sul fuoco e gli porse un pane in ricompensa. L'orso obbedì e si ritirò tra i monti; in quel luogo sorse più tardi il monastero di San Gallo.",
      "reviewEmpfohlen": false
    },
    "en": {
      "text": "The Irish monk Gallus followed the Steinach into the wilderness and fell in the thornbushes – a sign that he should stay. In the night a bear came from the forest; Gallus bade it lay wood on the fire and handed it a loaf in reward. The bear obeyed and withdrew into the mountains; on that spot the monastery of St. Gallen later arose.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "爱尔兰修士加卢斯沿着施泰纳赫河进入荒野，在荆棘丛中跌倒——这被视为他应在此定居的征兆。夜里，一头熊从森林中走出；加卢斯命它往火堆里添柴，并递给它一块面包作为酬劳。熊听从了，随后退回山中；日后圣加仑修道院便在此地兴起。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "El monje irlandés Galo siguió el Steinach hacia la espesura salvaje y cayó entre las zarzas: señal de que debía quedarse allí. En la noche, un oso salió del bosque; Galo le ordenó poner leña en el fuego y le tendió un pan como recompensa. El oso obedeció y se retiró a las montañas; en aquel lugar surgió más tarde el monasterio de San Galo.",
      "reviewEmpfohlen": false
    },
    "pt": {
      "text": "O monge irlandês Galo seguiu o Steinach pela solidão selvagem e caiu entre os espinheiros — sinal de que ali deveria ficar. Durante a noite, um urso saiu da floresta; Galo ordenou-lhe que pusesse lenha no fogo e estendeu-lhe um pão como recompensa. O urso obedeceu e recolheu-se às montanhas; naquele lugar ergueu-se mais tarde o mosteiro de São Galo.",
      "reviewEmpfohlen": false
    }
  },
  "altersstufenHinweis": "Die Begegnung mit dem Bären nicht als Angriff, sondern als wundersame Freundschaft erzählen.",
  "quelle": {
    "autor": "Walahfrid Strabo",
    "werk": "Vita Sancti Galli",
    "jahr": "um 833",
    "fundstelleUrl": "https://www.geschichtsquellen.de/werk/4712"
  },
  "source": "Walahfrid Strabo: Vita Sancti Galli (um 833)",
  "lat": 47.4239,
  "lng": 9.3767,
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "teufelskeller",
  "title": "Der Teufelskeller bei Baden",
  "canton": "Aargau",
  "coreMotif": "Teufelswerk in der Landschaft",
  "mood": "Wild, mahnend",
  "summary": "Bei Baden liegen wild zerklüftete Felsblöcke wirr übereinander – der Teufelskeller. Der Teufel, so erzählt man, trug die gewaltigen Steine herbei, um damit Kirche und Stadt zu verschütten. Doch ehe er sein Werk vollenden konnte, überraschten ihn das Morgengrauen und der Klang der Glocken, sodass er die Felsen fallen liess, wo sie bis heute liegen.",
  "summaries": {
    "gsw": {
      "text": "Bi Baade liged wild verchlüfteti Felse wüescht überenand – de Tüfelschäller. De Tüfel, so verzellt me, hät die gwaltige Stei zäme träit, zum d Chile und d Stadt verschütte. Aber bevor er fertig gsi isch, hät en de Morge und s Glüüt vo de Glogge überrascht, so dass er d Felse la falle hät, wo si hüt na liged.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Bei Baden liegen wild zerklüftete Felsblöcke wirr übereinander – der Teufelskeller. Der Teufel, so erzählt man, trug die gewaltigen Steine herbei, um damit Kirche und Stadt zu verschütten. Doch ehe er sein Werk vollenden konnte, überraschten ihn das Morgengrauen und der Klang der Glocken, sodass er die Felsen fallen liess, wo sie bis heute liegen.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Près de Baden s'entassent pêle-mêle des blocs de rocher déchiquetés – le Teufelskeller, la « cave du diable ». Le diable, dit-on, apporta ces pierres énormes pour ensevelir l'église et la ville. Mais avant qu'il pût achever son œuvre, l'aube et le son des cloches le surprirent, si bien qu'il laissa choir les rochers là où ils gisent encore.",
      "reviewEmpfohlen": false
    },
    "it": {
      "text": "Presso Baden si ammassano alla rinfusa massi rocciosi frastagliati – il Teufelskeller, la «cantina del diavolo». Il diavolo, si racconta, portò quelle pietre enormi per seppellire la chiesa e la città. Ma prima che potesse compiere l'opera, l'alba e il suono delle campane lo sorpresero, sicché lasciò cadere i massi là dove giacciono ancora.",
      "reviewEmpfohlen": false
    },
    "en": {
      "text": "Near Baden lie jagged boulders heaped in wild confusion – the Teufelskeller, the \"Devil's Cellar.\" The Devil, so the tale goes, carried these massive stones to bury the church and the town. But before he could finish his work, daybreak and the ringing of the bells surprised him, so that he let the rocks fall where they lie to this day.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "巴登附近，嶙峋的巨石杂乱地堆叠在一起——这便是“魔鬼地窖”。传说魔鬼搬来这些巨石，想用它们埋葬教堂和城镇。可还没等他完工，黎明与钟声便让他措手不及，于是他把岩石丢在原地，它们至今仍散乱地躺在那里。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Cerca de Baden se amontonan en salvaje desorden bloques de roca escarpados: el Teufelskeller, la «bodega del diablo». El diablo, según se cuenta, acarreó esas piedras enormes para sepultar la iglesia y la ciudad. Pero antes de poder concluir su obra, el alba y el tañido de las campanas lo sorprendieron, de modo que dejó caer las rocas donde aún hoy yacen.",
      "reviewEmpfohlen": false
    },
    "pt": {
      "text": "Perto de Baden amontoam-se, em desordem selvagem, blocos de rocha recortados — o Teufelskeller, a «adega do diabo». O diabo, conta-se, trouxe aquelas pedras enormes para soterrar a igreja e a cidade. Mas, antes de concluir a obra, o amanhecer e o repicar dos sinos surpreenderam-no, de modo que deixou cair os rochedos onde ainda hoje jazem.",
      "reviewEmpfohlen": false
    }
  },
  "altersstufenHinweis": "Den Teufel eher als tölpelhafte denn als bedrohliche Gestalt zeichnen; das Chaos der Felsen staunend schildern.",
  "quelle": {
    "autor": "Ernst Ludwig Rochholz",
    "werk": "Schweizersagen aus dem Aargau",
    "jahr": "1856",
    "fundstelleUrl": "https://archive.org/details/bub_gb_YVmp4GlhYdUC"
  },
  "source": "Ernst Ludwig Rochholz: Schweizersagen aus dem Aargau (1856)",
  "lat": 47.4626,
  "lng": 8.2847,
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "diablerets",
  "title": "Die Quille du Diable und der Bergsturz der Diablerets",
  "canton": "Waadt",
  "coreMotif": "Frevel und Bergsturz",
  "mood": "Erhaben, warnend",
  "summary": "Auf den Hochweiden der Diablerets sollen des Nachts Teufel mit gewaltigen Felsblöcken Kegel geschoben haben – daher die Quille du Diable, der Kegel des Teufels. Ihr wüstes Spiel und der Frevel der Menschen brachten den Berg ins Rutschen: mächtige Bergstürze begruben die einst grünen Alpen unter Geröll, und seither trägt das Massiv den Namen der Teufel.",
  "summaries": {
    "gsw": {
      "text": "Ufe de Hochweide vo de Diablerets sölled znacht Tüfel mit gwaltige Felse Kegle gschobe ha – dörum d Quille du Diable, de Kegel vom Tüfel. Ires wüeschte Spil und de Frevel vo de Lüt hend de Berg is Rutsche brocht: gwaltigi Bergstürz hend die einisch grüene Alpe under Gröll begrabe, und sither treit s Massiv de Name vo de Tüfel.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Auf den Hochweiden der Diablerets sollen des Nachts Teufel mit gewaltigen Felsblöcken Kegel geschoben haben – daher die Quille du Diable, der Kegel des Teufels. Ihr wüstes Spiel und der Frevel der Menschen brachten den Berg ins Rutschen: mächtige Bergstürze begruben die einst grünen Alpen unter Geröll, und seither trägt das Massiv den Namen der Teufel.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Sur les hauts pâturages des Diablerets, des diables auraient joué la nuit aux quilles avec d'énormes blocs de rocher – d'où la « Quille du Diable ». Leur jeu effréné et l'impiété des hommes ébranlèrent la montagne: de gigantesques éboulements ensevelirent sous les pierres les alpages jadis verdoyants, et depuis lors le massif porte le nom des diables.",
      "reviewEmpfohlen": false
    },
    "it": {
      "text": "Sugli alti pascoli dei Diablerets, di notte i diavoli avrebbero giocato ai birilli con enormi massi – da qui la «Quille du Diable», il birillo del diavolo. Il loro gioco sfrenato e l'empietà degli uomini fecero franare la montagna: immani frane seppellirono sotto le pietre gli alpeggi un tempo verdi, e da allora il massiccio porta il nome dei diavoli.",
      "reviewEmpfohlen": false
    },
    "en": {
      "text": "On the high pastures of Les Diablerets, devils are said to have played ninepins by night with huge boulders – hence the \"Quille du Diable,\" the Devil's skittle. Their wild game and the impiety of men set the mountain sliding: mighty rockfalls buried the once-green alps under rubble, and ever since the massif has borne the devils' name.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在迪亚布勒雷的高山牧场上，据说魔鬼们夜里用巨大的岩石玩滚球游戏——“魔鬼之柱”由此得名。它们狂野的游戏加上世人的亵渎，使山体开始滑动：巨大的山崩把曾经翠绿的高山牧场埋在乱石之下，从此这片山峦便冠上了魔鬼之名。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En los altos pastos de Les Diablerets, se dice que los diablos jugaban de noche a los bolos con enormes bloques de roca: de ahí la «Quille du Diable», el bolo del diablo. Su juego desenfrenado y la impiedad de los hombres hicieron deslizarse la montaña: enormes desprendimientos sepultaron bajo los escombros los pastos antaño verdes, y desde entonces el macizo lleva el nombre de los diablos.",
      "reviewEmpfohlen": false
    },
    "pt": {
      "text": "Nos altos pastos de Les Diablerets, diz-se que os diabos jogavam à noite aos paus com enormes blocos de rocha — daí a «Quille du Diable», o pino do diabo. O seu jogo desenfreado e a impiedade dos homens puseram a montanha a deslizar: enormes desabamentos sepultaram sob os escombros os alpes outrora verdejantes, e desde então o maciço traz o nome dos diabos.",
      "reviewEmpfohlen": false
    }
  },
  "altersstufenHinweis": "Den Bergsturz und die Zerstörung nicht drastisch ausmalen; das geheimnisvolle Kegelspiel der Teufel betonen.",
  "quelle": {
    "autor": "Alfred Cérésole",
    "werk": "Légendes des Alpes vaudoises",
    "jahr": "1885",
    "fundstelleUrl": "https://ebooks-bnr.com/ceresole-alfred-legendes-des-alpes-vaudoises/"
  },
  "source": "Alfred Cérésole: Légendes des Alpes vaudoises (1885)",
  "lat": 46.3167,
  "lng": 7.21,
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
];
  