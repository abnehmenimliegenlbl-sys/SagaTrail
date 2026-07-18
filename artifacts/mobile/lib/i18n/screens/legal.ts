import { createUseStrings, StringsDict } from "../createStrings";

export interface LegalStrings {
  eyebrow: string;
  datenschutzTitle: string;
  impressumTitle: string;
  datenschutz: Array<{ q: string; a: string }>;
  impressum: Array<{ q: string; a: string }>;
}

const LEGAL_STRINGS: StringsDict<LegalStrings> = {
  de: {
    eyebrow: "Recht & Daten",
    datenschutzTitle: "Datenschutz",
    impressumTitle: "Impressum",
    datenschutz: [
      {
        q: "Verantwortlicher",
        a: "SagaTrail ist verantwortlich für die Verarbeitung deiner personenbezogenen Daten. Kontakt: info@sagatrail.ch",
      },
      {
        q: "Welche Daten wir verarbeiten",
        a: "Standortdaten (nur während aktiver Wanderung), Profildaten (Name, Archetyp, Heimatkanton, Sprache, Alterstufe), Wanderfortschritt & freigeschaltete Inhalte, Gerätekennungen für Push-Benachrichtigungen sowie anonymisierte Zahlungsmetadaten via App Store.",
      },
      {
        q: "Authentifizierung (Clerk)",
        a: "Für die Anmeldung nutzen wir Clerk (clerk.com). Clerk speichert deine E-Mail-Adresse und OAuth-Token sicher. Mehr dazu: clerk.com/privacy",
      },
      {
        q: "Zahlungen & Abonnements (RevenueCat)",
        a: "Abonnements werden über den App Store abgewickelt. RevenueCat (revenuecat.com) verwaltet den Abonnementstatus. Keine Kreditkartendaten gelangen zu SagaTrail.",
      },
      {
        q: "Standortdaten",
        a: "Der Standort wird nur während einer aktiven Wanderung erhoben, um Story-Momente an den richtigen Wegpunkten auszulösen. Standortdaten werden nicht dauerhaft auf Servern gespeichert. Du kannst die Berechtigung jederzeit im Betriebssystem widerrufen.",
      },
      {
        q: "Deine Rechte (nDSG / DSGVO)",
        a: "Du hast das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit. Zur Kontolöschung nutze die Option in den Einstellungen oder wende dich an info@sagatrail.ch.",
      },
      {
        q: "Datensicherheit",
        a: "Alle Daten werden verschlüsselt übertragen (TLS 1.3). Unsere Serverinfrastruktur befindet sich in der EU und entspricht dem Schweizer DSG sowie der DSGVO.",
      },
      {
        q: "Kinder",
        a: "SagaTrail ist nicht für Kinder unter 13 Jahren bestimmt. Für die Alterstufe Kinder ist die Bestätigung einer erziehungsberechtigten Person erforderlich.",
      },
    ],
    impressum: [
      {
        q: "Anbieter",
        a: "SagaTrail\nKontakt: info@sagatrail.ch\nWebsite: sagatrail.ch",
      },
      {
        q: "Sagen & Quellen",
        a: "Die erzählten Sagen beruhen auf gemeinfreien Überlieferungen und historischen Sagensammlungen der Schweiz. Die jeweilige Quelle ist in jeder Sage ausgewiesen.",
      },
      {
        q: "Kartendaten",
        a: "Kartendaten: © OpenStreetMap-Mitwirkende (ODbL). Wanderwege: Waymarked Trails. Topografische Daten: © swisstopo (Bundesamt für Landestopografie). Routing: FOSSGIS Valhalla.",
      },
      {
        q: "KI-Erzählstimmen",
        a: "Erzähltexte werden durch KI-Stimmen (ElevenLabs, OpenAI) gesprochen. Die Inhalte sind menschlich redigiert und kuratiert.",
      },
      {
        q: "Notfall",
        a: "SagaTrail ersetzt keine offizielle Bergrettungs- oder Notfall-App. In einer Notlage: Rega 1414 oder europäischer Notruf 112.",
      },
      {
        q: "Haftungsausschluss",
        a: "SagaTrail übernimmt keine Haftung für die Richtigkeit von Routendaten oder Wetterbedingungen. Wanderungen erfolgen auf eigene Verantwortung. Bitte informiere dich vor jeder Wanderung über aktuelle Bedingungen.",
      },
    ],
  },
  gsw: {
    eyebrow: "Rächt & Date",
    datenschutzTitle: "Dateschutz",
    impressumTitle: "Impressum",
    datenschutz: [
      {
        q: "Verantwortlechi",
        a: "SagaTrail isch verantwortlich für d'Veraarbeitig vo dine persoonebezogene Date. Kontakt: info@sagatrail.ch",
      },
      {
        q: "Weli Date mir veraarbeited",
        a: "Standortdate (nur während aktiver Wanderig), Profildaten (Name, Archetyp, Heimetkanton, Sprach, Alterstuefe), Wanderfortschritt & freigschalteti Inhält, Grätkennige für Push-Miiteilige sowie anonymisiertä Zahligsmetadate via App Store.",
      },
      {
        q: "Aamehldig (Clerk)",
        a: "Für d'Aamehldig nütze mir Clerk (clerk.com). Clerk speicheret dini E-Mail und OAuth-Token sicher. Meh derzue: clerk.com/privacy",
      },
      {
        q: "Zahlige & Abos (RevenueCat)",
        a: "Abos wärdet über de App Store abgwicklet. RevenueCat (revenuecat.com) verwaltet de Abo-Status. Keini Kreditkartedaten gönd zu SagaTrail.",
      },
      {
        q: "Standortdate",
        a: "De Standort wird nur während ere aktive Wanderig erhoben, um Story-Momänt a de richtige Wägpunkt uszlöse. Standortdate wärdet nöd dauerhaft uf Server gspeicheret. Du chasch d'Berechtigig jederzeit im Betriebssystem widerruefe.",
      },
      {
        q: "Dini Rächt (nDSG / DSGVO)",
        a: "Du hesch s'Rächt uf Uuskunft, Berichtigig, Löschig und Dateuibertragbarkeit. Zum Kontolösche nütz d'Option in de Iistellige oder wend dich an info@sagatrail.ch.",
      },
      {
        q: "Datesicherheit",
        a: "Alli Date wärdet verschlüsslet übertrage (TLS 1.3). Euseri Server-Infrastruktur isch in de EU und entspricht em Schwiizer DSG sowie de DSGVO.",
      },
      {
        q: "Chind",
        a: "SagaTrail isch nöd für Chind under 13 Jahr bestimmt. Für d'Alterstuefe Chind isch d'Bestätigung vonere erziehigsberechtigte Person erforderlich.",
      },
    ],
    impressum: [
      {
        q: "Aabieter",
        a: "SagaTrail\nKontakt: info@sagatrail.ch\nWebsite: sagatrail.ch",
      },
      {
        q: "Sage & Quelle",
        a: "D'verzällte Sage beruehed uf gmeinfreie Überliferige und historische Sagesammlige vode Schwiiz. Die jeweiligi Quelle isch in jedere Sag uusgwise.",
      },
      {
        q: "Chartedated",
        a: "Chartedated: © OpenStreetMap-Mitwirkendi (ODbL). Wanderwäg: Waymarked Trails. Topografischi Date: © swisstopo. Routing: FOSSGIS Valhalla.",
      },
      {
        q: "KI-Erzählstimme",
        a: "Erzähltäxt wärdet durch KI-Stimme (ElevenLabs, OpenAI) gsproched. D'Inhält sind mänschlich redigiert und kuriert.",
      },
      {
        q: "Notfall",
        a: "SagaTrail ersetzt keini offizielli Bärgrettigs- oder Notfall-App. Im Notfall: Rega 1414 oder Euro-Notruef 112.",
      },
      {
        q: "Haftiigsussschluss",
        a: "SagaTrail übernimmt keini Haftig für d'Richtigkeit vo Routedate oder Wetterbedingige. Wanderige gschähed uf eigeni Verantwortung.",
      },
    ],
  },
  en: {
    eyebrow: "Legal & Data",
    datenschutzTitle: "Privacy Policy",
    impressumTitle: "Imprint",
    datenschutz: [
      {
        q: "Data Controller",
        a: "SagaTrail is responsible for processing your personal data. Contact: info@sagatrail.ch",
      },
      {
        q: "What data we process",
        a: "Location data (only during active hikes), profile data (name, archetype, home canton, language, age tier), hike progress & unlocked content, device identifiers for push notifications, and anonymised payment metadata via the App Store.",
      },
      {
        q: "Authentication (Clerk)",
        a: "We use Clerk (clerk.com) for sign-in. Clerk securely stores your email address and OAuth tokens. More: clerk.com/privacy",
      },
      {
        q: "Payments & Subscriptions (RevenueCat)",
        a: "Subscriptions are processed through the App Store. RevenueCat (revenuecat.com) manages subscription status. No credit card data is shared with SagaTrail.",
      },
      {
        q: "Location data",
        a: "Location is only collected during an active hike to trigger story moments at the right waypoints. Location data is not permanently stored on servers. You can revoke this permission at any time in your device settings.",
      },
      {
        q: "Your rights (GDPR / nFADP)",
        a: "You have the right to access, correct, delete, and port your data. To delete your account, use the option in Settings or contact info@sagatrail.ch.",
      },
      {
        q: "Data security",
        a: "All data is transmitted with encryption (TLS 1.3). Our server infrastructure is located in the EU and complies with Swiss DSG and GDPR.",
      },
      {
        q: "Children",
        a: "SagaTrail is not intended for children under 13. For the children's age tier, confirmation from a parent or legal guardian is required.",
      },
    ],
    impressum: [
      {
        q: "Provider",
        a: "SagaTrail\nContact: info@sagatrail.ch\nWebsite: sagatrail.ch",
      },
      {
        q: "Legends & Sources",
        a: "The stories told are based on public-domain traditions and historical Swiss legend collections. Each legend credits its source.",
      },
      {
        q: "Map data",
        a: "Map data: © OpenStreetMap contributors (ODbL). Hiking trails: Waymarked Trails. Topographic data: © swisstopo. Routing: FOSSGIS Valhalla.",
      },
      {
        q: "AI narration voices",
        a: "Story texts are narrated by AI voices (ElevenLabs, OpenAI). All content is human-edited and curated.",
      },
      {
        q: "Emergency",
        a: "SagaTrail does not replace any official mountain rescue or emergency app. In an emergency: Rega 1414 or European emergency number 112.",
      },
      {
        q: "Disclaimer",
        a: "SagaTrail accepts no liability for the accuracy of route data or weather conditions. Hikes are undertaken at your own risk. Please check current conditions before every hike.",
      },
    ],
  },
  fr: {
    eyebrow: "Droit & Données",
    datenschutzTitle: "Confidentialité",
    impressumTitle: "Mentions Légales",
    datenschutz: [
      {
        q: "Responsable du traitement",
        a: "SagaTrail est responsable du traitement de vos données personnelles. Contact : info@sagatrail.ch",
      },
      {
        q: "Quelles données nous traitons",
        a: "Données de localisation (uniquement pendant une randonnée active), profil (nom, archétype, canton d'origine, langue, tranche d'âge), progression et contenus débloqués, identifiants d'appareil pour les notifications, métadonnées de paiement anonymisées via l'App Store.",
      },
      {
        q: "Authentification (Clerk)",
        a: "Nous utilisons Clerk (clerk.com) pour la connexion. Clerk stocke votre e-mail et vos jetons OAuth en toute sécurité. En savoir plus : clerk.com/privacy",
      },
      {
        q: "Paiements & abonnements (RevenueCat)",
        a: "Les abonnements sont traités via l'App Store. RevenueCat (revenuecat.com) gère le statut des abonnements. Aucune donnée de carte bancaire n'est transmise à SagaTrail.",
      },
      {
        q: "Données de localisation",
        a: "La localisation n'est collectée que pendant une randonnée active, pour déclencher des moments narratifs aux bons points de passage. Les données ne sont pas stockées durablement sur les serveurs. Vous pouvez révoquer l'autorisation à tout moment dans les paramètres de l'appareil.",
      },
      {
        q: "Vos droits (RGPD / LPD)",
        a: "Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité. Pour supprimer votre compte, utilisez l'option dans les Paramètres ou contactez info@sagatrail.ch.",
      },
      {
        q: "Sécurité des données",
        a: "Toutes les données sont transmises de manière chiffrée (TLS 1.3). Notre infrastructure serveur est en UE et respecte la LPD suisse et le RGPD.",
      },
      {
        q: "Enfants",
        a: "SagaTrail n'est pas destiné aux enfants de moins de 13 ans. Pour la tranche enfants, la confirmation d'un parent ou tuteur légal est requise.",
      },
    ],
    impressum: [
      {
        q: "Prestataire",
        a: "SagaTrail\nContact : info@sagatrail.ch\nSite web : sagatrail.ch",
      },
      {
        q: "Légendes & Sources",
        a: "Les légendes sont issues du domaine public et de recueils historiques suisses. Chaque légende mentionne sa source.",
      },
      {
        q: "Données cartographiques",
        a: "Cartes : © contributeurs OpenStreetMap (ODbL). Sentiers : Waymarked Trails. Données topo : © swisstopo. Routage : FOSSGIS Valhalla.",
      },
      {
        q: "Voix de narration IA",
        a: "Les textes sont lus par des voix IA (ElevenLabs, OpenAI). Tous les contenus sont édités et curatés par des humains.",
      },
      {
        q: "Urgence",
        a: "SagaTrail ne remplace aucune application officielle de secours en montagne. En cas d'urgence : Rega 1414 ou numéro d'urgence européen 112.",
      },
      {
        q: "Avertissement",
        a: "SagaTrail décline toute responsabilité quant à l'exactitude des données d'itinéraires ou des conditions météo. Les randonnées sont effectuées sous votre propre responsabilité.",
      },
    ],
  },
  it: {
    eyebrow: "Legale & Dati",
    datenschutzTitle: "Protezione Dati",
    impressumTitle: "Note Legali",
    datenschutz: [
      {
        q: "Titolare del trattamento",
        a: "SagaTrail è responsabile del trattamento dei tuoi dati personali. Contatto: info@sagatrail.ch",
      },
      {
        q: "Quali dati trattiamo",
        a: "Dati di posizione (solo durante un'escursione attiva), profilo (nome, archetipo, cantone, lingua, fascia d'età), progressi e contenuti sbloccati, identificatori del dispositivo per le notifiche, metadati di pagamento anonimi tramite App Store.",
      },
      {
        q: "Autenticazione (Clerk)",
        a: "Utilizziamo Clerk (clerk.com) per l'accesso. Clerk archivia in modo sicuro il tuo indirizzo email e i token OAuth. Maggiori info: clerk.com/privacy",
      },
      {
        q: "Pagamenti & abbonamenti (RevenueCat)",
        a: "Gli abbonamenti vengono elaborati tramite App Store. RevenueCat (revenuecat.com) gestisce lo stato degli abbonamenti. Nessun dato di carta di credito viene condiviso con SagaTrail.",
      },
      {
        q: "Dati di posizione",
        a: "La posizione viene raccolta solo durante un'escursione attiva per attivare i momenti narrativi. I dati non sono archiviati permanentemente sui server. Puoi revocare il permesso in qualsiasi momento nelle impostazioni del dispositivo.",
      },
      {
        q: "I tuoi diritti (GDPR / LPD)",
        a: "Hai il diritto di accesso, rettifica, cancellazione e portabilità dei dati. Per eliminare il tuo account, usa l'opzione nelle Impostazioni o contatta info@sagatrail.ch.",
      },
      {
        q: "Sicurezza dei dati",
        a: "Tutti i dati vengono trasmessi con crittografia (TLS 1.3). La nostra infrastruttura server è nell'UE e rispetta la LPD svizzera e il GDPR.",
      },
      {
        q: "Bambini",
        a: "SagaTrail non è destinato a bambini sotto i 13 anni. Per la fascia bambini, è richiesta la conferma di un genitore o tutore legale.",
      },
    ],
    impressum: [
      {
        q: "Fornitore",
        a: "SagaTrail\nContatto: info@sagatrail.ch\nSito web: sagatrail.ch",
      },
      {
        q: "Leggende & Fonti",
        a: "Le leggende sono tratte dal dominio pubblico e da raccolte storiche svizzere. Ogni leggenda cita la sua fonte.",
      },
      {
        q: "Dati cartografici",
        a: "Mappe: © contributori OpenStreetMap (ODbL). Sentieri: Waymarked Trails. Dati topografici: © swisstopo. Routing: FOSSGIS Valhalla.",
      },
      {
        q: "Voci di narrazione IA",
        a: "I testi vengono narrati da voci IA (ElevenLabs, OpenAI). Tutti i contenuti sono curati e revisionati da esseri umani.",
      },
      {
        q: "Emergenza",
        a: "SagaTrail non sostituisce nessuna app ufficiale di soccorso alpino. In caso di emergenza: Rega 1414 o numero europeo 112.",
      },
      {
        q: "Avvertenza",
        a: "SagaTrail non si assume alcuna responsabilità per l'accuratezza dei dati di percorso o delle condizioni meteo. Le escursioni vengono effettuate a proprio rischio.",
      },
    ],
  },
  es: {
    eyebrow: "Legal & Datos",
    datenschutzTitle: "Privacidad",
    impressumTitle: "Aviso Legal",
    datenschutz: [
      {
        q: "Responsable del tratamiento",
        a: "SagaTrail es responsable del tratamiento de tus datos personales. Contacto: info@sagatrail.ch",
      },
      {
        q: "Qué datos tratamos",
        a: "Datos de ubicación (solo durante una caminata activa), perfil (nombre, arquetipo, cantón, idioma, franja de edad), progreso y contenidos desbloqueados, identificadores de dispositivo para notificaciones, metadatos de pago anonimizados vía App Store.",
      },
      {
        q: "Autenticación (Clerk)",
        a: "Usamos Clerk (clerk.com) para el inicio de sesión. Clerk almacena de forma segura tu correo y tokens OAuth. Más info: clerk.com/privacy",
      },
      {
        q: "Pagos & suscripciones (RevenueCat)",
        a: "Las suscripciones se procesan a través del App Store. RevenueCat (revenuecat.com) gestiona el estado de las suscripciones. Ningún dato de tarjeta bancaria llega a SagaTrail.",
      },
      {
        q: "Datos de ubicación",
        a: "La ubicación solo se recoge durante una caminata activa para activar los momentos narrativos. Los datos no se almacenan permanentemente en servidores. Puedes revocar el permiso en cualquier momento en los ajustes del dispositivo.",
      },
      {
        q: "Tus derechos (RGPD / LPD)",
        a: "Tienes derecho a acceder, rectificar, eliminar y portar tus datos. Para eliminar tu cuenta, usa la opción en Ajustes o contacta info@sagatrail.ch.",
      },
      {
        q: "Seguridad de datos",
        a: "Todos los datos se transmiten con cifrado (TLS 1.3). Nuestra infraestructura de servidores está en la UE y cumple la LPD suiza y el RGPD.",
      },
      {
        q: "Niños",
        a: "SagaTrail no está destinado a niños menores de 13 años. Para la franja de niños, se requiere confirmación de un padre o tutor legal.",
      },
    ],
    impressum: [
      {
        q: "Proveedor",
        a: "SagaTrail\nContacto: info@sagatrail.ch\nSitio web: sagatrail.ch",
      },
      {
        q: "Leyendas & Fuentes",
        a: "Las leyendas provienen del dominio público y de colecciones históricas suizas. Cada leyenda cita su fuente.",
      },
      {
        q: "Datos cartográficos",
        a: "Mapas: © contribuidores de OpenStreetMap (ODbL). Senderos: Waymarked Trails. Datos topográficos: © swisstopo. Enrutamiento: FOSSGIS Valhalla.",
      },
      {
        q: "Voces de narración IA",
        a: "Los textos son narrados por voces de IA (ElevenLabs, OpenAI). Todos los contenidos son editados y curados por humanos.",
      },
      {
        q: "Emergencia",
        a: "SagaTrail no sustituye ninguna app oficial de rescate de montaña. En caso de emergencia: Rega 1414 o número europeo 112.",
      },
      {
        q: "Aviso",
        a: "SagaTrail no se hace responsable de la exactitud de los datos de rutas o condiciones meteorológicas. Las caminatas se realizan bajo tu propia responsabilidad.",
      },
    ],
  },
  pt: {
    eyebrow: "Jurídico & Dados",
    datenschutzTitle: "Privacidade",
    impressumTitle: "Aviso Legal",
    datenschutz: [
      {
        q: "Responsável pelo tratamento",
        a: "SagaTrail é responsável pelo tratamento dos seus dados pessoais. Contacto: info@sagatrail.ch",
      },
      {
        q: "Que dados tratamos",
        a: "Dados de localização (apenas durante uma caminhada ativa), perfil (nome, arquétipo, cantão, idioma, faixa etária), progresso e conteúdos desbloqueados, identificadores de dispositivo para notificações, metadados de pagamento anonimizados via App Store.",
      },
      {
        q: "Autenticação (Clerk)",
        a: "Usamos o Clerk (clerk.com) para o início de sessão. O Clerk armazena de forma segura o seu e-mail e tokens OAuth. Mais informações: clerk.com/privacy",
      },
      {
        q: "Pagamentos & assinaturas (RevenueCat)",
        a: "As assinaturas são processadas pela App Store. RevenueCat (revenuecat.com) gere o estado das assinaturas. Nenhum dado de cartão bancário é partilhado com a SagaTrail.",
      },
      {
        q: "Dados de localização",
        a: "A localização só é recolhida durante uma caminhada ativa, para ativar os momentos narrativos. Os dados não são armazenados permanentemente nos servidores. Pode revogar a permissão a qualquer momento nas definições do dispositivo.",
      },
      {
        q: "Os seus direitos (RGPD / LPD)",
        a: "Tem direito de acesso, retificação, eliminação e portabilidade dos seus dados. Para eliminar a sua conta, use a opção em Definições ou contacte info@sagatrail.ch.",
      },
      {
        q: "Segurança dos dados",
        a: "Todos os dados são transmitidos com encriptação (TLS 1.3). A nossa infraestrutura de servidores está na UE e cumpre a LPD suíça e o RGPD.",
      },
      {
        q: "Crianças",
        a: "SagaTrail não é destinado a crianças com menos de 13 anos. Para a faixa etária de crianças, é necessária a confirmação de um pai ou tutor legal.",
      },
    ],
    impressum: [
      {
        q: "Fornecedor",
        a: "SagaTrail\nContacto: info@sagatrail.ch\nSite: sagatrail.ch",
      },
      {
        q: "Lendas & Fontes",
        a: "As lendas provêm do domínio público e de coleções históricas suíças. Cada lenda cita a sua fonte.",
      },
      {
        q: "Dados cartográficos",
        a: "Mapas: © colaboradores do OpenStreetMap (ODbL). Trilhos: Waymarked Trails. Dados topográficos: © swisstopo. Encaminhamento: FOSSGIS Valhalla.",
      },
      {
        q: "Vozes de narração IA",
        a: "Os textos são narrados por vozes de IA (ElevenLabs, OpenAI). Todos os conteúdos são editados e curados por humanos.",
      },
      {
        q: "Emergência",
        a: "SagaTrail não substitui nenhuma app oficial de resgate em montanha. Em caso de emergência: Rega 1414 ou número europeu 112.",
      },
      {
        q: "Aviso",
        a: "SagaTrail não assume qualquer responsabilidade pela exatidão dos dados de percurso ou condições meteorológicas. As caminhadas são realizadas sob sua própria responsabilidade.",
      },
    ],
  },
  zh: {
    eyebrow: "法律与数据",
    datenschutzTitle: "隐私政策",
    impressumTitle: "法律声明",
    datenschutz: [
      {
        q: "数据控制者",
        a: "SagaTrail 负责处理您的个人数据。联系方式：info@sagatrail.ch",
      },
      {
        q: "我们处理哪些数据",
        a: "位置数据（仅在活跃徒步期间）、个人资料（姓名、原型、家乡州、语言、年龄段）、徒步进度与解锁内容、设备标识符（用于推送通知）以及通过 App Store 匿名化的支付元数据。",
      },
      {
        q: "身份验证 (Clerk)",
        a: "我们使用 Clerk (clerk.com) 进行登录。Clerk 安全存储您的电子邮件和 OAuth 令牌。了解更多：clerk.com/privacy",
      },
      {
        q: "支付与订阅 (RevenueCat)",
        a: "订阅通过 App Store 处理。RevenueCat (revenuecat.com) 管理订阅状态。SagaTrail 不会收到任何银行卡数据。",
      },
      {
        q: "位置数据",
        a: "位置数据仅在活跃徒步期间收集，用于在正确的路点触发故事时刻。数据不会永久存储在服务器上。您可以随时在设备设置中撤销此权限。",
      },
      {
        q: "您的权利 (GDPR / nFADP)",
        a: "您有权访问、更正、删除和转移您的数据。要删除账号，请使用「设置」中的选项或联系 info@sagatrail.ch。",
      },
      {
        q: "数据安全",
        a: "所有数据均通过加密传输 (TLS 1.3)。我们的服务器基础设施位于欧盟，符合瑞士 DSG 和 GDPR。",
      },
      {
        q: "儿童",
        a: "SagaTrail 不适用于 13 岁以下儿童。对于儿童年龄段，需要父母或法定监护人的确认。",
      },
    ],
    impressum: [
      {
        q: "提供者",
        a: "SagaTrail\n联系方式：info@sagatrail.ch\n网站：sagatrail.ch",
      },
      {
        q: "传说与来源",
        a: "讲述的故事来自公共领域的瑞士民间传说与历史传说集。每个故事均注明来源。",
      },
      {
        q: "地图数据",
        a: "地图：© OpenStreetMap 贡献者 (ODbL)。徒步路线：Waymarked Trails。地形数据：© swisstopo。路线规划：FOSSGIS Valhalla。",
      },
      {
        q: "AI 叙述语音",
        a: "故事文本由 AI 语音朗读（ElevenLabs、OpenAI）。所有内容均经过人工编辑和策划。",
      },
      {
        q: "紧急情况",
        a: "SagaTrail 不能替代任何官方山地救援或紧急应用。紧急情况下：Rega 1414 或欧洲紧急电话 112。",
      },
      {
        q: "免责声明",
        a: "SagaTrail 对路线数据或天气状况的准确性不承担任何责任。徒步活动由您自行负责。",
      },
    ],
  },
  ru: {
    eyebrow: "Право и данные",
    datenschutzTitle: "Конфиденциальность",
    impressumTitle: "Выходные данные",
    datenschutz: [
      {
        q: "Контролёр данных",
        a: "SagaTrail отвечает за обработку твоих персональных данных. Контакт: info@sagatrail.ch",
      },
      {
        q: "Какие данные мы обрабатываем",
        a: "Данные о местоположении (только во время активного похода), профиль (имя, архетип, родной кантон, язык, возрастная группа), прогресс и разблокированный контент, идентификаторы устройства для уведомлений, анонимизированные данные о платежах через App Store.",
      },
      {
        q: "Аутентификация (Clerk)",
        a: "Для входа используется Clerk (clerk.com). Clerk надёжно хранит твой адрес электронной почты и OAuth-токены. Подробнее: clerk.com/privacy",
      },
      {
        q: "Платежи и подписки (RevenueCat)",
        a: "Подписки обрабатываются через App Store. RevenueCat (revenuecat.com) управляет статусом подписок. Данные банковских карт не передаются SagaTrail.",
      },
      {
        q: "Данные о местоположении",
        a: "Местоположение собирается только во время активного похода для запуска сюжетных моментов. Данные не хранятся постоянно на серверах. Разрешение можно отозвать в любое время в настройках устройства.",
      },
      {
        q: "Твои права (GDPR / nFADP)",
        a: "Ты имеешь право на доступ, исправление, удаление и перенос своих данных. Для удаления аккаунта используй опцию в Настройках или напиши на info@sagatrail.ch.",
      },
      {
        q: "Безопасность данных",
        a: "Все данные передаются с шифрованием (TLS 1.3). Серверная инфраструктура находится в ЕС и соответствует швейцарскому DSG и GDPR.",
      },
      {
        q: "Дети",
        a: "SagaTrail не предназначен для детей до 13 лет. Для возрастной группы «Дети» требуется подтверждение от родителя или законного опекуна.",
      },
    ],
    impressum: [
      {
        q: "Поставщик",
        a: "SagaTrail\nКонтакт: info@sagatrail.ch\nСайт: sagatrail.ch",
      },
      {
        q: "Легенды и источники",
        a: "Рассказанные легенды основаны на общественном достоянии и исторических сборниках швейцарских легенд. Каждая легенда содержит ссылку на источник.",
      },
      {
        q: "Картографические данные",
        a: "Карты: © участники OpenStreetMap (ODbL). Маршруты: Waymarked Trails. Топографические данные: © swisstopo. Маршрутизация: FOSSGIS Valhalla.",
      },
      {
        q: "Голоса ИИ-нарратора",
        a: "Тексты озвучиваются голосами ИИ (ElevenLabs, OpenAI). Весь контент редактируется и курируется людьми.",
      },
      {
        q: "Экстренная помощь",
        a: "SagaTrail не заменяет официальное приложение горноспасательной службы. В экстренной ситуации: Rega 1414 или европейский номер 112.",
      },
      {
        q: "Отказ от ответственности",
        a: "SagaTrail не несёт ответственности за точность данных маршрутов или погодных условий. Походы совершаются на твоей собственной ответственности.",
      },
    ],
  },
};

export const useLegalStrings = createUseStrings(LEGAL_STRINGS);
