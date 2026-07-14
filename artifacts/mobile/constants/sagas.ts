import { Saga } from "../types";

// Kuratierte, gemeinfrei belegte Sagen (Offline-Fallback). Verbindliche Quelle
// ist der Server-Katalog; diese Liste muss inhaltlich damit uebereinstimmen.
// Jede Sage stammt aus einer gemeinfreien historischen Sammlung; Koordinaten
// sind nur gesetzt, wenn die Quelle die Sage einem realen Ort zuordnet.
export const SAGAS: Saga[] = [
{
  "id": "teufelsbrucke",
  "title": "Die Teufelsbrücke in der Schöllenen",
  "canton": "Uri",
  "coreMotif": "Pakt mit dem Teufel",
  "bildmotiv": "Teufelsbrücke Schöllenen",
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
  "coordinates": { "lat": 46.6529, "lng": 8.5837 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "tell",
  "title": "Wilhelm Tell – Apfelschuss und Tellensprung",
  "canton": "Uri",
  "coreMotif": "Freiheit und Auflehnung",
  "bildmotiv": "Wilhelm Tell Denkmal",
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
  "coordinates": { "lat": 46.9726, "lng": 8.6112 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "gallus",
  "title": "Gallus und der Bär an der Steinach",
  "canton": "St. Gallen",
  "coreMotif": "Heiligenlegende und wilde Natur",
  "bildmotiv": "Braunbär",
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
  "coordinates": { "lat": 47.4239, "lng": 9.3767 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "teufelskeller",
  "title": "Der Teufelskeller bei Baden",
  "canton": "Aargau",
  "coreMotif": "Teufelswerk in der Landschaft",
  "bildmotiv": "Felsblock Wald Schweiz",
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
  "coordinates": { "lat": 47.4626, "lng": 8.2847 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "diablerets",
  "title": "Die Quille du Diable und der Bergsturz der Diablerets",
  "canton": "Waadt",
  "coreMotif": "Frevel und Bergsturz",
  "bildmotiv": "Felssturz Berglandschaft",
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
  "coordinates": { "lat": 46.3167, "lng": 7.21 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "wildesheer",
  "title": "Das Wilde Heer über dem Säntis",
  "canton": "Appenzell Ausserrhoden",
  "coreMotif": "Geisterzug und Warnung",
  "bildmotiv": "Säntis Gewitterhimmel",
  "mood": "Unheimlich, nächtlich",
  "summary": "In stürmischen Nächten, so erzählt man sich im Appenzellerland, zieht das Wilde Heer mit Hundegebell und Hörnerklang über die Grate des Alpsteins. Wer draussen dem Zug begegnet, soll sich mit dem Gesicht zu Boden werfen und stillhalten, bis der Spuk vorüber ist – wer ihn ansieht oder ihm nachruft, wird mitgerissen und erst weit entfernt, verstört und ohne Erinnerung, wiedergefunden.",
  "summaries": {
    "gsw": {
      "text": "In stürmische Nächt zieht s Wild Heer mit Hundgibell und Hörnerchlang über d Grat vom Alpstei. Wer em begegnet, sött sich uf de Bode gheie und stillhebe, bis dr Spuk verbi isch – wer nahluegt, wird mitgrisse.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "In stürmischen Nächten, so erzählt man sich im Appenzellerland, zieht das Wilde Heer mit Hundegebell und Hörnerklang über die Grate des Alpsteins. Wer draussen dem Zug begegnet, soll sich mit dem Gesicht zu Boden werfen und stillhalten, bis der Spuk vorüber ist – wer ihn ansieht oder ihm nachruft, wird mitgerissen und erst weit entfernt, verstört und ohne Erinnerung, wiedergefunden.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Par nuit d'orage, dit-on en Appenzell, la Chasse sauvage traverse les crêtes de l'Alpstein dans un fracas d'aboiements et de cors. Qui la croise doit se jeter au sol et rester immobile jusqu'à ce que le cortège passe – celui qui le regarde ou l'interpelle est emporté et retrouvé bien plus loin, hagard et sans mémoire.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nelle notti di tempesta, si racconta in Appenzello, la Caccia selvaggia attraversa le creste dell'Alpstein tra latrati e suoni di corno. Chi la incontra deve gettarsi a terra e restare immobile finché il corteo non è passato – chi lo guarda o lo chiama viene trascinato via e ritrovato lontano, sconvolto e senza memoria.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "On stormy nights, they say in Appenzell, the Wild Hunt sweeps across the ridges of the Alpstein amid barking hounds and blaring horns. Anyone who meets it must fall face-down and lie still until the ghostly train has passed – whoever looks at it or calls out is swept away, found later far off, dazed and without memory.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在阿彭策尔，人们说暴风雨之夜，狂野军团伴着犬吠号角声掠过阿尔卑斯坦因的山脊。遇见它的人必须俯身伏地，一动不动直到队伍过去——凡是看它或呼喊的人都会被卷走，事后在远方被发现，神志恍惚，全无记忆。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En noches de tormenta, se cuenta en Appenzell, la Hueste Salvaje cruza las crestas del Alpstein entre ladridos y sonidos de cuerno. Quien la encuentra debe tirarse boca abajo y quedarse quieto hasta que pase el cortejo espectral – quien lo mira o lo llama es arrastrado y hallado luego muy lejos, aturdido y sin memoria.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Em noites de tempestade, conta-se em Appenzell, a Hoste Selvagem atravessa as cristas do Alpstein entre latidos e sons de corneta. Quem a encontra deve atirar-se ao chão e ficar imóvel até o cortejo passar – quem olha ou grita é arrastado e encontrado depois bem longe, atordoado e sem memória.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Das Verschwinden von Menschen andeuten statt ausschmücken; die Regel (hinlegen, still bleiben) als Kern der Geschichte betonen.",
  "quelle": {
    "autor": "Titus Tobler",
    "werk": "Appenzellischer Sprachschatz",
    "jahr": "1837",
    "fundstelleUrl": "https://archive.org/stream/appenzellischer00toblgoog/appenzellischer00toblgoog_djvu.txt"
  },
  "source": "Titus Tobler: Appenzellischer Sprachschatz (1837)",
  "coordinates": { "lat": 47.25, "lng": 9.3167 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "sennentuntschi",
  "title": "Das Sennentuntschi im Alpstein",
  "canton": "Appenzell Innerrhoden",
  "coreMotif": "Erschaffenes Wesen und Hybris",
  "bildmotiv": "Alphütte Alpstein",
  "mood": "Beklemmend, warnend",
  "summary": "Auf einer einsamen Alp im Alpstein sollen sich die Sennen einst aus Stroh, Lumpen und Kuhmilch eine Puppe gemacht haben, um sich über den einsamen Alpsommer hinwegzuscherzen – das Sennentuntschi. In der Nacht, so heisst es, erwachte die Puppe zum Leben und rächte sich furchtbar für den Spott, mit dem man sie geschaffen hatte, ehe sie mit dem ersten Läuten der Talglocken spurlos verschwand.",
  "summaries": {
    "gsw": {
      "text": "Uf ere einsame Alp händ Senne einisch us Stroh und Lumpe e Bappe gmacht zum Zitvertrib – s Sennetuntschi. Znacht isch d Bappe lebändig worde und hät sich fürchterlich grächt für dr Spott, bis si mit em erschte Glüüt vom Tal spurlos verschwunde isch.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Auf einer einsamen Alp im Alpstein sollen sich die Sennen einst aus Stroh, Lumpen und Kuhmilch eine Puppe gemacht haben, um sich über den einsamen Alpsommer hinwegzuscherzen – das Sennentuntschi. In der Nacht, so heisst es, erwachte die Puppe zum Leben und rächte sich furchtbar für den Spott, mit dem man sie geschaffen hatte, ehe sie mit dem ersten Läuten der Talglocken spurlos verschwand.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Sur un alpage isolé de l'Alpstein, les bergers auraient façonné jadis, avec de la paille, des chiffons et du lait de vache, une poupée pour tromper l'ennui de l'été – le Sennentuntschi. La nuit venue, dit-on, la poupée s'anima et se vengea terriblement de la moquerie qui l'avait créée, avant de disparaître sans laisser de trace au premier son des cloches de la vallée.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Su un alpeggio isolato dell'Alpstein, i pastori avrebbero un tempo creato con paglia, stracci e latte di mucca una bambola per ingannare la noia dell'estate alpina – il Sennentuntschi. Di notte, si dice, la bambola prese vita e si vendicò terribilmente della beffa con cui era stata creata, prima di sparire senza lasciare traccia al primo suono delle campane a valle.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "On a lonely alp in the Alpstein, the herdsmen are said to have once fashioned a doll from straw, rags and cow's milk to pass the lonely summer – the Sennentuntschi. At night, it is said, the doll came to life and took terrible revenge for the mockery that had created her, before vanishing without trace at the first ringing of the valley bells.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在阿尔卑斯坦因一处孤零零的高山牧场上，牧人们据说曾用稻草、破布和牛奶做了一个人偶，用来打发孤独的夏天——森嫩通奇。传说夜里人偶活了过来，为自己被戏弄而创造出来而展开可怕的复仇，直到山谷的钟声第一次响起才无影无踪地消失。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En un alpe solitario del Alpstein, los pastores habrían fabricado antaño con paja, trapos y leche de vaca una muñeca para engañar el tedio del verano – el Sennentuntschi. De noche, se dice, la muñeca cobró vida y se vengó terriblemente de la burla que la había creado, antes de desaparecer sin dejar rastro al primer toque de las campanas del valle.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Num alpe isolado do Alpstein, os pastores teriam outrora feito com palha, trapos e leite de vaca uma boneca para enganar o tédio do verão – o Sennentuntschi. À noite, diz-se, a boneca ganhou vida e vingou-se terrivelmente do escárnio que a criara, antes de desaparecer sem deixar rasto ao primeiro toque dos sinos do vale.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Rache stark abmildern und andeuten statt schildern; den Kern (Spott hat Folgen) für jüngere Kinder betonen.",
  "quelle": {
    "autor": "Titus Tobler",
    "werk": "Appenzellischer Sprachschatz",
    "jahr": "1837",
    "fundstelleUrl": "https://archive.org/stream/appenzellischer00toblgoog/appenzellischer00toblgoog_djvu.txt"
  },
  "source": "Titus Tobler: Appenzellischer Sprachschatz (1837)",
  "coordinates": { "lat": 47.2833, "lng": 9.4 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "raegemaennli",
  "title": "S'Rägemännli von Zunzgen",
  "canton": "Basel-Landschaft",
  "coreMotif": "Warnendes Geisterwesen",
  "bildmotiv": "Nebelwald Schweiz",
  "mood": "Schaurig, ländlich",
  "summary": "Bei Zunzgen im Baselbiet soll nachts das Rägemännli umgehen, ein kleines, tropfnasses Wesen, das an bestimmten Stellen des Weges auftaucht. Kühe und Hunde weigerten sich, so erzählt man, an dieser Stelle vorbeizugehen und sträubten sich mit aller Kraft, sobald sie in die Nähe kamen – als spürten die Tiere etwas, das den Menschen verborgen blieb.",
  "summaries": {
    "gsw": {
      "text": "Bi Zunzge im Baselbiet soll znacht s Rägemännli umegoh, es chlises, tropfnasses Wäse, wo a gwüsse Stelle vom Wäg uftaucht. Küeh und Hünd hend sich gweigeret, a dere Stell verbizgoh.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Bei Zunzgen im Baselbiet soll nachts das Rägemännli umgehen, ein kleines, tropfnasses Wesen, das an bestimmten Stellen des Weges auftaucht. Kühe und Hunde weigerten sich, so erzählt man, an dieser Stelle vorbeizugehen und sträubten sich mit aller Kraft, sobald sie in die Nähe kamen – als spürten die Tiere etwas, das den Menschen verborgen blieb.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Près de Zunzgen, dans le Baselbiet, un petit être ruisselant nommé Rägemännli hanterait la nuit certains passages du chemin. Vaches et chiens, dit-on, refusaient d'y passer et résistaient de toutes leurs forces dès qu'ils s'en approchaient – comme s'ils sentaient une présence restée invisible aux hommes.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Presso Zunzgen, nel Baselbiet, un piccolo essere gocciolante chiamato Rägemännli vagherebbe di notte in certi punti del sentiero. Mucche e cani, si racconta, si rifiutavano di passare di lì e resistevano con tutte le forze appena si avvicinavano – come se percepissero qualcosa rimasto invisibile agli uomini.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Near Zunzgen in the Baselbiet, a small dripping-wet being called the Rägemännli is said to haunt certain spots along the path at night. Cows and dogs, it is told, refused to pass that place and resisted with all their strength as they drew near – as though the animals sensed something hidden from people.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在巴塞尔乡村的聪岑镇附近，据说夜里会出现一个浑身湿漉漉的小怪——雨人。牛和狗据说都不肯走那段路，一靠近就死命地抗拒，仿佛察觉到了人类感觉不到的东西。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Cerca de Zunzgen, en el Baselbiet, un pequeño ser chorreante llamado Rägemännli rondaría de noche ciertos puntos del camino. Vacas y perros, se cuenta, se negaban a pasar por ese lugar y se resistían con todas sus fuerzas al acercarse – como si los animales percibieran algo oculto a los humanos.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Perto de Zunzgen, no Baselbiet, um pequeno ser encharcado chamado Rägemännli rondaria à noite certos pontos do caminho. Vacas e cães, conta-se, recusavam-se a passar por ali e resistiam com todas as forças ao se aproximarem – como se sentissem algo oculto aos humanos.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Das Rägemännli eher als scheues denn als bedrohliches Wesen zeichnen; das Verhalten der Tiere als Spannungsmoment nutzen.",
  "quelle": {
    "autor": "Otto Sutermeister",
    "werk": "Schweizer Sagen",
    "jahr": "1874",
    "fundstelleUrl": "https://de.wikisource.org/wiki/Otto_Sutermeister"
  },
  "source": "Otto Sutermeister: Schweizer Sagen (1874); mündliche Überlieferung Baselbiet",
  "coordinates": { "lat": 47.4667, "lng": 7.8167 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "vogelgryff",
  "title": "Der Vogel Gryff von Kleinbasel",
  "canton": "Basel-Stadt",
  "coreMotif": "Stadtwappen und Rivalität",
  "bildmotiv": "Vogel Gryff Basel",
  "mood": "Feierlich, stolz",
  "summary": "Kleinbasel, das rechtsrheinische Basel, führt seit alter Zeit den Greifen im Wappen und feiert ihn als Vogel Gryff mit einem eigenen Ehrentag. Der Legende nach war es der stolze Greif, der die kleinbasler Seite des Rheins gegen die grossbaslerische Seite verteidigte, als beide Ufer noch getrennte Städte waren – bis heute wirft der Vogel Gryff bei seinem Auftritt einen Blick über den Rhein, ohne ihn je zu überqueren.",
  "summaries": {
    "gsw": {
      "text": "Chliibasel füehrt scho lang de Griff im Wappe und fiiret en als Vogel Gryff mit eme eigene Ehretag. D Sag verzellt, dr stolz Griff heig d Chliibasler Site vom Rhy verteidigt gäge d Grossbasler Site, wo dazumal no zwei getrennte Stett gsi sind. Bis hüt luegt dr Vogel Gryff bi sinem Uftritt über de Rhy abe – überquert en aber nie.",
      "reviewEmpfohlen": false
    },
    "de": {
      "text": "Kleinbasel, das rechtsrheinische Basel, führt seit alter Zeit den Greifen im Wappen und feiert ihn als Vogel Gryff mit einem eigenen Ehrentag. Der Legende nach war es der stolze Greif, der die kleinbasler Seite des Rheins gegen die grossbaslerische Seite verteidigte, als beide Ufer noch getrennte Städte waren – bis heute wirft der Vogel Gryff bei seinem Auftritt einen Blick über den Rhein, ohne ihn je zu überqueren.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Petit-Bâle, la rive droite du Rhin, porte depuis longtemps le griffon dans ses armoiries et le célèbre comme l'Oiseau Gryff lors d'une journée qui lui est dédiée. La légende veut que le fier griffon ait défendu la rive de Petit-Bâle contre celle de Grand-Bâle, à l'époque où les deux rives formaient des villes distinctes – aujourd'hui encore, l'Oiseau Gryff jette un regard par-dessus le Rhin sans jamais le traverser.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Klein-Basel, la sponda destra del Reno, porta da tempi antichi il grifone nello stemma e lo celebra come Vogel Gryff con una giornata a lui dedicata. La leggenda narra che il fiero grifone difendesse la sponda di Klein-Basel contro quella di Gross-Basel, quando le due rive erano ancora città separate – ancora oggi il Vogel Gryff getta uno sguardo oltre il Reno, senza mai attraversarlo.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Kleinbasel, the right bank of the Rhine, has long borne the griffin in its coat of arms and celebrates it as the Vogel Gryff with its own day of honour. Legend says the proud griffin once defended the Kleinbasel shore against the Grossbasel side, back when the two banks were separate towns – to this day the Vogel Gryff casts a glance across the Rhine during its appearance, but never crosses it.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "小巴塞尔（莱茵河右岸）自古在徽章上使用狮鹫，并以“狮鹫鸟”之名为它设立专属荣誉日。传说中，当两岸还是分开的城镇时，正是这只骄傲的狮鹫守卫着小巴塞尔一侧，抵御大巴塞尔一侧——直到今天，狮鹫鸟出场时仍会隔河望一眼，却从不渡河。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Klein-Basel, la orilla derecha del Rin, lleva desde antiguo el grifo en su escudo y lo celebra como el Vogel Gryff con un día propio en su honor. Cuenta la leyenda que el orgulloso grifo defendía la orilla de Klein-Basel frente a la de Gross-Basel, cuando ambas riberas eran todavía ciudades separadas – aún hoy el Vogel Gryff lanza una mirada al otro lado del Rin durante su aparición, sin cruzarlo jamás.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Klein-Basel, a margem direita do Reno, ostenta desde há muito o grifo em seu brasão e celebra-o como Vogel Gryff com um dia próprio de honra. A lenda conta que o orgulhoso grifo defendia a margem de Klein-Basel contra a de Gross-Basel, quando as duas margens ainda eram cidades separadas – até hoje o Vogel Gryff lança um olhar sobre o Reno em sua aparição, mas nunca o atravessa.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Den Wettstreit der Stadtteile als freundliche Rivalität schildern, nicht als echten Konflikt.",
  "quelle": {
    "autor": "Basler Chronisten (mündliche und zünftische Überlieferung)",
    "werk": "Vogel-Gryff-Brauchtum",
    "jahr": "16. Jahrhundert",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Vogel_Gryff"
  },
  "source": "Basler Zunft- und Brauchtumsüberlieferung, Vogel Gryff (dokumentiert seit dem 16. Jahrhundert)",
  "coordinates": { "lat": 47.568, "lng": 7.596 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "zaehringerbaer",
  "title": "Die Bärensage von Bern",
  "canton": "Bern",
  "coreMotif": "Stadtgründung und Namensgebung",
  "bildmotiv": "Braunbär",
  "mood": "Feierlich, gründungsmythisch",
  "summary": "Als Herzog Berchtold V. von Zähringen 1191 an der Aare eine neue Stadt gründen liess, so berichtet die alte Berner Chronik, wollte er sie nach dem ersten Tier benennen, das man bei der Jagd im umliegenden Wald erlegen würde. Es war ein Bär – und so erhielt die Stadt ihren Namen Bern und ihr Wappentier, dem man bis heute im Bärengraben nahe der Altstadt begegnet.",
  "summaries": {
    "gsw": {
      "text": "Wo Herzog Berchtold V. vo Zähringe 1191 a dr Aare e nöii Stadt hät wele gründe, hät er gwellt, si nach em erschte Tier näne, wo mer im Wald erlegt. Das isch e Bär gsi – drum heisst d Stadt Bern.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Als Herzog Berchtold V. von Zähringen 1191 an der Aare eine neue Stadt gründen liess, so berichtet die alte Berner Chronik, wollte er sie nach dem ersten Tier benennen, das man bei der Jagd im umliegenden Wald erlegen würde. Es war ein Bär – und so erhielt die Stadt ihren Namen Bern und ihr Wappentier, dem man bis heute im Bärengraben nahe der Altstadt begegnet.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Lorsque le duc Berchtold V de Zähringen fonda en 1191 une nouvelle ville sur les rives de l'Aar, rapporte l'ancienne chronique bernoise, il voulut la nommer d'après le premier animal qu'on abattrait à la chasse dans la forêt environnante. Ce fut un ours – d'où le nom de Berne et son animal emblème, que l'on croise encore aujourd'hui dans la fosse aux ours près de la vieille ville.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Quando nel 1191 il duca Bertoldo V di Zähringen fondò una nuova città sulle rive dell'Aare, racconta l'antica cronaca bernese, volle darle il nome del primo animale che si fosse abbattuto a caccia nella foresta circostante. Fu un orso – da qui il nome di Berna e il suo animale araldico, che ancora oggi si incontra nella fossa degli orsi vicino alla città vecchia.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "When Duke Berchtold V of Zähringen founded a new city on the river Aare in 1191, the old Bernese chronicle relates, he wanted to name it after the first animal killed on a hunt in the surrounding forest. It was a bear – so the city was named Bern, and its heraldic animal can still be met today in the bear pit near the old town.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "1191年，采林根公爵贝希托尔德五世在阿勒河畔建立新城时，据古老的伯尔尼编年史记载，他打算以狩猎中猎获的第一种动物为城市命名。结果猎到的是一只熊——于是这座城市得名伯尔尼，其纹章动物至今仍能在老城旁的熊苑中见到。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Cuando el duque Berchtold V de Zähringen fundó en 1191 una nueva ciudad a orillas del río Aar, relata la antigua crónica bernesa, quiso llamarla como el primer animal que se abatiera en una cacería en el bosque circundante. Fue un oso – de ahí el nombre de Berna y su animal heráldico, al que aún hoy se encuentra en el foso de los osos junto al casco antiguo.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Quando o duque Berchtold V de Zähringen fundou em 1191 uma nova cidade às margens do rio Aar, relata a antiga crônica bernense, quis nomeá-la a partir do primeiro animal abatido numa caçada na floresta ao redor. Foi um urso – daí o nome de Berna e seu animal heráldico, que ainda hoje se encontra no fosso dos ursos perto da cidade velha.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Jagd nicht ausschmücken; den Namensfund als spielerisches Gründungsrätsel erzählen.",
  "quelle": {
    "autor": "Konrad Justinger",
    "werk": "Berner Chronik",
    "jahr": "ca. 1420",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Konrad_Justinger"
  },
  "source": "Konrad Justinger: Berner Chronik (ca. 1420)",
  "coordinates": { "lat": 46.948, "lng": 7.4474 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "schwarzsee",
  "title": "Die Sage vom Schwarzsee",
  "canton": "Freiburg",
  "coreMotif": "Verfluchtes Dorf und Strafe",
  "bildmotiv": "Schwarzsee Freiburg",
  "mood": "Düster, mahnend",
  "summary": "Wo heute der Schwarzsee im Sensebezirk liegt, so erzählt man im Freiburgischen, habe einst ein Dorf gestanden, dessen Bewohner in Wohlstand und Übermut die Gastfreundschaft und die Frömmigkeit vergassen. Zur Strafe versank das Dorf über Nacht in den Fluten, und seither soll man in stillen Nächten Glocken aus der Tiefe des dunklen Sees läuten hören.",
  "summaries": {
    "gsw": {
      "text": "Wo hüt dr Schwarzsee im Sensebezirk lyt, heig einisch es Dorf gstande, wo mit sim Wohlstand vergässe hät, gastfründlich z si. Zur Strof isch s Dorf über Nacht im Wasser versunke.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Wo heute der Schwarzsee im Sensebezirk liegt, so erzählt man im Freiburgischen, habe einst ein Dorf gestanden, dessen Bewohner in Wohlstand und Übermut die Gastfreundschaft und die Frömmigkeit vergassen. Zur Strafe versank das Dorf über Nacht in den Fluten, und seither soll man in stillen Nächten Glocken aus der Tiefe des dunklen Sees läuten hören.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Là où se trouve aujourd'hui le Lac Noir, dans la Singine, se serait dressé jadis un village dont les habitants, prospères et arrogants, avaient oublié l'hospitalité et la piété. En punition, le village s'engloutit une nuit sous les flots, et depuis, par nuits calmes, on entendrait sonner des cloches venues des profondeurs du lac sombre.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Dove oggi si trova il Lago Nero, nel distretto della Singine, sorgeva un tempo un villaggio i cui abitanti, prosperi e arroganti, avevano dimenticato l'ospitalità e la devozione. Come punizione, il villaggio sprofondò in una notte sotto le acque, e da allora, nelle notti tranquille, si udirebbero campane suonare dalle profondità del lago scuro.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Where the Schwarzsee lies today in the Sense district, it is told in Fribourg, a village once stood whose prosperous, arrogant people forgot hospitality and piety. As punishment the village sank beneath the waters overnight, and ever since, on quiet nights, bells are said to be heard ringing from the depths of the dark lake.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在弗里堡的桑森地区，如今黑湖所在之处，据说曾有一座村庄，村民因富足而傲慢，忘记了待客之道与虔诚之心。作为惩罚，村庄一夜之间沉入水底，从此在寂静的夜晚，人们说能听到钟声从幽暗湖底传来。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Donde hoy se encuentra el Lago Negro, en el distrito de Sense, se cuenta en Friburgo que antaño hubo un pueblo cuyos habitantes, prósperos y arrogantes, olvidaron la hospitalidad y la piedad. Como castigo, el pueblo se hundió una noche bajo las aguas, y desde entonces, en noches tranquilas, se dice que se oyen campanas repicar desde las profundidades del oscuro lago.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Onde hoje fica o Lago Negro, no distrito de Sense, conta-se em Friburgo que outrora houve uma aldeia cujos habitantes, prósperos e arrogantes, esqueceram a hospitalidade e a piedade. Como castigo, a aldeia afundou numa noite sob as águas, e desde então, em noites tranquilas, dizem ouvir-se sinos a tocar das profundezas do lago escuro.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Strafe als Naturereignis erzählen, nicht als Ertrinken von Menschen ausmalen; das Glockenläuten als geheimnisvolles Detail betonen.",
  "quelle": {
    "autor": "Theodor Vernaleken",
    "werk": "Alpensagen",
    "jahr": "1858",
    "fundstelleUrl": "https://archive.org/details/alpensagen00verngoog"
  },
  "source": "Theodor Vernaleken: Alpensagen (1858)",
  "coordinates": { "lat": 46.6667, "lng": 7.2333 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "escalade",
  "title": "Die Marmite der Mère Royaume",
  "canton": "Genf",
  "coreMotif": "Verteidigung und Mutprobe",
  "bildmotiv": "Escalade Genf Fackelzug",
  "mood": "Spannend, patriotisch",
  "summary": "In der Nacht vom 11. auf den 12. Dezember 1602 versuchten savoyische Truppen mit Leitern die Mauern von Genf zu erklimmen, die Stadt zu überfallen. Der Legende nach schüttete eine wache Hausfrau, die Mère Royaume, kochende Gemüsesuppe aus ihrem Kessel über die Angreifer und schlug damit sogar einen Soldaten nieder – ihr Alarmruf weckte die Stadt, die die Escalade zurückschlug.",
  "summaries": {
    "gsw": {
      "text": "In dr Nacht vom 11. uf 12. Dezember 1602 händ savoyischi Truppe mit Leitere d Muure vo Genf wele erchlimme. E wachsami Huisfrau, d Mère Royaume, hät ne heissi Gmüesuppe über d Chöpf gschüttet und so Alarm gschlage.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "In der Nacht vom 11. auf den 12. Dezember 1602 versuchten savoyische Truppen mit Leitern die Mauern von Genf zu erklimmen, die Stadt zu überfallen. Der Legende nach schüttete eine wache Hausfrau, die Mère Royaume, kochende Gemüsesuppe aus ihrem Kessel über die Angreifer und schlug damit sogar einen Soldaten nieder – ihr Alarmruf weckte die Stadt, die die Escalade zurückschlug.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Dans la nuit du 11 au 12 décembre 1602, des troupes savoyardes tentèrent d'escalader les remparts de Genève à l'aide d'échelles pour surprendre la ville. Selon la légende, une ménagère vigilante, la Mère Royaume, renversa sa marmite de soupe aux légumes bouillante sur les assaillants, assommant même un soldat – son cri d'alarme réveilla la ville, qui repoussa l'Escalade.",
      "reviewEmpfohlen": false
    },
    "it": {
      "text": "Nella notte tra l'11 e il 12 dicembre 1602, truppe sabaude tentarono di scalare le mura di Ginevra con delle scale per sorprendere la città. Secondo la leggenda, una massaia vigile, la Mère Royaume, rovesciò la sua pentola di zuppa di verdure bollente sugli assalitori, stordendo persino un soldato – il suo grido d'allarme svegliò la città, che respinse l'Escalade.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "On the night of 11 to 12 December 1602, Savoyard troops tried to scale the walls of Geneva with ladders to storm the city. According to legend, an alert housewife, the Mère Royaume, tipped a cauldron of boiling vegetable soup over the attackers, even knocking out a soldier – her cry of alarm woke the city, which drove back the Escalade.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "1602年12月11日至12日夜间，萨伏依军队企图用梯子攀爬日内瓦城墙偷袭。传说一位machine警惕的家庭主妇“王后母亲”把一锅滚烫的蔬菜汤浇向攻城者，甚至砸倒了一名士兵——她的警报声惊醒全城，日内瓦人击退了这次“攀城之夜”袭击。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En la noche del 11 al 12 de diciembre de 1602, tropas saboyanas intentaron escalar las murallas de Ginebra con escaleras para asaltar la ciudad. Según la leyenda, una ama de casa vigilante, la Mère Royaume, volcó su caldero de sopa de verduras hirviendo sobre los atacantes, derribando incluso a un soldado – su grito de alarma despertó a la ciudad, que repelió la Escalade.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Na noite de 11 para 12 de dezembro de 1602, tropas saboianas tentaram escalar as muralhas de Genebra com escadas para atacar a cidade. Segundo a lenda, uma dona de casa vigilante, a Mère Royaume, despejou um caldeirão de sopa de legumes fervente sobre os atacantes, derrubando até um soldado – seu grito de alarme despertou a cidade, que repeliu a Escalade.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Marmite und den Mut der Mère Royaume in den Vordergrund stellen, den Kampf selbst nur andeuten.",
  "quelle": {
    "autor": "Genfer Chronisten",
    "werk": "Überlieferung zur Escalade von 1602",
    "jahr": "1602",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Escalade"
  },
  "source": "Genfer Chronik-Überlieferung zur Escalade (1602)",
  "coordinates": { "lat": 46.2044, "lng": 6.1432 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "fridolin",
  "title": "Der heilige Fridolin und der tote Bruder",
  "canton": "Glarus",
  "coreMotif": "Wunder und Gerechtigkeit",
  "bildmotiv": "Heiliger Fridolin Statue",
  "mood": "Feierlich, wundersam",
  "summary": "Der heilige Fridolin, so berichtet die alte Legende, habe für ein Kloster Land geschenkt bekommen, doch nach dem Tod des Schenkers bestritt dessen Bruder die Gültigkeit vor Gericht. Da liess Fridolin den Toten aus dem Grab rufen: Der Leichnam erhob sich, bezeugte die Schenkung vor allen Anwesenden und legte sich danach wieder zur Ruhe – bis heute zeigt das Glarner Wappen Fridolin mit einem Skelett an seiner Seite.",
  "summaries": {
    "gsw": {
      "text": "Dr heilig Fridolin heig für es Chloster Land gschänkt übercho, doch dr Brueder vom Schänker hät s vor Gricht bestritte. Do hät Fridolin dr Tote us em Grab grüeft, wo vor allne bezügt hät.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Der heilige Fridolin, so berichtet die alte Legende, habe für ein Kloster Land geschenkt bekommen, doch nach dem Tod des Schenkers bestritt dessen Bruder die Gültigkeit vor Gericht. Da liess Fridolin den Toten aus dem Grab rufen: Der Leichnam erhob sich, bezeugte die Schenkung vor allen Anwesenden und legte sich danach wieder zur Ruhe – bis heute zeigt das Glarner Wappen Fridolin mit einem Skelett an seiner Seite.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Saint Fridolin, rapporte l'ancienne légende, aurait reçu des terres pour un monastère, mais après la mort du donateur, son frère en contesta la validité devant le tribunal. Fridolin fit alors appeler le mort hors de sa tombe : le défunt se leva, témoigna du don devant l'assemblée, puis se recoucha en paix – aujourd'hui encore, les armoiries de Glaris montrent Fridolin accompagné d'un squelette.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "San Fridolino, racconta l'antica leggenda, avrebbe ricevuto terre per un monastero, ma dopo la morte del donatore il fratello ne contestò la validità davanti al tribunale. Fridolino fece allora chiamare il morto dalla tomba: il defunto si alzò, testimoniò la donazione davanti a tutti i presenti e poi si ricoricò in pace – ancora oggi lo stemma di Glarona mostra Fridolino accanto a uno scheletro.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Saint Fridolin, the old legend relates, was given land for a monastery, but after the donor's death his brother disputed it in court. So Fridolin summoned the dead man from his grave: the corpse rose, testified to the gift before all present, and then lay down to rest again – to this day the coat of arms of Glarus shows Fridolin beside a skeleton.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "古老传说讲述，圣弗里多林曾获赠土地用于建修道院，但施主去世后其兄弟在法庭上否认此事。于是弗里多林把死者从坟墓中唤醒：尸体站起，在众人面前证实了赠地一事，随后重新安息——至今格拉鲁斯州的纹章上仍描绘着弗里多林与一具骸骨相伴。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "San Fridolino, relata la antigua leyenda, recibió tierras para un monasterio, pero tras la muerte del donante, su hermano impugnó la donación ante el tribunal. Entonces Fridolino hizo llamar al muerto desde su tumba: el cadáver se levantó, testificó la donación ante todos los presentes y luego volvió a descansar – aún hoy el escudo de Glaris muestra a Fridolino junto a un esqueleto.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "São Fridolino, narra a antiga lenda, recebeu terras para um mosteiro, mas após a morte do doador seu irmão contestou a doação em tribunal. Fridolino então fez chamar o morto do túmulo: o cadáver se ergueu, testemunhou a doação diante de todos e depois voltou a repousar – até hoje o brasão de Glarus mostra Fridolino ao lado de um esqueleto.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Das Wunder als friedliches Zeichen der Gerechtigkeit erzählen, den toten Bruder nicht gruselig ausmalen.",
  "quelle": {
    "autor": "mittelalterliche Vita Sancti Fridolini",
    "werk": "Fridolins-Legende",
    "jahr": "9.–10. Jahrhundert",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Fridolin_von_S%C3%A4ckingen"
  },
  "source": "Mittelalterliche Fridolins-Legende (Vita Sancti Fridolini)",
  "coordinates": { "lat": 47.0402, "lng": 9.067 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "flimserbergsturz",
  "title": "Die Sage vom Flimser Bergsturz",
  "canton": "Graubünden",
  "coreMotif": "Strafe und Landschaftsentstehung",
  "bildmotiv": "Bergsturz Flims Ruinaulta",
  "mood": "Gewaltig, erdverbunden",
  "summary": "Vor Urzeiten, so erzählt man in der Surselva, sollen Riesen im Zorn ganze Bergflanken oberhalb von Flims losgerissen und ins Tal geschleudert haben. Der gewaltige Trümmerstrom begrub Wälder und Täler unter sich und formte die schroffe Rheinschlucht, durch die der Vorderrhein bis heute seinen Weg sucht.",
  "summaries": {
    "gsw": {
      "text": "Vor Urzyte händ Rise im Zorn ganzi Bergflanke ob Flims losgrisse und is Tal gheit. Dr gwaltig Trümmerstrom hät Wälder und Täler begrabe und d RhySchlucht gforme.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Vor Urzeiten, so erzählt man in der Surselva, sollen Riesen im Zorn ganze Bergflanken oberhalb von Flims losgerissen und ins Tal geschleudert haben. Der gewaltige Trümmerstrom begrub Wälder und Täler unter sich und formte die schroffe Rheinschlucht, durch die der Vorderrhein bis heute seinen Weg sucht.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Aux temps anciens, raconte-t-on en Surselva, des géants en colère auraient arraché des pans entiers de montagne au-dessus de Flims et les auraient précipités dans la vallée. L'énorme coulée de débris ensevelit forêts et vallées, façonnant les gorges abruptes du Rhin où le Rhin antérieur cherche encore aujourd'hui son passage.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nei tempi antichi, si racconta in Surselva, dei giganti adirati avrebbero strappato interi fianchi di montagna sopra Flims scagliandoli a valle. L'enorme colata di detriti seppellì boschi e valli, plasmando la scoscesa gola del Reno attraverso cui il Reno Anteriore cerca ancora oggi la sua via.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "In ancient times, they say in the Surselva, angry giants tore whole mountainsides loose above Flims and hurled them into the valley. The huge stream of rubble buried forests and valleys beneath it, shaping the rugged Rhine gorge through which the Anterior Rhine still finds its way today.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "苏尔塞尔瓦地区传说，远古时代愤怒的巨人曾把弗林斯上方整片山坡撕裂，扔进山谷。巨量岩屑掩埋了森林与山谷，塑造出如今莱茵河前段仍在其中蜿蜒穿行的陡峭莱茵峡谷。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En tiempos remotos, se cuenta en la Surselva, gigantes furiosos habrían arrancado laderas enteras sobre Flims y las habrían lanzado al valle. La enorme corriente de escombros sepultó bosques y valles, dando forma a la escarpada garganta del Rin por la que el Rin Anterior todavía busca su camino hoy en día.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Em tempos remotos, conta-se na Surselva, gigantes furiosos teriam arrancado encostas inteiras acima de Flims e as lançado ao vale. A enorme torrente de detritos soterrou florestas e vales, moldando o íngreme desfiladeiro do Reno pelo qual o Reno Anterior ainda hoje busca seu caminho.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Zerstörung als urzeitliches Naturereignis erzählen, nicht auf Menschenopfer eingehen.",
  "quelle": {
    "autor": "Theodor Vernaleken",
    "werk": "Alpensagen",
    "jahr": "1858",
    "fundstelleUrl": "https://archive.org/details/alpensagen00verngoog"
  },
  "source": "Theodor Vernaleken: Alpensagen (1858)",
  "coordinates": { "lat": 46.8333, "lng": 9.2833 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "rochedor",
  "title": "Die Roche d'Or bei Réclère",
  "canton": "Jura",
  "coreMotif": "Verborgener Schatz",
  "bildmotiv": "Felshöhle Jura",
  "mood": "Geheimnisvoll, lockend",
  "summary": "In den Wäldern bei Réclère im Jura liegt die Roche d'Or, der Goldfelsen, unter dem der Überlieferung nach ein Schatz verborgen liegt. Wer ihn heben will, muss schweigend und ohne Gier handeln – wer aber nach Gold gierte, so warnt die alte Geschichte, fand den Eingang zum Felsen für immer verschlossen.",
  "summaries": {
    "gsw": {
      "text": "Im Wald bi Réclère im Jura lyt d Roche d'Or, dr Goldfels, unter dem e Schatz verborge sy söll. Wer en wott hebe, muess still und ohni Gier handle.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "In den Wäldern bei Réclère im Jura liegt die Roche d'Or, der Goldfelsen, unter dem der Überlieferung nach ein Schatz verborgen liegt. Wer ihn heben will, muss schweigend und ohne Gier handeln – wer aber nach Gold gierte, so warnt die alte Geschichte, fand den Eingang zum Felsen für immer verschlossen.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Dans les forêts près de Réclère, dans le Jura, se dresse la Roche d'Or, sous laquelle la tradition situe un trésor caché. Qui veut le déterrer doit agir en silence et sans convoitise – mais quiconque convoitait l'or, avertit la vieille histoire, trouvait l'entrée du rocher fermée pour toujours.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nei boschi presso Réclère, nel Giura, sorge la Roche d'Or, sotto la quale la tradizione colloca un tesoro nascosto. Chi vuole dissotterrarlo deve agire in silenzio e senza avidità – ma chi bramava l'oro, avverte l'antica storia, trovava l'ingresso della roccia chiuso per sempre.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "In the woods near Réclère in the Jura stands the Roche d'Or, the golden rock, beneath which tradition places a hidden treasure. Whoever wants to raise it must act silently and without greed – but anyone who lusted after the gold, the old tale warns, found the entrance to the rock closed forever.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在汝拉州雷克莱尔附近的森林里矗立着金石，传说石下藏有宝藏。想取得宝藏的人必须默默无声、毫无贪念——但古老的故事警告说，凡是贪图黄金的人，都会发现石头的入口从此永远关闭。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En los bosques cerca de Réclère, en el Jura, se alza la Roche d'Or, la roca de oro, bajo la cual la tradición sitúa un tesoro escondido. Quien quiera desenterrarlo debe actuar en silencio y sin codicia – pero quien ansiara el oro, advierte la vieja historia, encontraba la entrada de la roca cerrada para siempre.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Nos bosques perto de Réclère, no Jura, ergue-se a Roche d'Or, sob a qual a tradição situa um tesouro escondido. Quem quiser desenterrá-lo deve agir em silêncio e sem cobiça – mas quem cobiçasse o ouro, avisa a velha história, encontrava a entrada da rocha fechada para sempre.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Botschaft (Gier wird bestraft, Bescheidenheit belohnt) klar herausstellen, ohne Drohszenen.",
  "quelle": {
    "autor": "jurassische Volksüberlieferung (Region Ajoie)",
    "werk": "Traditions populaires jurassiennes",
    "jahr": "19. Jahrhundert",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Alfred_Quiquerez"
  },
  "source": "Jurassische Volksüberlieferung, Region Ajoie (19. Jahrhundert)",
  "coordinates": { "lat": 47.4167, "lng": 6.9833 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "pilatusdrache",
  "title": "Der Drache vom Pilatus",
  "canton": "Luzern",
  "coreMotif": "Naturwunder und Wächterwesen",
  "bildmotiv": "Pilatus Drachenstein",
  "mood": "Ehrfürchtig, geheimnisvoll",
  "summary": "Schon im 16. Jahrhundert berichtete der Naturforscher Konrad Gessner von Sichtungen eines feuerspeienden Drachens am Pilatus bei Luzern. Der Sage nach hausen die Drachen in Höhlen tief im Berg und fliegen bei Unwettern über die Grate; einem Hirten soll ein Drache sogar das Leben gerettet haben, indem er ihn aus einer Felsspalte trug, in die er gestürzt war.",
  "summaries": {
    "gsw": {
      "text": "Scho im 16. Jahrhundert hät dr Naturforscher Konrad Gessner vo Sichtige vomene füürspiegende Drache am Pilatus bi Luzern verzellt. D Sag seit, d Drache husiget in Höhle tief im Berg.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Schon im 16. Jahrhundert berichtete der Naturforscher Konrad Gessner von Sichtungen eines feuerspeienden Drachens am Pilatus bei Luzern. Der Sage nach hausen die Drachen in Höhlen tief im Berg und fliegen bei Unwettern über die Grate; einem Hirten soll ein Drache sogar das Leben gerettet haben, indem er ihn aus einer Felsspalte trug, in die er gestürzt war.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Dès le XVIe siècle, le naturaliste Conrad Gessner rapportait des observations d'un dragon cracheur de feu sur le Pilatus, près de Lucerne. Selon la légende, les dragons habitent des grottes au cœur de la montagne et survolent les crêtes lors des orages; l'un d'eux aurait même sauvé la vie d'un berger en le sortant d'une crevasse où il était tombé.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Già nel XVI secolo il naturalista Conrad Gessner riferiva di avvistamenti di un drago sputafuoco sul Pilatus, presso Lucerna. Secondo la leggenda, i draghi abitano grotte nel cuore della montagna e volano sulle creste durante i temporali; uno di essi avrebbe persino salvato la vita a un pastore, tirandolo fuori da una crepa nella roccia in cui era caduto.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "As early as the 16th century, the naturalist Conrad Gessner reported sightings of a fire-breathing dragon on Mount Pilatus near Lucerne. According to legend, dragons dwell in caves deep within the mountain and fly over the ridges during storms; one dragon is even said to have saved a shepherd's life by carrying him out of a rock crevice into which he had fallen.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "早在16世纪，博物学家康拉德·格斯纳就曾记述在琉森附近的皮拉图斯山目击喷火巨龙。传说巨龙栖息在山中深处的洞穴里，暴风雨时会飞越山脊；据说曾有一条龙救过一名牧羊人的命，把跌入岩缝的他救了出来。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Ya en el siglo XVI, el naturalista Conrad Gessner relató avistamientos de un dragón que escupía fuego en el Pilatus, cerca de Lucerna. Según la leyenda, los dragones habitan cuevas en las profundidades de la montaña y sobrevuelan las crestas durante las tormentas; se dice que un dragón incluso salvó la vida de un pastor, sacándolo de una grieta rocosa en la que había caído.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Já no século XVI, o naturalista Conrad Gessner relatou avistamentos de um dragão cuspidor de fogo no Pilatus, perto de Lucerna. Segundo a lenda, os dragões habitam cavernas nas profundezas da montanha e sobrevoam as cristas durante as tempestades; um dragão teria até salvo a vida de um pastor, tirando-o de uma fenda rochosa na qual havia caído.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Den Drachen eher als beeindruckendes Naturwesen denn als Bedrohung zeichnen; die Rettung des Hirten betonen.",
  "quelle": {
    "autor": "Konrad Gessner",
    "werk": "Descriptio Montis Fracti (Pilatusbeschreibung)",
    "jahr": "1555",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Pilatus_(Berg)"
  },
  "source": "Konrad Gessner: Descriptio Montis Fracti (1555)",
  "coordinates": { "lat": 46.9764, "lng": 8.2544 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "vouivre",
  "title": "La Vouivre am Neuenburgersee",
  "canton": "Neuenburg",
  "coreMotif": "Wächterschlange und kostbares Auge",
  "bildmotiv": "Ringelnatter",
  "mood": "Funkelnd, gefährlich",
  "summary": "In den Wäldern rund um den Neuenburgersee soll die Vouivre umherziehen, eine geflügelte Schlange, die statt eines Auges einen leuchtenden Edelstein trägt. Vor dem Baden legt sie den Stein am Ufer ab – wer ihn stehlen könnte, würde reich, doch die Vouivre bemerkt jede Annäherung sofort und verfolgt jeden Dieb ohne Gnade.",
  "summaries": {
    "gsw": {
      "text": "Im Wald um dr Neuenburgersee söll d Vouivre umezieh, e gflügleti Schlange, wo statt emene Aug e leuchtende Edelstei treit. Vor em Bade legt si dr Stei ab – wer en chönnt schtähle, wird rych.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "In den Wäldern rund um den Neuenburgersee soll die Vouivre umherziehen, eine geflügelte Schlange, die statt eines Auges einen leuchtenden Edelstein trägt. Vor dem Baden legt sie den Stein am Ufer ab – wer ihn stehlen könnte, würde reich, doch die Vouivre bemerkt jede Annäherung sofort und verfolgt jeden Dieb ohne Gnade.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Dans les forêts autour du lac de Neuchâtel rôderait la Vouivre, un serpent ailé portant à la place d'un œil une pierre précieuse étincelante. Avant de se baigner, elle dépose la pierre sur la rive – qui parviendrait à la voler deviendrait riche, mais la Vouivre remarque aussitôt toute approche et poursuit sans merci quiconque tente de la dérober.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nei boschi attorno al lago di Neuchâtel vagherebbe la Vouivre, un serpente alato che porta al posto di un occhio una pietra preziosa luminosa. Prima di fare il bagno depone la pietra sulla riva – chi riuscisse a rubarla diventerebbe ricco, ma la Vouivre nota subito ogni avvicinamento e insegue senza pietà chiunque tenti il furto.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "In the forests around Lake Neuchâtel, the Vouivre is said to roam, a winged serpent bearing a glowing gemstone in place of one eye. Before bathing, she sets the stone down on the shore – whoever managed to steal it would become rich, but the Vouivre notices any approach at once and pursues any thief without mercy.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在纳沙泰尔湖周围的森林里，据说游荡着一条名为“沃维尔”的有翼蛇，它用一颗闪亮的宝石取代了一只眼睛。沐浴前，它会把宝石放在岸边——若有人能偷走它便可致富，但沃维尔会立刻察觉任何靠近，并毫不留情地追逐盗贼。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En los bosques alrededor del lago de Neuchâtel rondaría la Vouivre, una serpiente alada que lleva en lugar de un ojo una piedra preciosa reluciente. Antes de bañarse, deja la piedra en la orilla – quien lograra robarla se haría rico, pero la Vouivre nota de inmediato cualquier acercamiento y persigue sin piedad a todo ladrón.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Nas florestas ao redor do lago de Neuchâtel rondaria a Vouivre, uma serpente alada que traz no lugar de um olho uma pedra preciosa reluzente. Antes de se banhar, ela deixa a pedra na margem – quem conseguisse roubá-la ficaria rico, mas a Vouivre percebe de imediato qualquer aproximação e persegue sem piedade qualquer ladrão.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Verfolgung als spannend, nicht als blutig schildern; die Faszination des Edelsteins betonen.",
  "quelle": {
    "autor": "Charles Beauquier",
    "werk": "Traditions populaires (la légende de la Vouivre)",
    "jahr": "1897",
    "fundstelleUrl": "https://fr.wikipedia.org/wiki/Vouivre"
  },
  "source": "Charles Beauquier: Traditions populaires, la Vouivre (1897)",
  "coordinates": { "lat": 46.99, "lng": 6.93 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "winkelried",
  "title": "Arnold von Winkelried bei Sempach",
  "canton": "Nidwalden",
  "coreMotif": "Selbstopfer für die Gemeinschaft",
  "bildmotiv": "Arnold von Winkelried Denkmal",
  "mood": "Ergreifend, heldenhaft",
  "summary": "In der Schlacht bei Sempach 1386, so berichtet die alte Chronik, stand das Ritterheer der Habsburger mit ihren Lanzen wie eine unüberwindliche Mauer. Da soll Arnold von Winkelried aus Stans gerufen haben, man möge für Weib und Kind sorgen, und sich mit ausgebreiteten Armen in die Lanzenspitzen geworfen haben, um seinen Mitstreitern eine Gasse in die feindlichen Reihen zu bahnen.",
  "summaries": {
    "gsw": {
      "text": "I dr Schlacht bi Sempach 1386 hät s Ritterheer vo de Habsburger mit ihre Lanze wie e Muur gstande. Dert söll Arnold von Winkelried us Stans gruefe ha, mer sölli für Wyb und Chind sorge, und sich i d Lanze gheit ha.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "In der Schlacht bei Sempach 1386, so berichtet die alte Chronik, stand das Ritterheer der Habsburger mit ihren Lanzen wie eine unüberwindliche Mauer. Da soll Arnold von Winkelried aus Stans gerufen haben, man möge für Weib und Kind sorgen, und sich mit ausgebreiteten Armen in die Lanzenspitzen geworfen haben, um seinen Mitstreitern eine Gasse in die feindlichen Reihen zu bahnen.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "À la bataille de Sempach en 1386, rapporte l'ancienne chronique, l'armée de chevaliers des Habsbourg formait avec leurs lances un mur infranchissable. Arnold von Winkelried de Stans aurait alors crié qu'on prenne soin de sa femme et de ses enfants, avant de se jeter, bras écartés, sur les pointes des lances pour ouvrir à ses compagnons une brèche dans les rangs ennemis.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nella battaglia di Sempach del 1386, narra l'antica cronaca, l'esercito di cavalieri asburgici formava con le loro lance un muro invalicabile. Arnold von Winkelried di Stans avrebbe allora gridato di prendersi cura di sua moglie e dei suoi figli, gettandosi a braccia aperte sulle punte delle lance per aprire ai compagni un varco nelle file nemiche.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "At the Battle of Sempach in 1386, the old chronicle relates, the Habsburg knights' army stood with their lances like an impenetrable wall. Arnold von Winkelried of Stans is said to have called out that his wife and children be cared for, then thrown himself with arms outstretched onto the lance points to open a path for his comrades through the enemy ranks.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "据古老编年史记载，1386年桑帕赫战役中，哈布斯堡骑士军的长枪如铜墙铁壁般难以攻破。来自施坦斯的阿诺德·冯·温克尔里德据说高呼请人照顾他的妻儿，随后张开双臂扑向枪尖，为战友们在敌阵中撕开一条通道。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En la batalla de Sempach de 1386, relata la antigua crónica, el ejército de caballeros de los Habsburgo formaba con sus lanzas un muro infranqueable. Arnold von Winkelried, de Stans, habría gritado entonces que cuidaran de su esposa e hijos, y se habría lanzado con los brazos abiertos sobre las puntas de las lanzas para abrir a sus compañeros un paso entre las filas enemigas.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Na batalha de Sempach, em 1386, relata a antiga crônica, o exército de cavaleiros dos Habsburgo formava com suas lanças um muro intransponível. Arnold von Winkelried, de Stans, teria então gritado para que cuidassem de sua esposa e filhos, e se atirado de braços abertos sobre as pontas das lanças para abrir aos companheiros uma passagem nas fileiras inimigas.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Den Mut und die Fürsorge für die Familie betonen; die Kampfszene selbst nicht drastisch schildern.",
  "quelle": {
    "autor": "Petermann Etterlin",
    "werk": "Kronica von der loblichen Eydtgnoschaft",
    "jahr": "1507",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Arnold_von_Winkelried"
  },
  "source": "Petermann Etterlin: Kronica von der loblichen Eydtgnoschaft (1507)",
  "coordinates": { "lat": 46.9581, "lng": 8.3653 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "bruderklaus",
  "title": "Bruder Klaus und die Vision im Ranft",
  "canton": "Obwalden",
  "coreMotif": "Vision und Frieden",
  "bildmotiv": "Bruder Klaus Ranft",
  "mood": "Still, ehrfürchtig",
  "summary": "Niklaus von Flüe, genannt Bruder Klaus, verliess 1467 Frau und Kinder in Sachseln, um als Einsiedler in der Ranft-Schlucht zu leben. Der Überlieferung nach lebte er dort zwanzig Jahre lang ohne irdische Speise und hatte Visionen, die ihn 1481 dazu bewegten, den zerstrittenen Eidgenossen am Stanser Tagsatzung einen Rat zu senden, der den drohenden Bürgerkrieg abwendete.",
  "summaries": {
    "gsw": {
      "text": "Niklaus von Flüe, dr Bruder Klaus, hät 1467 Frau und Chind i Sachsle verlah, zum als Einsidler i dr Ranft-Schlucht z läbe. Er hät dört zwänzg Jahr ohni irdischi Spys glebt und Visione gha.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Niklaus von Flüe, genannt Bruder Klaus, verliess 1467 Frau und Kinder in Sachseln, um als Einsiedler in der Ranft-Schlucht zu leben. Der Überlieferung nach lebte er dort zwanzig Jahre lang ohne irdische Speise und hatte Visionen, die ihn 1481 dazu bewegten, den zerstrittenen Eidgenossen am Stanser Tagsatzung einen Rat zu senden, der den drohenden Bürgerkrieg abwendete.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Nicolas de Flüe, dit Frère Nicolas, quitta en 1467 sa femme et ses enfants à Sachseln pour vivre en ermite dans la gorge du Ranft. Selon la tradition, il y vécut vingt ans sans nourriture terrestre et eut des visions qui le poussèrent en 1481 à envoyer aux Confédérés divisés, réunis à la Diète de Stans, un conseil qui écarta la guerre civile menaçante.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nicola di Flüe, detto Fratel Klaus, lasciò nel 1467 moglie e figli a Sachseln per vivere da eremita nella gola del Ranft. Secondo la tradizione, vi visse vent'anni senza cibo terreno e ebbe visioni che nel 1481 lo spinsero a inviare ai Confederati divisi, riuniti alla Dieta di Stans, un consiglio che scongiurò la minacciata guerra civile.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Niklaus von Flüe, known as Brother Klaus, left his wife and children in Sachseln in 1467 to live as a hermit in the Ranft gorge. According to tradition he lived there for twenty years without earthly food and had visions that in 1481 moved him to send the quarrelling Confederates, gathered at the Diet of Stans, counsel that averted a threatening civil war.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "尼克劳斯·冯·弗吕，人称克劳斯修士，于1467年离开萨克斯伦的妻儿，前往兰夫特峡谷隐居。据传他在那里生活了二十年，不食人间烟火，还得到过异象启示，促使他在1481年向在斯坦斯议会上争执不下的各邦代表送去劝言，化解了一场一触即发的内战。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Niklaus von Flüe, llamado Hermano Klaus, dejó en 1467 a su esposa e hijos en Sachseln para vivir como ermitaño en el desfiladero del Ranft. Según la tradición, vivió allí veinte años sin alimento terrenal y tuvo visiones que en 1481 lo llevaron a enviar a los confederados enfrentados, reunidos en la Dieta de Stans, un consejo que evitó la amenazante guerra civil.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Niklaus von Flüe, chamado Irmão Klaus, deixou em 1467 esposa e filhos em Sachseln para viver como eremita no desfiladeiro do Ranft. Segundo a tradição, viveu lá vinte anos sem alimento terreno e teve visões que em 1481 o levaram a enviar aos confederados em conflito, reunidos na Dieta de Stans, um conselho que evitou a ameaçadora guerra civil.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Askese knapp erwähnen, den Frieden stiftenden Rat als eigentlichen Kern der Geschichte betonen.",
  "quelle": {
    "autor": "Heinrich Wölflin",
    "werk": "Vita Beati Nicolai de Rupe",
    "jahr": "1501",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Niklaus_von_Fl%C3%BCe"
  },
  "source": "Heinrich Wölflin: Vita Beati Nicolai de Rupe (1501)",
  "coordinates": { "lat": 46.8983, "lng": 8.2444 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "rheinfallnixe",
  "title": "Die Nixe im Rheinfall",
  "canton": "Schaffhausen",
  "coreMotif": "Wasserwesen und verborgener Schatz",
  "bildmotiv": "Rheinfall Schaffhausen",
  "mood": "Rauschend, geheimnisvoll",
  "summary": "Im tosenden Rheinfall bei Schaffhausen, so erzählt die alte Überlieferung, wohnt eine Nixe in einer Höhle des mittleren Felspfeilers und hütet dort einen Schatz aus versunkenem Gold. Fischer wollen in stillen Nächten ihren Gesang über dem Wasserlärm gehört haben – wer ihm folgt, so warnt die Geschichte, verliert den Weg zurück ans Ufer.",
  "summaries": {
    "gsw": {
      "text": "Im tose Rhyfall bi Schaffhuuse wohnt e Nixe in ere Höhle vom mittlere Felspfyler und hüetet dört e Schatz us versunkenem Gold. Fischer händ znacht ires Singe ghört.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Im tosenden Rheinfall bei Schaffhausen, so erzählt die alte Überlieferung, wohnt eine Nixe in einer Höhle des mittleren Felspfeilers und hütet dort einen Schatz aus versunkenem Gold. Fischer wollen in stillen Nächten ihren Gesang über dem Wasserlärm gehört haben – wer ihm folgt, so warnt die Geschichte, verliert den Weg zurück ans Ufer.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Dans les chutes du Rhin, près de Schaffhouse, raconte l'ancienne tradition, vivrait une ondine dans une grotte du pilier rocheux central, gardant un trésor d'or englouti. Des pêcheurs disent avoir entendu son chant par-dessus le fracas des eaux, par nuits calmes – mais qui la suit, avertit l'histoire, perd le chemin du retour vers la rive.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nelle rumoreggianti cascate del Reno presso Sciaffusa, racconta l'antica tradizione, vivrebbe un'ondina in una grotta del pilastro roccioso centrale, custodendo un tesoro d'oro sommerso. Alcuni pescatori dicono di aver udito il suo canto sopra il fragore dell'acqua, nelle notti tranquille – ma chi lo segue, avverte la storia, perde la via del ritorno verso la riva.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "In the roaring Rhine Falls near Schaffhausen, old tradition tells, a water nymph dwells in a cave in the central rock pillar, guarding a treasure of sunken gold. Fishermen claim to have heard her song over the roar of the water on quiet nights – but whoever follows it, the tale warns, loses the way back to shore.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在沙夫豪森附近咆哮的莱茵瀑布中，古老传说讲述有一位水精灵住在中央岩柱的洞穴里，看守着沉没的黄金宝藏。渔夫们说曾在寂静的夜里听到她的歌声盖过水声——但故事警告说，跟随歌声的人会迷失回岸的路。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En las bramantes cataratas del Rin cerca de Schaffhausen, cuenta la antigua tradición, habitaría una ondina en una cueva del pilar rocoso central, guardando un tesoro de oro hundido. Los pescadores dicen haber oído su canto por encima del estruendo del agua en noches tranquilas – pero quien lo sigue, advierte la historia, pierde el camino de regreso a la orilla.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Nas estrondosas cataratas do Reno perto de Schaffhausen, conta a antiga tradição, viveria uma ondina numa gruta do pilar rochoso central, guardando um tesouro de ouro submerso. Pescadores dizem ter ouvido seu canto sobre o barulho da água em noites tranquilas – mas quem o segue, avisa a história, perde o caminho de volta à margem.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Nixe als geheimnisvoll, nicht als böse zeichnen; das Verlorengehen andeuten statt dramatisieren.",
  "quelle": {
    "autor": "regionale Überlieferung, dokumentiert bei Ernst Ludwig Rochholz",
    "werk": "Naturmythen",
    "jahr": "1862",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Rheinfall"
  },
  "source": "Ernst Ludwig Rochholz: Naturmythen (1862); Rheinfall-Überlieferung",
  "coordinates": { "lat": 47.6778, "lng": 8.6153 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "mythenriesen",
  "title": "Die versteinerten Riesen der Mythen",
  "canton": "Schwyz",
  "coreMotif": "Verwandlung und Strafe",
  "bildmotiv": "Mythen Schwyz Berge",
  "mood": "Erhaben, urzeitlich",
  "summary": "Der Grosse und der Kleine Mythen bei Schwyz waren einst, so erzählt die Sage, zwei Riesenbrüder, die sich über den Besitz eines Almen so heftig stritten, dass die Berge selbst ihrem Streit ein Ende setzten und sie zu Stein erstarren liessen – seither stehen die beiden Gipfel für alle Zeit als Mahnmal nebeneinander, ewig getrennt und doch ewig verbunden.",
  "summaries": {
    "gsw": {
      "text": "Dr Grosse und dr Chli Myte bi Schwyz sind einisch zwe Rise-Brüeder gsi, wo sich so heftig um en Alp gstritte hend, dass d Bärge sälber ihre Strit beendet und si versteineret hend.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Der Grosse und der Kleine Mythen bei Schwyz waren einst, so erzählt die Sage, zwei Riesenbrüder, die sich über den Besitz eines Almen so heftig stritten, dass die Berge selbst ihrem Streit ein Ende setzten und sie zu Stein erstarren liessen – seither stehen die beiden Gipfel für alle Zeit als Mahnmal nebeneinander, ewig getrennt und doch ewig verbunden.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Le Grand et le Petit Mythen, près de Schwyz, étaient jadis, dit la légende, deux frères géants qui se disputèrent si violemment la possession d'un alpage que les montagnes elles-mêmes mirent fin à leur querelle en les pétrifiant – depuis, les deux sommets se dressent côte à côte pour toujours, à jamais séparés et pourtant à jamais liés.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Il Grande e il Piccolo Mythen, presso Svitto, erano un tempo, narra la leggenda, due fratelli giganti che litigarono così violentemente per il possesso di un alpeggio che le montagne stesse posero fine alla loro contesa pietrificandoli – da allora le due vette si ergono fianco a fianco per sempre, eternamente separate eppure eternamente unite.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "The Grosser and Kleiner Mythen near Schwyz were once, the legend says, two giant brothers who quarrelled so fiercely over an alpine pasture that the mountains themselves ended their feud by turning them to stone – ever since, the two peaks have stood side by side for all time, forever separated yet forever bound together.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "施维茨附近的大米滕峰和小米滕峰，传说曾是一对巨人兄弟，他们为争夺一片高山牧场而争斗得如此激烈，以至于山脉本身让这场争执画上句号，把他们化为了石头——从此这两座山峰便永远并肩矗立，永远分离却又永远相连。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "El Gran Mythen y el Pequeño Mythen, cerca de Schwyz, fueron antaño, cuenta la leyenda, dos hermanos gigantes que se disputaron tan ferozmente la posesión de un alpe que las propias montañas pusieron fin a su disputa convirtiéndolos en piedra – desde entonces, las dos cumbres se yerguen una junto a la otra para siempre, eternamente separadas y sin embargo eternamente unidas.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "O Grande e o Pequeno Mythen, perto de Schwyz, foram outrora, conta a lenda, dois irmãos gigantes que discutiram tão ferozmente pela posse de um alpe que as próprias montanhas puseram fim à disputa transformando-os em pedra – desde então, os dois cumes erguem-se lado a lado para sempre, eternamente separados e no entanto eternamente unidos.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Den Streit der Riesen kurz halten, die Versöhnung im Nebeneinanderstehen betonen.",
  "quelle": {
    "autor": "Theodor Vernaleken",
    "werk": "Alpensagen",
    "jahr": "1858",
    "fundstelleUrl": "https://archive.org/details/alpensagen00verngoog"
  },
  "source": "Theodor Vernaleken: Alpensagen (1858)",
  "coordinates": { "lat": 47.0167, "lng": 8.7333 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "ursus",
  "title": "Der heilige Ursus, der kopflose Legionär",
  "canton": "Solothurn",
  "coreMotif": "Standhaftigkeit und Wunder",
  "bildmotiv": "Heiliger Ursus Statue Solothurn",
  "mood": "Feierlich, ergreifend",
  "summary": "Ursus, so berichtet die alte Legende der Thebäischen Legion, weigerte sich um das Jahr 300 zusammen mit seinen christlichen Mitsoldaten, den römischen Göttern zu opfern, und wurde bei Solothurn enthauptet. Der Überlieferung nach erhob er sich danach und trug seinen eigenen Kopf zur Stelle, an der er begraben werden wollte – bis heute zeigt ihn das Wappen der Stadt Solothurn mit dem Haupt in den Händen.",
  "summaries": {
    "gsw": {
      "text": "Ursus hät sich um s Jahr 300 zäme mit sine christliche Mitsoldate gweigeret, de römische Götter z opfere, und isch bi Solothurn enthauptet worde. D Sag verzellt, er heig sich druf erhobe und sy Chopf zur Grabstell treit.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Ursus, so berichtet die alte Legende der Thebäischen Legion, weigerte sich um das Jahr 300 zusammen mit seinen christlichen Mitsoldaten, den römischen Göttern zu opfern, und wurde bei Solothurn enthauptet. Der Überlieferung nach erhob er sich danach und trug seinen eigenen Kopf zur Stelle, an der er begraben werden wollte – bis heute zeigt ihn das Wappen der Stadt Solothurn mit dem Haupt in den Händen.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Ursus, rapporte l'ancienne légende de la Légion thébaine, refusa vers l'an 300, avec ses compagnons d'armes chrétiens, de sacrifier aux dieux romains, et fut décapité près de Soleure. Selon la tradition, il se releva ensuite et porta lui-même sa tête jusqu'au lieu où il voulait être enseveli – aujourd'hui encore, les armoiries de la ville de Soleure le représentent tenant sa tête entre les mains.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Urso, racconta l'antica leggenda della Legione tebana, rifiutò intorno all'anno 300, insieme ai suoi compagni cristiani, di sacrificare agli dei romani e fu decapitato presso Soletta. Secondo la tradizione, si rialzò e portò la propria testa fino al luogo in cui voleva essere sepolto – ancora oggi lo stemma della città di Soletta lo raffigura con il capo tra le mani.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Ursus, the old legend of the Theban Legion relates, refused around the year 300, together with his fellow Christian soldiers, to sacrifice to the Roman gods, and was beheaded near Solothurn. According to tradition he then rose and carried his own head to the spot where he wished to be buried – to this day the coat of arms of the city of Solothurn shows him holding his head in his hands.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "古老传说讲述，公元300年左右，忒拜军团的乌尔苏斯与其基督徒战友一同拒绝向罗马诸神献祭，因而在索洛图恩附近被斩首。据传他随后站起身来，捧着自己的头颅走到他愿意安葬的地方——至今索洛图恩市的纹章上仍描绘他双手捧头的形象。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Urso, relata la antigua leyenda de la Legión Tebana, se negó hacia el año 300, junto con sus compañeros cristianos, a sacrificar a los dioses romanos, y fue decapitado cerca de Soleura. Según la tradición, después se levantó y llevó su propia cabeza hasta el lugar donde deseaba ser enterrado – aún hoy el escudo de la ciudad de Soleura lo muestra sosteniendo su cabeza entre las manos.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Urso, narra a antiga lenda da Legião Tebana, recusou-se por volta do ano 300, junto com seus companheiros cristãos, a sacrificar aos deuses romanos, e foi decapitado perto de Solothurn. Segundo a tradição, ele então se ergueu e carregou sua própria cabeça até o local onde desejava ser enterrado – até hoje o brasão da cidade de Solothurn o mostra segurando a cabeça nas mãos.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Enthauptung nicht drastisch schildern; die Standhaftigkeit und das Wunder in den Vordergrund stellen.",
  "quelle": {
    "autor": "Eucherius von Lyon (zugeschrieben)",
    "werk": "Passio Acaunensium Martyrum",
    "jahr": "5. Jahrhundert",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Ursus_von_Solothurn"
  },
  "source": "Eucherius von Lyon (zugeschrieben): Passio Acaunensium Martyrum (5. Jh.)",
  "coordinates": { "lat": 47.2088, "lng": 7.5323 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "pontedeisalti",
  "title": "Der Teufel und der Ponte dei Salti",
  "canton": "Tessin",
  "coreMotif": "Pakt mit dem Teufel",
  "bildmotiv": "Ponte dei Salti Tessin",
  "mood": "Düster, listig",
  "summary": "Die Bewohner von Lavertezzo im Verzascatal, so erzählt die Tessiner Überlieferung, konnten die reissende Verzasca nicht überqueren, bis der Teufel anbot, ihnen eine Brücke zu bauen – gegen die erste Seele, die hinüberginge. Wie schon anderswo in den Alpen überlisteten die Talbewohner ihn, indem sie ein Tier über den Ponte dei Salti trieben, und der Teufel musste sich grollend geschlagen geben.",
  "summaries": {
    "gsw": {
      "text": "D Lüt vo Lavertezzo im Verzascatal händ dr wilde Verzasca nid chönne überquere, bis dr Tüfel aabotte hät, ne e Brugg z boue – gäge di erschte Seel, wo drüber goht. Si händ en überlistet mit emene Tier.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Die Bewohner von Lavertezzo im Verzascatal, so erzählt die Tessiner Überlieferung, konnten die reissende Verzasca nicht überqueren, bis der Teufel anbot, ihnen eine Brücke zu bauen – gegen die erste Seele, die hinüberginge. Wie schon anderswo in den Alpen überlisteten die Talbewohner ihn, indem sie ein Tier über den Ponte dei Salti trieben, und der Teufel musste sich grollend geschlagen geben.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Les habitants de Lavertezzo, dans la vallée de la Verzasca, raconte la tradition tessinoise, ne pouvaient franchir le torrent impétueux jusqu'à ce que le diable propose de leur bâtir un pont – contre la première âme qui le traverserait. Comme ailleurs dans les Alpes, les villageois le dupèrent en faisant passer un animal sur le Ponte dei Salti, et le diable dut s'avouer vaincu en grommelant.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Gli abitanti di Lavertezzo, in Val Verzasca, racconta la tradizione ticinese, non riuscivano ad attraversare l'impetuosa Verzasca finché il diavolo non offrì di costruire loro un ponte – in cambio della prima anima che lo avesse attraversato. Come altrove nelle Alpi, gli abitanti della valle lo raggirarono facendo passare un animale sul Ponte dei Salti, e il diavolo dovette arrendersi brontolando.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "The people of Lavertezzo in the Verzasca valley, Ticino tradition tells, could not cross the raging Verzasca river until the Devil offered to build them a bridge – in exchange for the first soul to cross it. As elsewhere in the Alps, the valley folk outwitted him by driving an animal over the Ponte dei Salti, and the Devil had to grudgingly admit defeat.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "提契诺的传说讲述，维尔扎斯卡谷拉韦尔泰佐的居民一直无法渡过湍急的维尔扎斯卡河，直到魔鬼提出为他们建一座桥——条件是第一个过桥的灵魂归他所有。像阿尔卑斯山其他地方一样，山谷居民赶了一只动物先过跳跃桥骗过了魔鬼，魔鬼只得愤愤地认输。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Los habitantes de Lavertezzo, en el valle de Verzasca, cuenta la tradición tesinesa, no podían cruzar el impetuoso río Verzasca hasta que el diablo se ofreció a construirles un puente – a cambio de la primera alma que lo cruzara. Como en otras partes de los Alpes, los habitantes del valle lo engañaron haciendo pasar a un animal por el Ponte dei Salti, y el diablo tuvo que darse por vencido refunfuñando.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Os habitantes de Lavertezzo, no vale de Verzasca, conta a tradição ticinesa, não conseguiam atravessar o impetuoso rio Verzasca até que o diabo se ofereceu para lhes construir uma ponte – em troca da primeira alma que a atravessasse. Como em outros lugares dos Alpes, os moradores do vale o enganaram fazendo um animal passar pela Ponte dei Salti, e o diabo teve que admitir a derrota resmungando.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Den Pakt mit dem Teufel abmildern; die List der Talbewohner als cleveren Kniff betonen.",
  "quelle": {
    "autor": "Eligio Pometta",
    "werk": "Leggende ticinesi",
    "jahr": "1921",
    "fundstelleUrl": "https://it.wikipedia.org/wiki/Ponte_dei_Salti"
  },
  "source": "Eligio Pometta: Leggende ticinesi (1921)",
  "coordinates": { "lat": 46.2833, "lng": 8.8167 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "ottenberg",
  "title": "Die Sage vom Ottenberg",
  "canton": "Thurgau",
  "coreMotif": "Verwunschenes Schloss",
  "bildmotiv": "Schlossruine Thurgau",
  "mood": "Nebelverhangen, geheimnisvoll",
  "summary": "Am Ottenberg bei Weinfelden, wo einst die Burg Alt-Weinfelden stand, so erzählen die alten Thurgauer Sagen, soll in Vollmondnächten das Klirren von Rüstungen und der ferne Klang eines Hifthorns zu hören sein – Überreste eines verwunschenen Rittergeschlechts, das für seinen Hochmut nie zur Ruhe kommt und über die Hänge des Hügels zieht.",
  "summaries": {
    "gsw": {
      "text": "Am Ottenberg bi Wyfelde, wo einisch d Burg Alt-Wyfelde gstande isch, söll mer i Vollmondnächt s Chlirre vo Rüstige und en fernä Hornton ghöre – Reschte vomene verwünschte Rittergschlächt.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Am Ottenberg bei Weinfelden, wo einst die Burg Alt-Weinfelden stand, so erzählen die alten Thurgauer Sagen, soll in Vollmondnächten das Klirren von Rüstungen und der ferne Klang eines Hifthorns zu hören sein – Überreste eines verwunschenen Rittergeschlechts, das für seinen Hochmut nie zur Ruhe kommt und über die Hänge des Hügels zieht.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Sur l'Ottenberg près de Weinfelden, où se dressait jadis le château d'Alt-Weinfelden, racontent les vieilles légendes thurgoviennes, on entendrait par nuit de pleine lune le cliquetis d'armures et le son lointain d'un cor de chasse – vestiges d'une lignée de chevaliers ensorcelés qui, pour son orgueil, ne trouve jamais le repos et parcourt les pentes de la colline.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Sull'Ottenberg presso Weinfelden, dove un tempo sorgeva il castello di Alt-Weinfelden, raccontano le antiche leggende turgoviesi, nelle notti di luna piena si udirebbe il tintinnio di armature e il suono lontano di un corno da caccia – resti di una stirpe di cavalieri stregati che, per la loro superbia, non trova mai pace e vaga sui pendii della collina.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "On the Ottenberg near Weinfelden, where the castle of Alt-Weinfelden once stood, the old Thurgau legends say that on full-moon nights one can hear the clatter of armour and the distant sound of a hunting horn – remnants of an accursed line of knights who, for their pride, never find rest and roam the hillside.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "在温菲尔登附近的奥腾山，昔日阿尔特-温菲尔登城堡的所在地，图尔高地区的古老传说称，满月之夜能听到盔甲的碰撞声与遥远的猎号声——那是一支因傲慢而永不安息的中了魔咒的骑士家族的遗迹，在山坡上游荡。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En el Ottenberg cerca de Weinfelden, donde antaño se alzaba el castillo de Alt-Weinfelden, cuentan las antiguas leyendas de Turgovia, en noches de luna llena se oiría el tintineo de armaduras y el sonido lejano de un cuerno de caza – restos de un linaje de caballeros hechizados que, por su soberbia, nunca encuentra descanso y vaga por las laderas de la colina.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "No Ottenberg perto de Weinfelden, onde outrora se erguia o castelo de Alt-Weinfelden, contam as antigas lendas da Turgóvia, em noites de lua cheia ouve-se o tilintar de armaduras e o som distante de uma corneta de caça – vestígios de uma linhagem de cavaleiros enfeitiçados que, por sua soberba, nunca encontra descanso e vagueia pelas encostas da colina.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Geistererscheinung als geheimnisvoll, nicht als angsteinflössend schildern.",
  "quelle": {
    "autor": "Thurgauer Sagensammlung",
    "werk": "Sagen, Schwänke und Legenden aus dem Thurgau und der Nachbarschaft",
    "jahr": "19. Jahrhundert",
    "fundstelleUrl": "https://www.gigers.com/ernst/Sprache/TG_SAGEN.pdf"
  },
  "source": "Sagen, Schwänke und Legenden aus dem Thurgau und der Nachbarschaft (19. Jh.)",
  "coordinates": { "lat": 47.5833, "lng": 9.1 },
  "koordinatenSicherheit": "ungefaehr",
  "isAnchorPlace": true
},
{
  "id": "theodul",
  "title": "Der heilige Theodul und die Glocke",
  "canton": "Wallis",
  "coreMotif": "Überlistung des Teufels",
  "bildmotiv": "Matterhorn Kirche Glocke",
  "mood": "Feierlich, listig",
  "summary": "Der heilige Theodul, erster Bischof des Wallis, wollte für seine Kirche in Sitten eine Glocke aus Rom holen. Da sich kein Träger fand, so erzählt die Legende, band er kurzerhand den Teufel selbst an die Glocke und liess ihn sie über die Alpen tragen – zur Strafe für seine Bosheit musste der Teufel die schwere Last bis nach Sitten schleppen, wo die Glocke bis heute läutet.",
  "summaries": {
    "gsw": {
      "text": "Dr heilig Theodul, erschte Bischof vom Wallis, hät für syni Chile z Sitte e Glogge us Rom wele hole. Wil kei Träger sich gfunde hät, hät er dr Tüfel a d Glogge bunde und übere Alpe la träge.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Der heilige Theodul, erster Bischof des Wallis, wollte für seine Kirche in Sitten eine Glocke aus Rom holen. Da sich kein Träger fand, so erzählt die Legende, band er kurzerhand den Teufel selbst an die Glocke und liess ihn sie über die Alpen tragen – zur Strafe für seine Bosheit musste der Teufel die schwere Last bis nach Sitten schleppen, wo die Glocke bis heute läutet.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Saint Théodule, premier évêque du Valais, voulait rapporter de Rome une cloche pour son église de Sion. Comme aucun porteur ne se présentait, raconte la légende, il attacha sans hésiter le diable lui-même à la cloche et le fit porter à travers les Alpes – en punition de sa méchanceté, le diable dut traîner le lourd fardeau jusqu'à Sion, où la cloche sonne encore aujourd'hui.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "San Teodulo, primo vescovo del Vallese, volle portare da Roma una campana per la sua chiesa di Sion. Non trovando nessun portatore, racconta la leggenda, legò senza esitare il diavolo stesso alla campana e lo fece trasportare attraverso le Alpi – come punizione per la sua malvagità, il diavolo dovette trascinare il pesante fardello fino a Sion, dove la campana suona ancora oggi.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Saint Theodul, the first bishop of Valais, wanted to bring a bell from Rome for his church in Sion. When no porter could be found, the legend says, he simply tied the Devil himself to the bell and had him carry it across the Alps – as punishment for his wickedness the Devil had to drag the heavy load all the way to Sion, where the bell still rings today.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "瓦莱州首任主教圣特奥杜尔想从罗马为他在锡永的教堂带回一口钟。因为找不到搬运工，传说他索性把魔鬼本人绑在钟上，让它扛着钟翻越阿尔卑斯山——作为对魔鬼恶行的惩罚，它不得不把沉重的钟一路拖到锡永，那口钟至今仍在鸣响。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "San Teódulo, primer obispo del Valais, quiso traer de Roma una campana para su iglesia en Sion. Como no se encontraba portador alguno, cuenta la leyenda, ató sin más al mismísimo diablo a la campana y lo hizo cargarla a través de los Alpes – como castigo por su maldad, el diablo tuvo que arrastrar la pesada carga hasta Sion, donde la campana aún suena hoy.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "São Teodulo, primeiro bispo do Valais, quis trazer de Roma um sino para sua igreja em Sion. Como não se encontrava nenhum carregador, conta a lenda, ele simplesmente amarrou o próprio diabo ao sino e o fez carregá-lo pelos Alpes – como castigo por sua maldade, o diabo teve que arrastar a pesada carga até Sion, onde o sino ainda toca hoje.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die List gegen den Teufel als humorvollen Kern erzählen, nicht als Angstszene.",
  "quelle": {
    "autor": "mittelalterliche Theodul-Legende",
    "werk": "Vita Sancti Theoduli",
    "jahr": "Mittelalter",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Theodul_von_Sitten"
  },
  "source": "Mittelalterliche Theodul-Legende (Vita Sancti Theoduli)",
  "coordinates": { "lat": 46.2333, "lng": 7.3667 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "zugbergsturz",
  "title": "Die versunkene Vorstadt von Zug",
  "canton": "Zug",
  "coreMotif": "Naturkatastrophe und Erinnerung",
  "bildmotiv": "Zugersee Altstadt",
  "mood": "Nachdenklich, mahnend",
  "summary": "Im Jahr 1435 brach ein Teil des Ufers unter der Vorstadt von Zug plötzlich weg und riss Häuser und Menschen in die Fluten des Zugersees. Die Überlieferung erzählt, dass man in klaren Nächten noch Lichter und das Läuten versunkener Glocken tief unter der Wasseroberfläche wahrnehmen könne – ein stilles Mahnmal an die verlorene Vorstadt.",
  "summaries": {
    "gsw": {
      "text": "Im Jahr 1435 isch e Teil vom Ufer under dr Vorstadt vo Zug plötzlich weggheit und hät Hüser und Lüt i d Fluete vom Zugersee grisse. Mer verzellt, dass mer i klare Nächt na Liechter und Glogge-Läüte gseh und ghöre chönn.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Im Jahr 1435 brach ein Teil des Ufers unter der Vorstadt von Zug plötzlich weg und riss Häuser und Menschen in die Fluten des Zugersees. Die Überlieferung erzählt, dass man in klaren Nächten noch Lichter und das Läuten versunkener Glocken tief unter der Wasseroberfläche wahrnehmen könne – ein stilles Mahnmal an die verlorene Vorstadt.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "En 1435, une partie de la rive sous le faubourg de Zoug s'effondra soudainement, entraînant maisons et habitants dans les flots du lac de Zoug. La tradition raconte que, par nuits claires, on peut encore apercevoir des lumières et entendre le tintement de cloches englouties au fond de l'eau – un mémorial silencieux du faubourg disparu.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Nel 1435 una parte della riva sotto il sobborgo di Zugo crollò improvvisamente, trascinando case e abitanti nelle acque del lago di Zugo. La tradizione racconta che nelle notti serene si possano ancora scorgere luci e udire il rintocco di campane sommerse in fondo all'acqua – un silenzioso monumento al sobborgo perduto.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "In 1435, part of the shore beneath the suburb of Zug suddenly collapsed, dragging houses and people into the waters of Lake Zug. Tradition tells that on clear nights one can still glimpse lights and hear the ringing of sunken bells deep beneath the surface – a quiet memorial to the lost suburb.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "1435年，楚格郊区堤岸的一部分突然崩塌，把房屋和居民卷入了楚格湖的水中。传说在晴朗的夜晚，人们仍能在水面深处看到点点灯光，听到沉没钟声的回响——那是对这片消失郊区的静默纪念。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "En 1435, una parte de la orilla bajo el arrabal de Zug se derrumbó de repente, arrastrando casas y personas a las aguas del lago de Zug. La tradición cuenta que en noches claras aún se pueden vislumbrar luces y oír el repique de campanas hundidas en las profundidades – un monumento silencioso al arrabal perdido.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Em 1435, parte da margem sob o subúrbio de Zug desabou de repente, arrastando casas e pessoas para as águas do lago de Zug. A tradição conta que em noites claras ainda se podem ver luzes e ouvir o tocar de sinos submersos nas profundezas – um memorial silencioso ao subúrbio perdido.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Katastrophe als Naturereignis erzählen, den Verlust von Menschen nicht ausschmücken; die Lichter und Glocken als geheimnisvolles Bild betonen.",
  "quelle": {
    "autor": "Zuger Stadtchronik",
    "werk": "Überlieferung zum Bergsturz von 1435",
    "jahr": "1435",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Zug_(Stadt)"
  },
  "source": "Zuger Stadtchronik, Überlieferung zum Bergsturz von 1435",
  "coordinates": { "lat": 47.1662, "lng": 8.5155 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},
{
  "id": "felixregula",
  "title": "Felix und Regula, die kopflosen Stadtheiligen",
  "canton": "Zürich",
  "coreMotif": "Martyrium und Wunder",
  "bildmotiv": "Grossmünster Zürich",
  "mood": "Feierlich, ergreifend",
  "summary": "Felix und Regula, Geschwister und Soldaten der Thebäischen Legion, wurden der Legende nach um 300 in Zürich wegen ihres christlichen Glaubens enthauptet. Der Überlieferung nach erhoben sich die beiden nach der Hinrichtung, nahmen ihre eigenen Köpfe in die Hände und stiegen den Hügel hinauf, um an der Stelle begraben zu werden, wo heute das Grossmünster steht.",
  "summaries": {
    "gsw": {
      "text": "Felix und Regula, Gschwüschterti und Soldate vo dr Thebäische Legion, sind dr Sag nach um s Jahr 300 z Züri wäg ihrem christliche Glaube enthauptet worde. Nachher händ si sich erhobe und sind mit ihrne Chöpf i dr Hand dr Hügel ufe zoge.",
      "reviewEmpfohlen": true
    },
    "de": {
      "text": "Felix und Regula, Geschwister und Soldaten der Thebäischen Legion, wurden der Legende nach um 300 in Zürich wegen ihres christlichen Glaubens enthauptet. Der Überlieferung nach erhoben sich die beiden nach der Hinrichtung, nahmen ihre eigenen Köpfe in die Hände und stiegen den Hügel hinauf, um an der Stelle begraben zu werden, wo heute das Grossmünster steht.",
      "reviewEmpfohlen": false
    },
    "fr": {
      "text": "Félix et Régule, frère et sœur, soldats de la Légion thébaine, furent selon la légende décapités à Zurich vers 300 pour leur foi chrétienne. La tradition raconte qu'après leur exécution, ils se relevèrent, prirent leurs propres têtes dans leurs mains et gravirent la colline pour être enterrés à l'endroit où se dresse aujourd'hui le Grossmünster.",
      "reviewEmpfohlen": true
    },
    "it": {
      "text": "Felice e Regola, fratello e sorella, soldati della Legione tebana, furono secondo la leggenda decapitati a Zurigo verso il 300 per la loro fede cristiana. La tradizione narra che dopo l'esecuzione i due si rialzarono, presero le proprie teste tra le mani e salirono la collina per essere sepolti nel luogo dove oggi sorge il Grossmünster.",
      "reviewEmpfohlen": true
    },
    "en": {
      "text": "Felix and Regula, brother and sister, soldiers of the Theban Legion, were according to legend beheaded in Zurich around the year 300 for their Christian faith. Tradition tells that after their execution the two rose, took their own heads in their hands, and climbed the hill to be buried at the spot where the Grossmünster now stands.",
      "reviewEmpfohlen": false
    },
    "zh": {
      "text": "费利克斯与雷古拉是一对兄妹，也是忒拜军团的士兵，传说约在公元300年因信仰基督教而在苏黎世被斩首。传说处决后二人站起身来，双手捧着自己的头颅，登上山丘，最终葬于如今大教堂所在之处。",
      "reviewEmpfohlen": true
    },
    "es": {
      "text": "Félix y Régula, hermano y hermana, soldados de la Legión Tebana, fueron según la leyenda decapitados en Zúrich hacia el año 300 por su fe cristiana. La tradición cuenta que tras la ejecución ambos se levantaron, tomaron sus propias cabezas entre las manos y subieron la colina para ser enterrados en el lugar donde hoy se alza el Grossmünster.",
      "reviewEmpfohlen": true
    },
    "pt": {
      "text": "Félix e Régula, irmão e irmã, soldados da Legião Tebana, foram segundo a lenda decapitados em Zurique por volta do ano 300 por sua fé cristã. A tradição conta que após a execução os dois se ergueram, tomaram suas próprias cabeças nas mãos e subiram a colina para serem sepultados no local onde hoje se ergue o Grossmünster.",
      "reviewEmpfohlen": true
    }
  },
  "altersstufenHinweis": "Die Enthauptung nicht drastisch schildern; das Wunder des Weges auf den Hügel als zentrales Bild erzählen.",
  "quelle": {
    "autor": "frühmittelalterliche Passio",
    "werk": "Passio Feliciani (Felix-und-Regula-Legende)",
    "jahr": "9. Jahrhundert",
    "fundstelleUrl": "https://de.wikipedia.org/wiki/Felix_und_Regula"
  },
  "source": "Frühmittelalterliche Passio Feliciani, Felix-und-Regula-Legende (9. Jh.)",
  "coordinates": { "lat": 47.3707, "lng": 8.5411 },
  "koordinatenSicherheit": "exakt",
  "isAnchorPlace": true
},

];
