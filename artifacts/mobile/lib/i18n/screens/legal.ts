import { createUseStrings, StringsDict } from "../createStrings";

export interface LegalStrings {
  eyebrow: string;
  datenschutzTitle: string;
  impressumTitle: string;
  datenschutz: {
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
    q4: string;
    a4: string;
  };
  impressum: {
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
    q4: string;
    a4: string;
  };
}

const LEGAL_STRINGS: StringsDict<LegalStrings> = {
  de: {
    eyebrow: "Recht & Daten",
    datenschutzTitle: "Datenschutz",
    impressumTitle: "Impressum",
    datenschutz: {
      q1: "Welche Daten wir erheben",
      a1: "SagaTrail verarbeitet Standortdaten (nur während einer aktiven Wanderung), dein Profil (Name, Archetyp, Heimatkanton, Sprache, Alterstufe) sowie deinen Story-Fortschritt und freigeschaltete Sammlungen.",
      q2: "Wo die Daten liegen",
      a2: "In diesem Erststart-Build werden alle Daten ausschliesslich lokal auf deinem Gerät gespeichert. Es findet keine Übertragung an Server statt. Du kannst deine Daten jederzeit in den Einstellungen exportieren oder vollständig löschen.",
      q3: "Standort",
      a3: "Der Standort wird nur genutzt, um Erzählmomente an den passenden Wegpunkten auszulösen. Du kannst die Berechtigung jederzeit im Betriebssystem widerrufen; die App funktioniert dann mit einer simulierten Route weiter.",
      q4: "Kinder",
      a4: "Für die Alterstufe Kinder ist die Bestätigung einer erziehungsberechtigten Person erforderlich. Inhalte werden altersgerecht entschärft.",
    },
    impressum: {
      q1: "Anbieter",
      a1: "SagaTrail (Erststart-Build). Verantwortlich für den Inhalt der App ist das SagaTrail-Team.",
      q2: "Sagen & Quellen",
      a2: "Die erzählten Sagen beruhen auf gemeinfreien Überlieferungen und historischen Sagensammlungen. Die jeweilige Quelle ist in jeder Sage ausgewiesen.",
      q3: "Notfall",
      a3: "SagaTrail ersetzt keine offizielle Notfall- oder Bergrettungs-App. Im Notfall gilt: Rega 1414 oder Euro-Notruf 112.",
      q4: "Kontakt",
      a4: "support@sagatrail.ch",
    },
  },
  gsw: {
    eyebrow: "Rächt & Date",
    datenschutzTitle: "Dateschutz",
    impressumTitle: "Impressum",
    datenschutz: {
      q1: "Weli Date mir sammled",
      a1: "SagaTrail verarbeitet Standortdate (nur während ere aktive Wanderig), dis Profil (Name, Archetyp, Heimatkanton, Sprach, Alterstufe) sowie din Story-Fortschritt und freigschalteti Sammlige.",
      q2: "Wo d'Date ligged",
      a2: "In däm Erschtstart-Build wärdet alli Date usschliesslich lokal uf dim Grät gspeicheret. Es findet kei Übertragig an Server statt. Du chasch dini Date jederzeit in de Iistellige exportiere oder vollständig lösche.",
      q3: "Standort",
      a3: "De Standort wird nur gnutzt, zum Verzällmomänt a de passende Wägpunkt uszlöse. Du chasch d'Berechtigig jederzeit im Betriebssystem widerruefe; d'App funktioniert dänn mit ere simulierte Route wiiter.",
      q4: "Chind",
      a4: "Für d'Alterstufe Chind isch d'Bestätigung vonere erziehigsberechtigte Person erforderlich. Inhält wärdet altersgrächt entschärft.",
    },
    impressum: {
      q1: "Aabieter",
      a1: "SagaTrail (Erschtstart-Build). Verantwortlich für de Inhalt vode App isch s'SagaTrail-Team.",
      q2: "Sage & Quelle",
      a2: "D'verzällte Sage beruehed uf gmeinfreie Überliferige und historische Sagesammlige. Die jeweiligi Quelle isch in jedere Sag uusgwise.",
      q3: "Notfall",
      a3: "SagaTrail ersetzt kei offizielli Notfall- oder Bärgrettigs-App. Im Notfall gilt: Rega 1414 oder Euro-Notruef 112.",
      q4: "Kontakt",
      a4: "support@sagatrail.ch",
    },
  },
  en: {
    eyebrow: "Legal & Data",
    datenschutzTitle: "Privacy Policy",
    impressumTitle: "Imprint",
    datenschutz: {
      q1: "What data we collect",
      a1: "SagaTrail processes location data (only during an active hike), your profile (name, archetype, home canton, language, age tier) as well as your story progress and unlocked collections.",
      q2: "Where the data is stored",
      a2: "In this early launch build, all data is stored exclusively locally on your device. No data is transmitted to servers. You can export or completely delete your data at any time in the settings.",
      q3: "Location",
      a3: "Location is only used to trigger story moments at the appropriate waypoints. You can revoke this permission at any time in the operating system; the app will then continue to function with a simulated route.",
      q4: "Children",
      a4: "For the children's age tier, confirmation from a parent or legal guardian is required. Content is adapted to be age-appropriate.",
    },
    impressum: {
      q1: "Provider",
      a1: "SagaTrail (Early Launch Build). The SagaTrail team is responsible for the content of the app.",
      q2: "Legends & Sources",
      a2: "The stories told are based on public domain traditions and historical legend collections. The respective source is indicated in each legend.",
      q3: "Emergency",
      a3: "SagaTrail does not replace any official emergency or mountain rescue app. In case of emergency: Rega 1414 or Euro emergency 112.",
      q4: "Contact",
      a4: "support@sagatrail.ch",
    },
  },
  fr: {
    eyebrow: "Droit & Données",
    datenschutzTitle: "Confidentialité",
    impressumTitle: "Mentions Légales",
    datenschutz: {
      q1: "Quelles données nous collectons",
      a1: "SagaTrail traite les données de localisation (uniquement lors d'une randonnée active), votre profil (nom, archétype, canton d'origine, langue, tranche d'âge) ainsi que votre progression dans l'histoire et les collections débloquées.",
      q2: "Où se trouvent les données",
      a2: "Dans cette version de lancement, toutes les données sont stockées exclusivement localement sur votre appareil. Aucun transfert vers des serveurs n'a lieu. Vous pouvez exporter ou supprimer complètement vos données à tout moment dans les paramètres.",
      q3: "Localisation",
      a3: "La localisation n'est utilisée que pour déclencher des moments de narration aux points de passage appropriés. Vous pouvez révoquer l'autorisation à tout moment dans le système d'exploitation ; l'application continuera alors de fonctionner avec un itinéraire simulé.",
      q4: "Enfants",
      a4: "Pour la tranche d'âge des enfants, la confirmation d'un parent ou d'un tuteur légal est requise. Le contenu est adapté à l'âge.",
    },
    impressum: {
      q1: "Prestataire",
      a1: "SagaTrail (Version de lancement). L'équipe SagaTrail est responsable du contenu de l'application.",
      q2: "Légendes & Sources",
      a2: "Les légendes racontées sont basées sur des traditions du domaine public et des recueils de légendes historiques. La source respective est indiquée dans chaque légende.",
      q3: "Urgence",
      a3: "SagaTrail ne remplace aucune application officielle de secours ou de sauvetage en montagne. En cas d'urgence : Rega 1414 ou numéro d'urgence européen 112.",
      q4: "Contact",
      a4: "support@sagatrail.ch",
    },
  },
  it: {
    eyebrow: "Legale & Dati",
    datenschutzTitle: "Protezione Dati",
    impressumTitle: "Note Legali",
    datenschutz: {
      q1: "Quali dati raccogliamo",
      a1: "SagaTrail elabora i dati sulla posizione (solo durante un'escursione attiva), il tuo profilo (nome, archetipo, cantone di origine, lingua, fascia d'età), nonché i tuoi progressi nella storia e le collezioni sbloccate.",
      q2: "Dove risiedono i dati",
      a2: "In questa build di lancio iniziale, tutti i dati vengono memorizzati esclusivamente in locale sul tuo dispositivo. Non avviene alcun trasferimento ai server. Puoi esportare o cancellare completamente i tuoi dati in qualsiasi momento nelle impostazioni.",
      q3: "Posizione",
      a3: "La posizione viene utilizzata solo per attivare momenti narrativi nei punti di passaggio appropriati. Puoi revocare l'autorizzazione in qualsiasi momento nel sistema operativo; l'app continuerà quindi a funzionare con un percorso simulato.",
      q4: "Bambini",
      a4: "Per la fascia d'età dei bambini è richiesta la conferma di un genitore o di un tutore legale. I contenuti vengono adattati all'età.",
    },
    impressum: {
      q1: "Fornitore",
      a1: "SagaTrail (Build di lancio iniziale). Il team di SagaTrail è responsabile del contenuto dell'app.",
      q2: "Leggende & Fonti",
      a2: "Le leggende raccontate si basano su tradizioni di pubblico dominio e raccolte storiche di leggende. La rispettiva fonte è indicata in ogni leggenda.",
      q3: "Emergenza",
      a3: "SagaTrail non sostituisce alcuna app ufficiale di emergenza o soccorso alpino. In caso di emergenza: Rega 1414 o numero di emergenza europeo 112.",
      q4: "Contatto",
      a4: "support@sagatrail.ch",
    },
  },
  es: {
    eyebrow: "Legal & Datos",
    datenschutzTitle: "Privacidad",
    impressumTitle: "Aviso Legal",
    datenschutz: {
      q1: "Qué datos recopilamos",
      a1: "SagaTrail procesa datos de ubicación (solo durante una caminata activa), tu perfil (nombre, arquetipo, cantón de origen, idioma, rango de edad), así como tu progreso en la historia y las colecciones desbloqueadas.",
      q2: "Dónde están los datos",
      a2: "En esta versión de lanzamiento inicial, todos los datos se almacenan exclusivamente de forma local en tu dispositivo. No se realiza ninguna transferencia a servidores. Puedes exportar o eliminar completamente tus datos en cualquier momento en la configuración.",
      q3: "Ubicación",
      a3: "La ubicación solo se utiliza para activar momentos narrativos en los puntos de ruta adecuados. Puedes revocar el permiso en cualquier momento en el sistema operativo; la aplicación seguirá funcionando con una ruta simulada.",
      q4: "Niños",
      a4: "Para el rango de edad de los niños, se requiere la confirmación de un padre o tutor legal. El contenido se adapta a la edad.",
    },
    impressum: {
      q1: "Proveedor",
      a1: "SagaTrail (Versión de lanzamiento inicial). El equipo de SagaTrail es responsable del contenido de la aplicación.",
      q2: "Leyendas & Fuentes",
      a2: "Las leyendas contadas se basan en tradiciones de dominio público y colecciones históricas de leyendas. La fuente respectiva se indica en cada leyenda.",
      q3: "Emergencia",
      a3: "SagaTrail no reemplaza ninguna aplicación oficial de emergencia o rescate de montaña. En caso de emergencia: Rega 1414 o número de emergencia europeo 112.",
      q4: "Contacto",
      a4: "support@sagatrail.ch",
    },
  },
  pt: {
    eyebrow: "Jurídico & Dados",
    datenschutzTitle: "Privacidade",
    impressumTitle: "Aviso Legal",
    datenschutz: {
      q1: "Quais dados coletamos",
      a1: "SagaTrail processa dados de localização (apenas durante uma caminhada ativa), seu perfil (nome, arquétipo, cantão de origem, idioma, faixa etária), bem como seu progresso na história e coleções desbloqueadas.",
      q2: "Onde os dados ficam",
      a2: "Nesta versão de lançamento inicial, todos os dados são armazenados exclusivamente de forma local no seu dispositivo. Não ocorre nenhuma transferência para servidores. Você pode exportar ou excluir completamente seus dados a qualquer momento nas configurações.",
      q3: "Localização",
      a3: "A localização é usada apenas para acionar momentos da narrativa nos pontos de passagem apropriados. Você pode revogar a permissão a qualquer momento no sistema operacional; o aplicativo continuará funcionando com uma rota simulada.",
      q4: "Crianças",
      a4: "Para a faixa etária das crianças, é necessária a confirmação de um pai ou responsável legal. O conteúdo é adaptado à idade.",
    },
    impressum: {
      q1: "Provedor",
      a1: "SagaTrail (Versão de lançamento inicial). A equipe SagaTrail é responsável pelo conteúdo do aplicativo.",
      q2: "Lendas & Fontes",
      a2: "As lendas contadas baseiam-se em tradições de domínio público e coleções históricas de lendas. A respectiva fonte é indicada em cada lenda.",
      q3: "Emergência",
      a3: "SagaTrail não substitui nenhum aplicativo oficial de emergência ou resgate de montanha. Em caso de emergência: Rega 1414 ou número de emergência europeu 112.",
      q4: "Contato",
      a4: "support@sagatrail.ch",
    },
  },
  zh: {
    eyebrow: "法律与数据",
    datenschutzTitle: "隐私政策",
    impressumTitle: "法律声明",
    datenschutz: {
      q1: "我们收集哪些数据",
      a1: "SagaTrail 处理位置数据（仅在活跃徒步期间）、您的个人资料（姓名、原型、家乡州、语言、年龄段）以及您的故事进度和解锁的收藏。",
      q2: "数据存储在哪里",
      a2: "在此初始启动版本中，所有数据都专门存储在您的设备本地。不会向服务器传输任何数据。您可以随时在设置中导出或完全删除您的数据。",
      q3: "位置",
      a3: "位置仅用于在适当的路点触发叙事时刻。您可以随时在操作系统中撤销授权；随后应用程序将通过模拟路线继续运行。",
      q4: "儿童",
      a4: "对于儿童年龄段，需要父母或法定监护人的确认。内容会根据年龄进行调整。",
    },
    impressum: {
      q1: "提供者",
      a1: "SagaTrail (初始启动版本)。SagaTrail 团队负责应用程序的内容。",
      q2: "传说与来源",
      a2: "讲述的故事基于公共领域的传统和历史传说集。每个传说中都注明了相应的来源。",
      q3: "紧急情况",
      a3: "SagaTrail 不能替代任何官方紧急或山地救援应用程序。在紧急情况下：Rega 1414 或欧洲紧急电话 112。",
      q4: "联系方式",
      a4: "support@sagatrail.ch",
    },
  },
};

export const useLegalStrings = createUseStrings(LEGAL_STRINGS);
