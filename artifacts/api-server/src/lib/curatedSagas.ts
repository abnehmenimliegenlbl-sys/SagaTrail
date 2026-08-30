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

const URI_NEW_SAGA_SUMMARIES: Record<
  string,
  NonNullable<InsertCatalogSaga["summaries"]>
> = {
  teufelsbruecke: {
    de: {
      text:
        "An der Teufelsbrücke in der Schöllenenschlucht baute der Teufel den Urnern eine steinerne Brücke und verlangte dafür die Seele des ersten Menschen, der sie überquerte. Die listigen Urner schickten jedoch einen Geissbock hinüber. Als der Teufel die Brücke zerstören wollte, nahm ihm ein eingeritztes Kreuz seine Kraft.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "An der Teufelsbrücke in der Schöllenenschlucht baute der Teufel den Urnern eine steinerne Brücke und verlangte dafür die Seele des ersten Menschen, der sie überquerte. Die listigen Urner schickten jedoch einen Geissbock hinüber. Als der Teufel die Brücke zerstören wollte, nahm ihm ein eingeritztes Kreuz seine Kraft.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "Au pont du Diable dans les gorges de Schöllenen, le diable construisit un pont de pierre pour les Uranais et exigea en échange l’âme du premier être humain qui le traverserait. Les Uranais rusés envoyèrent toutefois un bouc. Lorsque le diable voulut détruire le pont, une croix gravée lui ôta ses forces.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Sul Ponte del Diavolo nella gola della Schöllenen, il diavolo costruì per gli urani un ponte di pietra e chiese in cambio l’anima del primo essere umano che lo avrebbe attraversato. Gli astuti urani fecero però passare un caprone. Quando il diavolo volle distruggere il ponte, una croce incisa gli tolse ogni forza.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "At the Devil’s Bridge in the Schöllenen Gorge, the devil built the people of Uri a stone bridge and demanded the soul of the first human to cross it as payment. The cunning people of Uri sent a billy goat instead. When the devil tried to destroy the bridge, a carved cross robbed him of his strength.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "在舍勒嫩峡谷的魔鬼桥，魔鬼为乌里人建造了一座石桥，并要求第一个过桥的人以灵魂作为报酬。然而，机智的乌里人让一只公山羊先过了桥。当魔鬼想摧毁桥梁时，岩石上刻下的十字架使他失去了力量。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "En el Puente del Diablo, en la garganta de Schöllenen, el diablo construyó un puente de piedra para los habitantes de Uri y exigió como pago el alma del primer ser humano que lo cruzara. Los astutos uraneses enviaron en su lugar un macho cabrío. Cuando el diablo quiso destruir el puente, una cruz grabada le arrebató sus fuerzas.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Na Ponte do Diabo, no desfiladeiro de Schöllenen, o diabo construiu uma ponte de pedra para os habitantes de Uri e exigiu como pagamento a alma do primeiro ser humano que a atravessasse. Os astutos uraneses fizeram passar um bode em seu lugar. Quando o diabo quis destruir a ponte, uma cruz gravada tirou-lhe as forças.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "На Чёртовом мосту в ущелье Шёлленен дьявол построил для жителей Ури каменный мост и потребовал в награду душу первого человека, который по нему пройдёт. Хитрые урицы вместо этого провели через мост козла. Когда дьявол захотел разрушить мост, высеченный крест лишил его силы.",
      reviewEmpfohlen: false,
    },
  },
  stier: {
    de: {
      text:
        "Ein Ungeheuer im Seelisbergsee bedrohte die Herden von Uri. Die Bauern zogen deshalb sieben Jahre lang einen erstgeborenen Stier mit bester Milch auf. Der gewaltige Stier besiegte das Monster, starb aber selbst an seinen Wunden; sein Kopf wurde zum Symbol im Urner Kantonswappen.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "Ein Ungeheuer im Seelisbergsee bedrohte die Herden von Uri. Die Bauern zogen deshalb sieben Jahre lang einen erstgeborenen Stier mit bester Milch auf. Der gewaltige Stier besiegte das Monster, starb aber selbst an seinen Wunden; sein Kopf wurde zum Symbol im Urner Kantonswappen.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "Un monstre du lac de Seelisberg terrorisait les troupeaux d’Uri. Les paysans élevèrent donc pendant sept ans un premier veau mâle avec le meilleur lait. Le taureau colossal vainquit le monstre, mais mourut lui-même de ses blessures; sa tête devint un symbole des armoiries du canton d’Uri.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Un mostro del lago di Seelisberg terrorizzava le mandrie di Uri. I contadini allevarono quindi per sette anni un vitello maschio primogenito con il latte migliore. Il toro gigantesco sconfisse il mostro, ma morì a sua volta per le ferite; la sua testa divenne un simbolo dello stemma del canton Uri.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "A monster in Lake Seelisberg threatened Uri’s herds. The farmers therefore raised a firstborn bull for seven years on the finest milk. The mighty bull defeated the beast but died from its wounds; its head became a symbol on the coat of arms of Uri.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "塞利斯贝格湖中的怪物威胁着乌里的牲畜。于是农民用最好的母乳喂养一头头生公牛，整整七年。强壮的公牛击败了怪物，却也因伤势死去；它的头颅后来成为乌里州徽上的象征。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "Un monstruo del lago de Seelisberg amenazaba los rebaños de Uri. Por ello, los campesinos criaron durante siete años un toro primogénito alimentado únicamente con la mejor leche. El poderoso toro venció a la bestia, pero murió por sus heridas; su cabeza se convirtió en un símbolo del escudo de Uri.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Um monstro no lago de Seelisberg ameaçava os rebanhos de Uri. Por isso, os camponeses criaram durante sete anos um touro primogénito, alimentado apenas com o melhor leite. O poderoso touro derrotou a criatura, mas morreu devido aos ferimentos; a sua cabeça tornou-se um símbolo do brasão de Uri.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "Чудовище в озере Зелисберг угрожало стадам Ури. Поэтому крестьяне семь лет выкармливали первородного быка лучшим молоком. Могучий бык победил чудовище, но сам умер от ран; его голова стала символом на гербе кантона Ури.",
      reviewEmpfohlen: false,
    },
  },
  tell: {
    de: {
      text:
        "In Altdorf musste Wilhelm Tell vor dem Hut des Landvogts nicht niederknien. Zur Strafe sollte er seinem Sohn einen Apfel vom Kopf schiessen. Der Meisterschütze traf den Apfel, verriet aber mit einem zweiten Pfeil seinen Widerstand gegen Gesslers Herrschaft.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "In Altdorf musste Wilhelm Tell vor dem Hut des Landvogts nicht niederknien. Zur Strafe sollte er seinem Sohn einen Apfel vom Kopf schiessen. Der Meisterschütze traf den Apfel, verriet aber mit einem zweiten Pfeil seinen Widerstand gegen Gesslers Herrschaft.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "À Altdorf, Guillaume Tell refusa de s’agenouiller devant le chapeau du bailli. Pour le punir, celui-ci lui ordonna de tirer une pomme posée sur la tête de son fils. Le maître arbalétrier atteignit la pomme, mais révéla sa résistance à Gessler avec une seconde flèche.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Ad Altdorf, Guglielmo Tell rifiutò di inginocchiarsi davanti al cappello del balivo. Per punirlo, il balivo gli ordinò di colpire con la balestra una mela posta sulla testa del figlio. Il tiratore centrò la mela, ma con una seconda freccia rivelò la sua resistenza a Gessler.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "In Altdorf, William Tell refused to kneel before the bailiff’s hat. As punishment, he was ordered to shoot an apple from his son’s head. The master marksman hit the apple, but a second arrow revealed his defiance of Gessler’s rule.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "在阿尔特多夫，威廉·泰尔拒绝向总督的帽子下跪。作为惩罚，他被命令用弩射下儿子头上的苹果。这位神射手击中了苹果，却用第二支箭表明了自己反抗盖斯勒统治的决心。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "En Altdorf, Guillermo Tell se negó a arrodillarse ante el sombrero del gobernador. Como castigo, le ordenaron disparar una manzana colocada sobre la cabeza de su hijo. El maestro tirador acertó, pero una segunda flecha reveló su resistencia al dominio de Gessler.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Em Altdorf, Guilherme Tell recusou-se a ajoelhar-se diante do chapéu do governador. Como castigo, ordenaram-lhe que disparasse uma maçã colocada sobre a cabeça do filho. O exímio atirador acertou, mas uma segunda flecha revelou a sua resistência ao domínio de Gessler.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "В Альтдорфе Вильгельм Телль отказался преклонить колено перед шляпой наместника. В наказание ему приказали сбить яблоко с головы сына. Искусный стрелок попал в яблоко, но второй стрелой показал своё сопротивление власти Гесслера.",
      reviewEmpfohlen: false,
    },
  },
  tellensprung: {
    de: {
      text:
        "Nachdem Gessler Wilhelm Tell gefesselt hatte, geriet das Schiff auf dem Vierwaldstättersee in einen Föhnsturm. Tell übernahm das Steuer, sprang bei einer Felsplatte ans Ufer und stiess das Boot mit den Häschern zurück in die Fluten. So gewann er seine Freiheit.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "Nachdem Gessler Wilhelm Tell gefesselt hatte, geriet das Schiff auf dem Vierwaldstättersee in einen Föhnsturm. Tell übernahm das Steuer, sprang bei einer Felsplatte ans Ufer und stiess das Boot mit den Häschern zurück in die Fluten. So gewann er seine Freiheit.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "Après que Gessler eut fait enchaîner Guillaume Tell, le bateau fut pris dans une tempête de foehn sur le lac des Quatre-Cantons. Tell prit la barre, sauta sur un rocher près du rivage et repoussa le bateau avec ses poursuivants dans les flots. Il retrouva ainsi sa liberté.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Dopo che Gessler fece incatenare Guglielmo Tell, la barca fu sorpresa da una tempesta di föhn sul lago dei Quattro Cantoni. Tell prese il timone, saltò su una lastra rocciosa vicino alla riva e respinse la barca con i suoi inseguitori tra i flutti. Così riconquistò la libertà.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "After Gessler had Tell bound, their boat was caught in a foehn storm on Lake Lucerne. Tell took the helm, leapt onto a rock near the shore, and pushed the boat with his captors back into the waves. In this way he won his freedom.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "盖斯勒把威廉·泰尔绑起来后，船在卢塞恩湖上遭遇了焚风暴。泰尔接过船舵，在靠近岸边的岩板上跳下船，并用脚把载着追捕者的船推回汹涌的湖水中。就这样，他重获了自由。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "Después de que Gessler encadenara a Guillermo Tell, la barca quedó atrapada en una tormenta de föhn en el lago de los Cuatro Cantones. Tell tomó el timón, saltó sobre una roca junto a la orilla y empujó la barca con sus captores de vuelta a las aguas. Así recuperó la libertad.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Depois de Gessler mandar prender Guilherme Tell, o barco foi apanhado por uma tempestade de föhn no lago dos Quatro Cantões. Tell tomou o leme, saltou para uma rocha junto à margem e empurrou o barco com os seus perseguidores de volta para as ondas. Assim conquistou a liberdade.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "После того как Гесслер заковал Вильгельма Телля, лодка попала на Фирвальдштетском озере в бурю фёна. Телль взялся за руль, прыгнул на скалу у берега и ногой оттолкнул лодку с преследователями обратно в волны. Так он обрёл свободу.",
      reviewEmpfohlen: false,
    },
  },
  schloss: {
    de: {
      text:
        "Über Andermatt stand einst eine reiche, hochmütige Burg. Als ihre Herren einen frierenden Bettler abwiesen, begrub eine gewaltige Lawine das Schloss. Auf seinen Trümmern wuchs der Bannwald, der das Dorf seither vor weiteren Lawinen schützt.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "Über Andermatt stand einst eine reiche, hochmütige Burg. Als ihre Herren einen frierenden Bettler abwiesen, begrub eine gewaltige Lawine das Schloss. Auf seinen Trümmern wuchs der Bannwald, der das Dorf seither vor weiteren Lawinen schützt.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "Au-dessus d’Andermatt se dressait autrefois un château riche et orgueilleux. Lorsque ses seigneurs rejetèrent un mendiant transi de froid, une avalanche gigantesque ensevelit le château. La forêt protectrice poussa sur ses ruines et protège depuis le village d’autres avalanches.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Sopra Andermatt sorgeva un tempo un castello ricco e superbo. Quando i suoi signori respinsero un mendicante infreddolito, una gigantesca valanga seppellì il castello. Sulle sue rovine crebbe il bosco protettivo che da allora difende il paese da altre valanghe.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "A wealthy, proud castle once stood above Andermatt. When its lords turned away a freezing beggar, a huge avalanche buried the castle. A protective forest grew over its ruins and has shielded the village from further avalanches ever since.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "安德马特上方曾有一座富有而傲慢的城堡。当城堡主人拒绝了一位冻得瑟瑟发抖的乞丐后，一场巨大的雪崩将城堡掩埋。废墟上长出了禁伐林，从此保护村庄免受更多雪崩侵袭。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "Sobre Andermatt se alzaba antaño un castillo rico y orgulloso. Cuando sus señores rechazaron a un mendigo aterido de frío, una enorme avalancha sepultó el castillo. Sobre sus ruinas creció el bosque protector que desde entonces resguarda al pueblo de nuevas avalanchas.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Acima de Andermatt erguia-se outrora um castelo rico e orgulhoso. Quando os seus senhores recusaram abrigo a um mendigo gelado, uma enorme avalanche sepultou o castelo. Sobre as ruínas cresceu a floresta protetora que desde então protege a aldeia de novas avalanches.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "Когда-то над Андерматтом стоял богатый и гордый замок. После того как его господа отвергли замерзающего нищего, огромная лавина погребла замок. На его руинах вырос защитный лес, который с тех пор оберегает деревню от новых лавин.",
      reviewEmpfohlen: false,
    },
  },
  schlangengeli: {
    de: {
      text:
        "Am Sustenpass bewachte das Schlangengeli, eine riesige silberne Schlange mit goldener Krone, einen Schatz. Ehrliche Wanderer liess es in Ruhe, doch Schatzsucher wurden von giftigen Dämpfen und Steinschlägen vertrieben. Später zog sich das Wesen in den Steingletscher zurück.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "Am Sustenpass bewachte das Schlangengeli, eine riesige silberne Schlange mit goldener Krone, einen Schatz. Ehrliche Wanderer liess es in Ruhe, doch Schatzsucher wurden von giftigen Dämpfen und Steinschlägen vertrieben. Später zog sich das Wesen in den Steingletscher zurück.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "Au col du Susten, le Schlangengeli, un serpent argenté gigantesque portant une petite couronne d’or, gardait un trésor. Il épargnait les voyageurs honnêtes, mais chassait les chercheurs d’or avec des vapeurs toxiques et des éboulements. Plus tard, la créature se retira dans le glacier de pierre.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Sul passo del Susten, lo Schlangengeli, un enorme serpente d’argento con una piccola corona d’oro, custodiva un tesoro. Lasciava in pace i viandanti onesti, ma cacciava i cercatori con vapori velenosi e frane. In seguito la creatura si ritirò nel ghiacciaio dello Stein.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "At the Susten Pass, Schlangengeli, a huge silver snake with a little golden crown, guarded a treasure. It left honest travelers alone but drove treasure hunters away with poisonous vapors and falling rocks. Later the creature withdrew into the Stein Glacier.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "在苏斯滕山口，一条戴着小金冠的巨大银色蛇怪“施朗根格利”守护着宝藏。它不会伤害诚实的旅人，却用毒雾和落石驱赶寻宝者。后来，这个神秘生物退回了施泰因冰川深处。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "En el puerto de Susten, Schlangengeli, una enorme serpiente plateada con una pequeña corona de oro, custodiaba un tesoro. Dejaba tranquilos a los viajeros honrados, pero ahuyentaba a los buscadores con vapores venenosos y desprendimientos. Más tarde, la criatura se retiró al glaciar Stein.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "No passo de Susten, Schlangengeli, uma enorme serpente prateada com uma pequena coroa dourada, guardava um tesouro. Deixava os viajantes honestos em paz, mas expulsava os caçadores de tesouros com vapores venenosos e deslizamentos de pedras. Mais tarde, a criatura retirou-se para o glaciar Stein.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "На перевале Зустен сокровище охраняла Шлангенгели — огромная серебряная змея с маленькой золотой короной. Честных путников она не трогала, но отпугивала кладоискателей ядовитыми испарениями и камнепадами. Позже существо скрылась в леднике Штайн.",
      reviewEmpfohlen: false,
    },
  },
  totenvogt: {
    de: {
      text:
        "In Bürglen fand ein tyrannischer Vogt nach seinem Tod keine Ruhe. Sein Grab wurde von Kettenrasseln und Klagen heimgesucht, bis der Pfarrer den Geist zum Geständnis zwang und die niedergeschriebene Schuld auf dem Grab verbrannte.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "In Bürglen fand ein tyrannischer Vogt nach seinem Tod keine Ruhe. Sein Grab wurde von Kettenrasseln und Klagen heimgesucht, bis der Pfarrer den Geist zum Geständnis zwang und die niedergeschriebene Schuld auf dem Grab verbrannte.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "À Bürglen, un bailli tyrannique ne trouva pas le repos après sa mort. Son tombeau fut hanté par le cliquetis des chaînes et les lamentations jusqu’à ce que le curé force l’esprit à avouer ses fautes et brûle l’aveu sur la tombe.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "A Bürglen, un balivo tirannico non trovò pace dopo la morte. La sua tomba fu tormentata dal tintinnio delle catene e dai lamenti, finché il parroco costrinse lo spirito a confessare le sue colpe e bruciò la confessione sulla tomba.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "In Bürglen, a tyrannical bailiff found no peace after his death. The rattling of chains and mournful cries haunted his grave until the priest forced the spirit to confess its sins and burned the written confession on the grave.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "在比尔格伦，一名暴虐的总督死后不得安宁。他的坟墓不断传出铁链声和哀号，直到牧师迫使鬼魂承认罪过，并在墓上焚烧写下的罪状。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "En Bürglen, un gobernador tiránico no encontró descanso después de morir. El tintineo de cadenas y los lamentos atormentaban su tumba, hasta que el párroco obligó al espíritu a confesar sus pecados y quemó la confesión escrita sobre la sepultura.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Em Bürglen, um governador tirânico não encontrou descanso depois de morrer. O tilintar de correntes e os lamentos assombravam a sua sepultura, até o pároco obrigar o espírito a confessar os pecados e queimar a confissão escrita sobre o túmulo.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "В Бюрглене жестокий наместник не обрёл покоя после смерти. Его могилу преследовали звон цепей и стоны, пока священник не заставил дух признаться в грехах и не сжёг записанную исповедь на могиле.",
      reviewEmpfohlen: false,
    },
  },
  attinghausen: {
    de: {
      text:
        "Der genaue Ort: Der historische Wohnturm der Burgruine Attinghausen bei Altdorf. Auf der stolzen Burg Attinghausen residierten im Mittelalter die mächtigen Freiherren von Attinghausen, die über weite Teile des Urnerlandes herrschten. Die Sage erzählt von der letzten Tochter des Hauses, einem aussergewöhnlich schönen, aber hochmütigen Fräulein. Sie wies jeden rechtschaffenen Freier aus dem Lande hochmütig zurück und verschwendete das Geld der Familie für Prunk und rauschende Feste, während die Bauern im Tal Hunger litten. Als die Burg in den Schweizer Befreiungskriegen schliesslich belagert und zerstört wurde, kam die stolze Jungfrau in den Flammen des Wohnturms ums Leben. Da sie jedoch vor ihrem Tod keine Reue zeigte, fand ihre Seele keine Ruhe. Sie wurde dazu verdammt, als «Weisse Frau» oder verwandelte Schlange die tiefen, unterirdischen Gewölbe und den alten Burgbrunnen zu bewachen, in denen der Familienschatz vergraben liegt. Die Sage besagt, dass sie alle hundert Jahre in den Ruinen erscheint und darauf wartet, von einem Jüngling reinen Herzens durch einen furchtlosen Kuss erlöst zu werden. Bis heute meiden viele Einheimische die dunklen Ecken der Ruine in stürmischen Neumondnächten.",
      reviewEmpfohlen: false,
    },
    gsw: {
      text:
        "Der genaue Ort: Der historische Wohnturm der Burgruine Attinghausen bei Altdorf. Auf der stolzen Burg Attinghausen residierten im Mittelalter die mächtigen Freiherren von Attinghausen, die über weite Teile des Urnerlandes herrschten. Die Sage erzählt von der letzten Tochter des Hauses, einem aussergewöhnlich schönen, aber hochmütigen Fräulein. Sie wies jeden rechtschaffenen Freier aus dem Lande hochmütig zurück und verschwendete das Geld der Familie für Prunk und rauschende Feste, während die Bauern im Tal Hunger litten. Als die Burg in den Schweizer Befreiungskriegen schliesslich belagert und zerstört wurde, kam die stolze Jungfrau in den Flammen des Wohnturms ums Leben. Da sie jedoch vor ihrem Tod keine Reue zeigte, fand ihre Seele keine Ruhe. Sie wurde dazu verdammt, als «Weisse Frau» oder verwandelte Schlange die tiefen, unterirdischen Gewölbe und den alten Burgbrunnen zu bewachen, in denen der Familienschatz vergraben liegt. Die Sage besagt, dass sie alle hundert Jahre in den Ruinen erscheint und darauf wartet, von einem Jüngling reinen Herzens durch einen furchtlosen Kuss erlöst zu werden. Bis heute meiden viele Einheimische die dunklen Ecken der Ruine in stürmischen Neumondnächten.",
      reviewEmpfohlen: false,
    },
    fr: {
      text:
        "Lieu exact : la tour résidentielle historique des ruines du château d’Attinghausen, près d’Altdorf. Au Moyen Âge, les puissants barons d’Attinghausen régnaient depuis leur fière forteresse sur une grande partie de la vallée d’Uri. La légende parle de la dernière fille de la famille, une demoiselle d’une beauté exceptionnelle mais orgueilleuse. Elle repoussait avec mépris tout prétendant honnête du pays et dépensait la fortune familiale en faste et en fêtes somptueuses, tandis que les paysans de la vallée souffraient de la faim. Lorsque le château fut finalement assiégé et détruit pendant les guerres de libération suisses, la jeune femme orgueilleuse mourut dans les flammes de la tour. Comme elle n’avait montré aucun repentir avant sa mort, son âme ne trouva pas le repos. Elle fut condamnée à garder, sous la forme d’une Dame blanche ou d’un serpent métamorphosé, les profondes voûtes souterraines et l’ancien puits du château où le trésor familial est enfoui. La légende raconte qu’elle apparaît tous les cent ans dans les ruines, attendant qu’un jeune homme au cœur pur la délivre par un baiser courageux. Encore aujourd’hui, de nombreux habitants évitent les recoins sombres des ruines les nuits de nouvelle lune orageuses.",
      reviewEmpfohlen: false,
    },
    it: {
      text:
        "Luogo esatto: la storica torre residenziale delle rovine del castello di Attinghausen, presso Altdorf. Nel Medioevo i potenti baroni di Attinghausen governavano da questa fiera fortezza gran parte della valle di Uri. La leggenda parla dell’ultima figlia della casata, una fanciulla di straordinaria bellezza ma superba. Respingeva con arroganza ogni onesto pretendente della regione e sperperava il patrimonio della famiglia in sfarzo e feste sfrenate, mentre i contadini della valle soffrivano la fame. Quando il castello fu infine assediato e distrutto durante le guerre di liberazione svizzere, la giovane superba morì tra le fiamme della torre. Poiché prima di morire non aveva mostrato alcun pentimento, la sua anima non trovò pace. Fu condannata a sorvegliare, nelle sembianze di una Dama Bianca o di un serpente trasformato, le profonde volte sotterranee e l’antico pozzo del castello dove è sepolto il tesoro di famiglia. La leggenda narra che appaia tra le rovine ogni cento anni, aspettando che un giovane dal cuore puro la liberi con un bacio intrepido. Ancora oggi molti abitanti evitano gli angoli bui delle rovine nelle tempestose notti di luna nuova.",
      reviewEmpfohlen: false,
    },
    en: {
      text:
        "Exact location: the historic residential tower of Attinghausen Castle ruins near Altdorf. In the Middle Ages, the powerful barons of Attinghausen ruled large parts of the Uri valley from their proud castle. The legend tells of the last daughter of the house, an exceptionally beautiful but haughty young woman. She arrogantly rejected every honest suitor from the land and squandered the family’s money on finery and lavish celebrations while the farmers in the valley went hungry. When the castle was finally besieged and destroyed during the Swiss Wars of Liberation, the proud maiden died in the flames of the residential tower. Since she had shown no remorse before her death, her soul found no rest. She was condemned to guard the deep underground vaults and the old castle well, where the family treasure lies buried, in the form of a White Lady or a transformed serpent. The legend says that she appears in the ruins every hundred years, waiting to be freed by a fearless kiss from a pure-hearted young man. To this day, many locals avoid the dark corners of the ruins on stormy nights of the new moon.",
      reviewEmpfohlen: false,
    },
    zh: {
      text:
        "确切地点：阿尔特多夫附近阿廷格豪森城堡遗址的历史居住塔。中世纪时，强大的阿廷格豪森男爵从这座骄傲的城堡统治着乌里谷的大部分地区。传说家族最后一位女儿美貌非凡，却十分傲慢。她傲然拒绝当地每一位正直的求婚者，把家产挥霍在奢华装饰和喧闹宴会上，而山谷里的农民却忍饥挨饿。瑞士解放战争期间，城堡最终遭到围攻并被摧毁，骄傲的少女死在居住塔的火焰中。由于临死前毫无悔意，她的灵魂不得安息。她被诅咒化作白衣女鬼或变形的蛇，守护着深邃的地下拱顶和古老的城堡井，家族的宝藏就埋藏在那里。传说她每隔一百年便会出现在废墟中，等待一位心地纯洁的年轻人用无畏的一吻将她解救。直到今天，许多当地人仍避开暴风雨新月之夜里废墟的阴暗角落。",
      reviewEmpfohlen: false,
    },
    es: {
      text:
        "Lugar exacto: la torre residencial histórica de las ruinas del castillo de Attinghausen, cerca de Altdorf. En la Edad Media, los poderosos barones de Attinghausen gobernaban desde su orgulloso castillo gran parte del valle de Uri. La leyenda habla de la última hija de la casa, una joven de extraordinaria belleza pero muy orgullosa. Rechazaba con arrogancia a todos los pretendientes honrados de la región y malgastaba el dinero de la familia en lujos y fiestas desenfrenadas, mientras los campesinos del valle pasaban hambre. Cuando el castillo fue finalmente sitiado y destruido durante las guerras de liberación suizas, la orgullosa doncella murió entre las llamas de la torre residencial. Como no mostró arrepentimiento antes de morir, su alma no encontró descanso. Fue condenada a custodiar, convertida en una Dama Blanca o en una serpiente transformada, las profundas bóvedas subterráneas y el antiguo pozo del castillo, donde está enterrado el tesoro familiar. La leyenda dice que aparece entre las ruinas cada cien años, esperando que un joven de corazón puro la libere con un beso valiente. Hasta hoy, muchos habitantes evitan los rincones oscuros de las ruinas en las noches tormentosas de luna nueva.",
      reviewEmpfohlen: false,
    },
    pt: {
      text:
        "Local exato: a histórica torre residencial das ruínas do castelo de Attinghausen, perto de Altdorf. Na Idade Média, os poderosos barões de Attinghausen governavam grande parte do vale de Uri a partir do seu orgulhoso castelo. A lenda fala da última filha da casa, uma jovem de beleza extraordinária, mas altiva. Rejeitava com arrogância todos os pretendentes honestos da região e esbanjava o dinheiro da família em luxo e festas exuberantes, enquanto os camponeses do vale passavam fome. Quando o castelo foi finalmente cercado e destruído durante as guerras de libertação suíças, a jovem orgulhosa morreu nas chamas da torre residencial. Como não demonstrou arrependimento antes de morrer, a sua alma não encontrou descanso. Foi condenada a guardar, sob a forma de uma Dama Branca ou de uma serpente transformada, as profundas abóbadas subterrâneas e o antigo poço do castelo, onde está enterrado o tesouro da família. Diz a lenda que ela aparece nas ruínas a cada cem anos, à espera de ser libertada por um beijo destemido de um jovem de coração puro. Até hoje, muitos habitantes evitam os recantos escuros das ruínas nas noites tempestuosas de lua nova.",
      reviewEmpfohlen: false,
    },
    ru: {
      text:
        "Точное место: историческая жилая башня руин замка Аттингаузен недалеко от Альтдорфа. В Средние века могущественные бароны Аттингаузена правили из этого гордого замка значительной частью долины Ури. Легенда рассказывает о последней дочери рода — необыкновенно красивой, но надменной девушке. Она высокомерно отвергала каждого достойного жениха из края и расточала семейные деньги на роскошь и шумные пиры, пока крестьяне в долине голодали. Когда во время швейцарских освободительных войн замок наконец осадили и разрушили, гордая девушка погибла в огне жилой башни. Поскольку перед смертью она не раскаялась, её душа не обрела покоя. Она была обречена в облике Белой Дамы или превращённой змеи охранять глубокие подземные своды и старый замковый колодец, где зарыт семейный клад. Говорят, что каждые сто лет она появляется среди руин и ждёт юношу с чистым сердцем, который освободит её бесстрашным поцелуем. До сих пор многие местные жители избегают тёмных уголков руин в бурные безлунные ночи.",
      reviewEmpfohlen: false,
    },
  },
};

const URI_NEW_SAGAS: InsertCatalogSaga[] = [
  {
    id: "der-teufel-an-der-teufelsbruecke-uri",
    title: "Der Teufel an der Teufelsbrücke",
    canton: "Uri",
    coreMotif: "List und ein Kreuz vereiteln den teuflischen Handel",
    bildmotiv: "Teufelsbrücke, Schöllenenschlucht, Reuss, Uri",
    mood: "Dramatisch und unheimlich",
    summary:
      "Der genaue Ort: Die historische, steinerne Teufelsbrücke in der Schöllenenschlucht. Das obere Reusstal war im Mittelalter durch die senkrechten Felswände der Schöllenenschlucht komplett vom Urserental abgeschnitten. Die Urner versuchten über Generationen hinweg verzweifelt, eine feste Brücke über die tosende Reuss zu schlagen, doch die ungezähmten Wassermassen und heftigen Winde rissen jeden Holzsteg sogleich in den Abgrund. Als der Urner Landammann eines Tages am Flussufer schier verzweifelte, rief er wütend aus: «Soll doch der Teufel eine Brücke bauen!» Kaum war das Wort verhallt, stand der Satan in Gestalt eines fremden, stolzen Baumeisters vor ihm. Er bot an, die Brücke binnen drei Tagen aus solidem Stein zu errichten. Als Lohn forderte er jedoch die Seele desjenigen, der das Bauwerk als allererstes überqueren würde. Die Urner willigten in ihrer Not ein. Der Teufel hielt sein Wort: Am vierten Morgen spannte sich eine mächtige, bogenförmige Steinbrücke über den Abgrund. Nun sollte der Teufel seinen Lohn erhalten. Doch die listigen Urner trieben statt eines Menschen einen kräftigen Geissbock über den Fluss. Als der Teufel merkte, dass er um die erhoffte Menschenseele betrogen worden war, packte ihn rasender Zorn. Er zerriss das Tier an Ort und Stelle und flog davon, um im fernen Wallis einen tonnenschweren Felsblock zu holen. Mit diesem wollte er die Brücke wieder zerschmettern. Als er den Stein nahe Göschenen kurz absetzte, um zu verschnaufen, schlich sich eine fromme Frau heran und ritzte mit einem Kiesel ein Kreuz in den Fels. Als der Satan zurückkehrte und das heilige Zeichen sah, verliess ihn augenblicklich jede Kraft. Er konnte den Stein nicht mehr anheben und floh unter Geheul in die Hölle.",
    summaries: URI_NEW_SAGA_SUMMARIES.teufelsbruecke,
    altersstufenHinweis: "Die Darstellung des gerissenen Tieres kann für jüngere Kinder abgemildert werden.",
    quelle: {
      autor: "Ernst Ludwig Rochholz; M. Lütolf",
      werk: "Schweizersagen aus dem Aargau und den Waldstätten; Sagen, Bräuche und Legenden aus den fünf Orten",
      jahr: "1856; 1862",
      fundstelleUrl:
        "https://reader.digitale-sammlungen.de/resolve/display/bsb10453839.html",
    },
    source:
      "Ernst Ludwig Rochholz: Schweizersagen aus dem Aargau und den Waldstätten (1856) sowie M. Lütolf: Sagen, Bräuche und Legenden aus den fünf Orten (1862).",
    lat: 46.647334,
    lng: 8.590327,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Teufelsbrücke, Schöllenenschlucht",
  },
  {
    id: "der-stier-von-uri-und-das-ungeheuer-im-seelisbergsee-uri",
    title: "Der Stier von Uri und das Ungeheuer im Seelisbergsee",
    canton: "Uri",
    coreMotif: "Opferbereitschaft besiegt ein Ungeheuer",
    bildmotiv: "Seelisbergsee, Urner Stier, Seeungeheuer",
    mood: "Heldenhaft und düster",
    summary:
      "Der genaue Ort: Die Wasserfläche des Seelisbergsees. Im finsteren, kalten Wasser des Seelisbergsees hauste vor langen Zeiten ein grausiges Ungeheuer, das die Einheimischen nur das «Elb» nannten. Das Monster stieg nachts aus den tiefen Fluten empor, riss das Vieh von den saftigen Bergweiden und versetzte das ganze Dorf in Angst und Schrecken. Jeder Versuch der Urner Jäger, die Bestie mit Speeren oder Pfeilen zu erlegen, schlug fehl, da die Haut des Wesens unzerstörbar schien. In ihrer Not befragten die Bauern einen weisen Einsiedler. Dieser riet ihnen, ein makelloses, erstgeborenes Stierkalb aufzuziehen. Dieses Kalb müsse sieben Jahre lang ausschliesslich mit der besten Muttermilch genährt werden, ohne je Gras oder Heu zu fressen. Die Urner folgten dem Rat gewissenhaft. Nach sieben Jahren war das Tier zu einem kolossalen, vor Kraft strotzenden Kampfstier mit eisernen Muskeln und mächtigen Hörnern herangewachsen. Als das Ungeheuer kurz darauf erneut aus dem See brach und nach den Herden griff, liessen die Bauern den gewaltigen Stier von der Kette. Es kam zu einem epischen, stundenlangen Kampf am Seeufer, bei dem die Erde bebte und das Wasser sich rot färbte. Mit letzter Kraft gelang es dem Stier, das Monstrum zu Boden zu werfen und dessen Brust mit den Hörnern zu durchbohren. Das Ungeheuer war tot, doch auch der treue Stier brach vor Erschöpfung und aufgrund seiner schweren Wunden tot zusammen. Seither ist der See friedlich, und das stolze Urner Volk setzte den Kopf des rettenden Stiers als ewiges Symbol in sein Kantonswappen.",
    summaries: URI_NEW_SAGA_SUMMARIES.stier,
    altersstufenHinweis: "Der Kampf und die Verletzungen können für jüngere Kinder abgemildert werden.",
    quelle: null,
    source:
      "Franz Josef Vonmatt: Sagen des Kantons Uri (gesammelt im 19. Jahrhundert) / Brüder Grimm: Deutsche Sagen, Band 1, Nr. 222 «Der Stier von Uri» (1816).",
    lat: 46.958611,
    lng: 8.571944,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Seelisbergsee",
  },
  {
    id: "wilhelm-tells-apfelschuss-uri",
    title: "Wilhelm Tells Apfelschuss",
    canton: "Uri",
    coreMotif: "Mut widersteht der Tyrannei",
    bildmotiv: "Tell-Denkmal, Altdorf, Apfel, Armbrust",
    mood: "Spannend und mutig",
    summary:
      "Der genaue Ort: Das Tell-Denkmal auf dem Rathausplatz in Altdorf. Im Spätherbst des Jahres 1307 errichtete der habsburgische Landvogt Hermann Gessler auf dem Marktplatz von Altdorf eine Stange und hängte seinen herzoglichen Hut daran auf. Er befahl, dass jeder Passant vor dem Hut niederknien und ihn grüssen müsse, um die absolute Unterwerfung unter das Haus Habsburg zu beweisen. Als der angesehene Jäger und Bergbauer Wilhelm Tell aus Bürglen mit seinem kleinen Sohn Walterli am Platz vorbeiging, ignorierte er den Hut mit stolzem Blick. Die kaiserlichen Wachen nahmen ihn sofort fest. Der herbeigerufene Landvogt beschloss, Tell für seinen Ungehorsam auf grausame Weise zu bestrafen: Da Tell als meisterhafter Schütze bekannt war, sollte er mit seiner Armbrust einen Apfel vom Kopf seines eigenen Sohnes schiessen. Sollte er sich weigern oder verfehlen, drohte beiden der sofortige Tod. Tell flehte um Gnade für sein Kind, doch Gessler blieb eisig. Mit zitternden Händen, aber festem Blick spannte Tell die Armbrust, legte einen Bolzen ein und zielte. Der Schuss löste sich, sauste durch die Luft und spaltete den Apfel exakt in zwei Hälften, ohne das Kind auch nur zu streifen. Während das Volk jubelte, bemerkte der misstrauische Gessler, dass Tell heimlich einen zweiten Pfeil unter seinen Rock gesteckt hatte. Auf die Frage nach dem Grund antwortete Tell furchtlos: «Hätte mein erster Pfeil das eigene Kind getroffen, so wäre der zweite für Euer Herz bestimmt gewesen!»",
    summaries: URI_NEW_SAGA_SUMMARIES.tell,
    altersstufenHinweis: "Die Drohung gegen das Kind kann für jüngere Kinder behutsam erzählt werden.",
    quelle: null,
    source:
      "Aegidius Tschudi: Chronicon Helveticum (geschrieben im 16. Jahrhundert, gedruckt 1734) sowie Johannes von Müller: Geschichten Schweizerischer Eidgenossenschaft (1786).",
    lat: 46.881840595752934,
    lng: 8.643962146602012,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Tell-Denkmal, Altdorf",
  },
  {
    id: "der-tellensprung-am-axen-uri",
    title: "Der Tellensprung am Axen",
    canton: "Uri",
    coreMotif: "Geistesgegenwart schenkt einem Gefangenen die Freiheit",
    bildmotiv: "Tellskapelle, Axen, Vierwaldstättersee, Felsplatte",
    mood: "Abenteuerlich und befreiend",
    summary:
      "Der genaue Ort: Die historische Tellskapelle am Seeufer bei Sisikon. Nach dem Vorfall in Altdorf liess der erzürnte Landvogt Gessler Wilhelm Tell fesseln. Da er ihn im Kanton Uri wegen der aufgebrachten Stimmung im Volk nicht direkt hinrichten lassen wollte, sollte Tell per Schiff über den Vierwaldstättersee in die Festung Küssnacht überführt werden. Als das Boot die steilen Felswände des Axens passierte, brach plötzlich ein schwerer Föhnsturm los. Die Wellen peitschten hoch auf, und die habsburgischen Schiffsleute verloren im dichten Nebel und der Gischt die Kontrolle über das Fahrzeug. In Todesangst erinnerte sich der Vogt daran, dass Tell ein erfahrener Steuermann war. Gessler befahl, die Fesseln des Gefangenen zu lösen, damit dieser das Ruder übernehme und sie vor dem Zerschellen an den Klippen rette. Tell stellte sich ans Heck, steuerte das Boot geschickt durch die Brandung und hielt direkt auf eine flache Felsplatte zu, die aus dem Wasser ragte. Als das Schiff nah genug war, packte Tell seine Armbrust, die auf dem Deck lag, und sprang mit einem mächtigen Satz auf den sicheren Felsen. Im selben Moment stiess er das Boot mit dem Fuss zurück in die tobenden Fluten des Sees, sodass die Häscher hilflos abtrieben. Tell war frei und floh über die Berge des Axens weiter, um sein Schicksal zu erfüllen.",
    summaries: URI_NEW_SAGA_SUMMARIES.tellensprung,
    altersstufenHinweis: null,
    quelle: null,
    source:
      "Aegidius Tschudi: Chronicon Helveticum (Standardwerk der Schweizer Befreiungstradition).",
    lat: 46.932663,
    lng: 8.611816,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Tellskapelle am Axen, Sisikon",
  },
  {
    id: "das-versunkene-schloss-im-bannwald-von-andermatt-uri",
    title: "Das versunkene Schloss im Bannwald von Andermatt",
    canton: "Uri",
    coreMotif: "Hochmut und Hartherzigkeit rufen die Naturgewalt herbei",
    bildmotiv: "Bannwald, Andermatt, Lawine, verschüttete Burg",
    mood: "Düster und mahnend",
    summary:
      "Der genaue Ort: Das Zentrum des steilen Bannwalds oberhalb der Kirche von Andermatt. Hoch oben über dem heutigen Talboden von Andermatt, dort wo heute der dichte und steile Nadelwald wächst, stand im frühen Mittelalter eine prachtvolle, uneinnehmbare Burg. Die dortigen Schlossherren waren unermesslich reich, aber im gleichen Masse geizig, hochmütig und hartherzig gegenüber den einfachen Bauern im Urserental. In einem bitterkalten, schneereichen Winter klopfte ein entkräfteter, hungernder Greis an das Burgtor und bettelte im Namen Gottes um eine warme Suppe und ein kurzes Nachtlager. Die Schlossherren lachten den Alten jedoch nur aus, schütteten eine Schale eiskaltes Wasser über ihm aus und liessen ihn von ihren Hunden vertreiben. Der Bettler schleppte sich ins Tal hinab und prophezeite den Untergang des stolzen Hauses. In der folgenden Nacht erwachte der Berg. Ein dumpfes Grollen erschütterte das Tal, und eine gigantische Lawine aus Schnee, Eis und Felsmassen brach los. Sie begrub das Schloss samt seinen Bewohnern und Schätzen spurlos unter sich. Als das Frühjahr kam, wuchsen auf den Trümmern junge Bäume, die im Laufe der Jahrhunderte zu einem dichten Wald heranreiften. Die Urner erkannten, dass dieser spezifische Wald das darunterliegende Dorf vor zukünftigen Lawinen schützte, und erklärten ihn zum heiligen «Bannwald». Seither schützt der Wald das Dorf – und die Reste des sündigen Schlosses ruhen für immer tief unter seinen Wurzeln.",
    summaries: URI_NEW_SAGA_SUMMARIES.schloss,
    altersstufenHinweis: "Die Lawine und die Strafe können für jüngere Kinder weniger bedrohlich erzählt werden.",
    quelle: null,
    source:
      "Karl Meyer: Urserner Sagen und Altertümer (19. Jahrhundert) / Schweizerische Gesellschaft für Volkskunde (SGV).",
    lat: 46.632222,
    lng: 8.596944,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Bannwald, Andermatt",
  },
  {
    id: "das-schlangengeli-auf-dem-sustenpass-uri",
    title: "Das Schlangengeli auf dem Sustenpass",
    canton: "Uri",
    coreMotif: "Ehrlichkeit schützt vor der Versuchung des Schatzes",
    bildmotiv: "Sustenpass, Schlangengeli, Steingletscher, Schatz",
    mood: "Mystisch und geheimnisvoll",
    summary:
      "Der genaue Ort: Der historische Susten-Passweg auf der Urner Seite nahe der Passhöhe. Die Säumer und Händler, die im Mittelalter schwere Waren über den rauen Sustenpass transportierten, mieden die Abendstunden in einer bestimmten Felsgegend des Meientals. Dort hauste das «Schlangengeli» – eine riesige, silbern schimmernde Schlange, die auf ihrem Kopf ein kleines, goldenes Krönchen trug. Das Fabelwesen bewachte einen sagenhaften Hort aus alten Silbermünzen und Edelsteinen, der in einer tiefen Erdspalte verborgen lag. Das Schlangengeli war keineswegs grundlos bösartig: Fleissige Säumer, arme Hirten oder ehrliche Wanderer liess es gewähren und wärmte sich manchmal friedlich an deren Lagerfeuern. Doch wehe dem, der von Gier getrieben wurde und versuchte, sich dem Silberschatz zu nähern. Sobald ein Dieb die Felsspalte inspizierte, schwoll die Schlange zu ungeheurer Grösse an, stiess giftige, grüne Dämpfe aus und peitschte mit ihrem Schwanz so heftig gegen die Felsen, dass Steinschläge die Schatzsucher in die Tiefe rissen. Erst als die Route im 19. Jahrhundert modern ausgebaut und ein christlicher Bildstock errichtet wurde, zog sich das geheimnisvolle Wesen tief in das ewige Eis des Steingletschers zurück, wo der Schatz bis heute verborgen liegt.",
    summaries: URI_NEW_SAGA_SUMMARIES.schlangengeli,
    altersstufenHinweis: "Die Steinschläge und giftigen Dämpfe können für jüngere Kinder abgeschwächt werden.",
    quelle: null,
    source:
      "M. Lütolf: Sagen, Bräuche und Legenden aus den fünf Orten (1862), Kapitel «Alp- und Passdämonen».",
    lat: 46.729166,
    lng: 8.445833,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Sustenpass, Urner Seite",
  },
  {
    id: "die-sage-vom-totenvogt-in-buerglen-uri",
    title: "Die Sage vom Totenvogt in Bürglen",
    canton: "Uri",
    coreMotif: "Schuld findet erst durch ein Geständnis Ruhe",
    bildmotiv: "Friedhof Bürglen, Totenvogt, Pfarrkirche",
    mood: "Unheimlich und mahnend",
    summary:
      "Der genaue Ort: Der historische Friedhofsbereich direkt neben der Pfarrkirche St. Peter und Paul in Bürglen. In Bürglen lebte einst ein tyrannischer Gemeindevogt, der während seiner Amtszeit die armen Witwen und Waisen skrupellos ausbeutete, Grenzen zu seinen Gunsten verschob und sogar Gelder aus der Kirchenkasse veruntreute. Er starb plötzlich eines unnatürlichen Todes, ohne dass ihm ein Priester die letzte Ölung geben oder er seine Sünden beichten konnte. Die Dorfbewohner begruben ihn auf dem lokalen Friedhof. Doch schon in der ersten Nacht nach dem Begräbnis fand der Vogt keine Ruhe im geweihten Boden. Unheimliche Geräusche, das Rasseln von schweren Ketten und ein markerschütterndes Wehklagen drangen fortan jede Nacht aus seinem Grab und raubten den Anwohnern den Schlaf. Die Geister der anderen Verstorbenen schienen den Sünder aus ihrer Mitte vertreiben zu wollen. Schliesslich hielt der Ortspfarrer um Mitternacht eine feierliche Seelenmesse ab. Er trat auf den Friedhof und beschwor den Geist des Vogtes, der in Flammengestalt vor ihm erschien. Der Pfarrer zwang den Geist, seine Sünden zu gestehen, schrieb diese auf ein Pergament und verbrannte es direkt auf der Grabstätte, während er den Exorzismus sprach. Erst durch dieses rituelle Verbrennen der Schuld fand der Totenvogt seine Ruhe, und auf dem Friedhof von Bürglen war fortan kein Klagen mehr zu hören.",
    summaries: URI_NEW_SAGA_SUMMARIES.totenvogt,
    altersstufenHinweis: "Geist, Grab und Exorzismus können für jüngere Kinder behutsam abgemildert werden.",
    quelle: null,
    source:
      "Eduard Hoffmann-Krayer: Schriften zur Schweizer Volkskunde (spätes 19. Jahrhundert).",
    lat: 46.874962984919144,
    lng: 8.662427328486002,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Pfarrkirche St. Peter und Paul, Bürglen",
  },
  {
    id: "das-verzauberte-fraeulein-von-attinghausen-uri",
    title: "Das verzauberte Fräulein von Attinghausen",
    canton: "Uri",
    coreMotif: "Hochmut bindet eine ruhelose Hüterin an ihre Burgruine",
    bildmotiv: "Burgruine Attinghausen, Wohnturm, Weisse Frau",
    mood: "Unheimlich und romantisch",
    summary:
      "Der genaue Ort: Der historische Wohnturm der Burgruine Attinghausen bei Altdorf. Auf der stolzen Burg Attinghausen residierten im Mittelalter die mächtigen Freiherren von Attinghausen, die über weite Teile des Urnerlandes herrschten. Die Sage erzählt von der letzten Tochter des Hauses, einem aussergewöhnlich schönen, aber hochmütigen Fräulein. Sie wies jeden rechtschaffenen Freier aus dem Lande hochmütig zurück und verschwendete das Geld der Familie für Prunk und rauschende Feste, während die Bauern im Tal Hunger litten. Als die Burg in den Schweizer Befreiungskriegen schliesslich belagert und zerstört wurde, kam die stolze Jungfrau in den Flammen des Wohnturms ums Leben. Da sie jedoch vor ihrem Tod keine Reue zeigte, fand ihre Seele keine Ruhe. Sie wurde dazu verdammt, als «Weisse Frau» oder verwandelte Schlange die tiefen, unterirdischen Gewölbe und den alten Burgbrunnen zu bewachen, in denen der Familienschatz vergraben liegt. Die Sage besagt, dass sie alle hundert Jahre in den Ruinen erscheint und darauf wartet, von einem Jüngling reinen Herzens durch einen furchtlosen Kuss erlöst zu werden. Bis heute meiden viele Einheimische die dunklen Ecken der Ruine in stürmischen Neumondnächten.",
    summaries: URI_NEW_SAGA_SUMMARIES.attinghausen,
    altersstufenHinweis: "Hochmut, Tod im Feuer und die verwandelte Schlange für jüngere Kinder behutsam erzählen; die Erlösungssuche in den Vordergrund stellen.",
    quelle: {
      autor: "M. Lütolf; Franz Josef Vonmatt",
      werk: "Sagen, Bräuche und Legenden aus den fünf Orten; Sagen des Kantons Uri",
      jahr: "1862; 19. Jahrhundert",
      fundstelleUrl:
        "https://reader.digitale-sammlungen.de/resolve/display/bsb10453839.html",
    },
    source:
      "M. Lütolf: Sagen, Bräuche und Legenden aus den fünf Orten (1862) sowie Franz Josef Vonmatt: Sagen des Kantons Uri (19. Jahrhundert).",
    lat: 46.862226238198744,
    lng: 8.629795166358955,
    koordinatenSicherheit: "exakt",
    isAnchorPlace: true,
    fotoUrl: null,
    fotoAttribution: null,
    ortName: "Wohnturm der Burgruine Attinghausen",
  },
];

const RETIRED_URI_SAGA_IDS = new Set([
  "wilhelm-tell-uri",
  "der-grenzlauf-uri",
  "der-zuschauer-bei-der-totenprozession-uri",
  "liebeszauber-uri",
  "der-geschundene-senn-uri",
  "die-vergebung-der-schuld-uri",
  "die-b-ssenden-seelen-im-eis-uri",
  "sturz-des-mandlisers-uri",
]);

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

const activeBundledSagas = bundledSagas.filter(
  (saga) => !RETIRED_URI_SAGA_IDS.has(saga.id),
);

export const CURATED_SAGAS: InsertCatalogSaga[] = [
  ...activeBundledSagas,
  ...URI_NEW_SAGAS,
].map((saga) => ({
  ...saga,
  ...(REPLACEMENTS[saga.id] ?? {}),
}));
