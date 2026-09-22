import { createUseStrings, StringsDict } from "../createStrings";

export interface MeetupPhotoStrings {
  eyebrow: string;
  title: string;
  intro: string;
  notFound: string;
  addTitle: string;
  rightsConsent: string;
  peopleConsent: string;
  nameConsent: string;
  uploadButton: string;
  consentRequiredTitle: string;
  consentRequiredBody: string;
  uploadTitle: string;
  uploadFailure: string;
  loadFailure: string;
  nameTitle: string;
  nameFailure: string;
  deleteFailure: string;
  facebookTitle: string;
  facebookBody: string;
  captionPlaceholder: string;
  preparePost: (count: number) => string;
  facebookHint: string;
  photoCount: (count: number) => string;
  noPhotos: string;
  empty: string;
  shareSagaTitle: string;
  shareScale: string;
  distanceLabel: string;
  ascentLabel: string;
  timeLabel: string;
  stepsLabel: string;
  shareDialogTitle: string;
  shareReadyTitle: string;
  shareReadyBody: string;
  openFacebook: string;
  shareFailure: string;
  sharePrepareFailure: string;
  sharedCaption: string;
  participantsLabel: string;
}

const STRINGS: StringsDict<MeetupPhotoStrings> = {
  de: {
    eyebrow: "GEMEINSAM ERLEBT", title: "Wanderungsfotos", intro: "Teile Erinnerungen mit der Gruppe. SagaTrail schützt die Bilder und bereitet den Beitrag für Facebook vor.",
    notFound: "Wanderung nicht gefunden.", addTitle: "Bilder hinzufügen",
    rightsConsent: "Ich habe die Rechte an diesen Bildern oder darf sie hochladen.",
    peopleConsent: "Erkennbare Personen haben dem Teilen zugestimmt.",
    nameConsent: "Ich bin einverstanden, dass mein Name im Beitrag genannt wird.",
    uploadButton: "Bilder auswählen und hochladen", consentRequiredTitle: "Einwilligung erforderlich",
    consentRequiredBody: "Bestätige bitte beide Einwilligungen: die Rechte am Upload und die Zustimmung abgebildeter Personen.",
    uploadTitle: "Foto-Upload", uploadFailure: "Die Fotos konnten nicht hochgeladen werden.", loadFailure: "Die Fotos konnten nicht geladen werden.",
    nameTitle: "Namensnennung", nameFailure: "Die Namensfreigabe konnte nicht gespeichert werden.",
    deleteFailure: "Das Bild konnte nicht gelöscht werden.", facebookTitle: "Beitrag für die Facebook-Gruppe",
    facebookBody: "Wähle die schönsten Bilder. Die SagaTrail-Abschlusskachel bleibt immer enthalten und wird als Titelbild verwendet.",
    captionPlaceholder: "Begleittext für den Beitrag", preparePost: (count) => `Beitrag mit ${count} Bild${count === 1 ? "" : "ern"} vorbereiten`,
    facebookHint: "Echte Facebook-Tags setzt du nach dem Öffnen der Gruppe direkt in Facebook.",
    photoCount: (count) => `${count} Bild${count === 1 ? "" : "er"}`, noPhotos: "Noch keine Bilder",
    empty: "Nach dem Upload erscheinen die Bilder hier.", shareSagaTitle: "SagaTrail Wanderabschluss", shareScale: "Wanderung",
    distanceLabel: "DISTANZ", ascentLabel: "AUFSTIEG", timeLabel: "ZEIT", stepsLabel: "SCHRITTE",
    shareDialogTitle: "Für Facebook-Gruppe vorbereiten", shareReadyTitle: "Beitrag vorbereitet",
    shareReadyBody: "Bild und Begleittext sind bereit. Öffne jetzt die Facebook-Gruppe und erstelle dort den Beitrag.",
    openFacebook: "Facebook-Gruppe öffnen", shareFailure: "Der Beitrag konnte nicht vorbereitet werden.",
    sharePrepareFailure: "Der Beitrag konnte nicht vorbereitet werden.", sharedCaption: "Eine gemeinsame Wanderung mit SagaTrail.", participantsLabel: "Dabei",
  },
  gsw: {
    eyebrow: "ZÄME ERLÄBT", title: "Wanderigsfotos", intro: "Teil dini Erinnerige mit de Gruppe. SagaTrail schützt d Bilder und bereitet de Facebook-Biitrag vor.",
    notFound: "Wanderig nöd gfunde.", addTitle: "Bilder hinzuefüege",
    rightsConsent: "Ich ha d Rächt a dene Bilder oder darf sie ufelade.", peopleConsent: "Erkennbari Persone sind mit em Teile iiverstande.",
    nameConsent: "Ich bi iiverstande, dass min Name im Biitrag erwähnt wird.", uploadButton: "Bilder ussueche und ufelade",
    consentRequiredTitle: "Iiverständnis nötig", consentRequiredBody: "Bestätig bitte beidi Iiverständnis: d Rächt am Upload und d Zuestimmig vo abgebildete Persone.",
    uploadTitle: "Foto-Upload", uploadFailure: "D Fotos het nöd chönne ufelade werde.", loadFailure: "D Fotos het nöd chönne glade werde.",
    nameTitle: "Namensnännig", nameFailure: "D Freigab vom Name het nöd chönne gspeicheret werde.", deleteFailure: "S Bild het nöd chönne glöscht werde.",
    facebookTitle: "Biitrag für d Facebook-Gruppe", facebookBody: "Wähl d schönschte Bilder. D SagaTrail-Abschlusskärtli bliibt immer debii und wird s Titelbild.",
    captionPlaceholder: "Begleittext für de Biitrag", preparePost: (count) => `Biitrag mit ${count} Bild${count === 1 ? "" : "er"} vorbereite`,
    facebookHint: "Echti Facebook-Tags setzisch nach em Öffne vo de Gruppe direkt i Facebook.",
    photoCount: (count) => `${count} Bild${count === 1 ? "" : "er"}`, noPhotos: "No kei Bilder",
    empty: "Nach em Ufelade erscheined d Bilder da.", shareSagaTitle: "SagaTrail Wanderigsabschluss", shareScale: "Wanderig",
    distanceLabel: "DISTANZ", ascentLabel: "UFSTIEG", timeLabel: "ZIT", stepsLabel: "SCHRITT",
    shareDialogTitle: "Für d Facebook-Gruppe vorbereite", shareReadyTitle: "Biitrag vorbereitet",
    shareReadyBody: "Bild und Begleittext sind parat. Öffne jetzt d Facebook-Gruppe und erstell det de Biitrag.",
    openFacebook: "Facebook-Gruppe öffne", shareFailure: "De Biitrag het nöd chönne vorbereitet werde.",
    sharePrepareFailure: "De Biitrag het nöd chönne vorbereitet werde.", sharedCaption: "E gemeinsami Wanderig mit SagaTrail.", participantsLabel: "Debii",
  },
  fr: {
    eyebrow: "SOUVENIRS PARTAGÉS", title: "Photos de randonnée", intro: "Partagez vos souvenirs avec le groupe. SagaTrail protège les images et prépare la publication Facebook.",
    notFound: "Randonnée introuvable.", addTitle: "Ajouter des images", rightsConsent: "J’ai les droits sur ces images ou l’autorisation de les téléverser.",
    peopleConsent: "Les personnes reconnaissables ont accepté le partage.", nameConsent: "J’accepte que mon nom soit mentionné dans la publication.",
    uploadButton: "Choisir et téléverser des images", consentRequiredTitle: "Consentement requis",
    consentRequiredBody: "Confirmez les deux consentements : les droits sur l’envoi et l’accord des personnes représentées.",
    uploadTitle: "Téléversement de photos", uploadFailure: "Impossible de téléverser les photos.", loadFailure: "Impossible de charger les photos.",
    nameTitle: "Mention du nom", nameFailure: "Impossible d’enregistrer l’autorisation du nom.", deleteFailure: "Impossible de supprimer l’image.",
    facebookTitle: "Publication pour le groupe Facebook", facebookBody: "Choisissez les meilleures images. La carte de fin SagaTrail est toujours incluse comme image de couverture.",
    captionPlaceholder: "Texte d’accompagnement", preparePost: (count) => `Préparer une publication avec ${count} image${count === 1 ? "" : "s"}`,
    facebookHint: "Ajoutez les vrais tags Facebook directement dans Facebook après l’ouverture du groupe.",
    photoCount: (count) => `${count} image${count === 1 ? "" : "s"}`, noPhotos: "Aucune image pour l’instant",
    empty: "Les images apparaîtront ici après l’envoi.", shareSagaTitle: "Fin de randonnée SagaTrail", shareScale: "Randonnée",
    distanceLabel: "DISTANCE", ascentLabel: "DÉNIVELÉ", timeLabel: "DURÉE", stepsLabel: "PAS",
    shareDialogTitle: "Préparer pour le groupe Facebook", shareReadyTitle: "Publication préparée",
    shareReadyBody: "L’image et le texte sont prêts. Ouvrez maintenant le groupe Facebook pour créer la publication.",
    openFacebook: "Ouvrir le groupe Facebook", shareFailure: "Impossible de préparer la publication.",
    sharePrepareFailure: "Impossible de préparer la publication.", sharedCaption: "Une randonnée partagée avec SagaTrail.", participantsLabel: "Avec",
  },
  it: {
    eyebrow: "RICORDI CONDIVISI", title: "Foto dell’escursione", intro: "Condividi i ricordi con il gruppo. SagaTrail protegge le immagini e prepara il post per Facebook.",
    notFound: "Escursione non trovata.", addTitle: "Aggiungi immagini", rightsConsent: "Ho i diritti su queste immagini o il permesso di caricarle.",
    peopleConsent: "Le persone riconoscibili hanno accettato la condivisione.", nameConsent: "Accetto che il mio nome venga menzionato nel post.",
    uploadButton: "Scegli e carica immagini", consentRequiredTitle: "Consenso richiesto",
    consentRequiredBody: "Conferma entrambi i consensi: i diritti sul caricamento e l’accordo delle persone ritratte.",
    uploadTitle: "Caricamento foto", uploadFailure: "Impossibile caricare le foto.", loadFailure: "Impossibile caricare le foto.",
    nameTitle: "Menzione del nome", nameFailure: "Impossibile salvare il consenso al nome.", deleteFailure: "Impossibile eliminare l’immagine.",
    facebookTitle: "Post per il gruppo Facebook", facebookBody: "Scegli le immagini migliori. La scheda finale SagaTrail è sempre inclusa come immagine di copertina.",
    captionPlaceholder: "Testo del post", preparePost: (count) => `Prepara post con ${count} immagin${count === 1 ? "e" : "i"}`,
    facebookHint: "Aggiungi i tag Facebook direttamente su Facebook dopo aver aperto il gruppo.",
    photoCount: (count) => `${count} immagin${count === 1 ? "e" : "i"}`, noPhotos: "Ancora nessuna immagine",
    empty: "Le immagini appariranno qui dopo il caricamento.", shareSagaTitle: "Fine escursione SagaTrail", shareScale: "Escursione",
    distanceLabel: "DISTANZA", ascentLabel: "DISLIVELLO", timeLabel: "TEMPO", stepsLabel: "PASSI",
    shareDialogTitle: "Prepara per il gruppo Facebook", shareReadyTitle: "Post preparato",
    shareReadyBody: "Immagine e testo sono pronti. Apri ora il gruppo Facebook e crea il post.",
    openFacebook: "Apri il gruppo Facebook", shareFailure: "Impossibile preparare il post.",
    sharePrepareFailure: "Impossibile preparare il post.", sharedCaption: "Un’escursione condivisa con SagaTrail.", participantsLabel: "Partecipanti",
  },
  en: {
    eyebrow: "SHARED MEMORIES", title: "Hike photos", intro: "Share memories with the group. SagaTrail protects the images and prepares the Facebook post.",
    notFound: "Hike not found.", addTitle: "Add images", rightsConsent: "I own these images or have permission to upload them.",
    peopleConsent: "Recognizable people have agreed to the sharing.", nameConsent: "I agree that my name may be mentioned in the post.",
    uploadButton: "Choose and upload images", consentRequiredTitle: "Consent required",
    consentRequiredBody: "Confirm both consents: the rights to upload and the agreement of people shown in the images.",
    uploadTitle: "Photo upload", uploadFailure: "The photos could not be uploaded.", loadFailure: "The photos could not be loaded.",
    nameTitle: "Name mention", nameFailure: "The name permission could not be saved.", deleteFailure: "The image could not be deleted.",
    facebookTitle: "Facebook group post", facebookBody: "Choose the best images. The SagaTrail finish card is always included as the cover image.",
    captionPlaceholder: "Post caption", preparePost: (count) => `Prepare post with ${count} image${count === 1 ? "" : "s"}`,
    facebookHint: "Add real Facebook tags directly in Facebook after opening the group.",
    photoCount: (count) => `${count} image${count === 1 ? "" : "s"}`, noPhotos: "No images yet",
    empty: "Images will appear here after upload.", shareSagaTitle: "SagaTrail hike finish", shareScale: "Hike",
    distanceLabel: "DISTANCE", ascentLabel: "ASCENT", timeLabel: "TIME", stepsLabel: "STEPS",
    shareDialogTitle: "Prepare for Facebook group", shareReadyTitle: "Post prepared",
    shareReadyBody: "The image and caption are ready. Open the Facebook group now to create the post.",
    openFacebook: "Open Facebook group", shareFailure: "The post could not be prepared.",
    sharePrepareFailure: "The post could not be prepared.", sharedCaption: "A shared hike with SagaTrail.", participantsLabel: "With",
  },
  zh: {
    eyebrow: "共同回忆", title: "徒步照片", intro: "与团队分享回忆。SagaTrail 会保护图片，并准备 Facebook 帖子。",
    notFound: "找不到徒步记录。", addTitle: "添加图片", rightsConsent: "我拥有这些图片的权利，或获准上传它们。",
    peopleConsent: "可识别的人员已同意分享。", nameConsent: "我同意在帖子中提及我的姓名。",
    uploadButton: "选择并上传图片", consentRequiredTitle: "需要同意",
    consentRequiredBody: "请确认两项同意：上传权利，以及图片中人物同意分享。",
    uploadTitle: "上传照片", uploadFailure: "无法上传照片。", loadFailure: "无法加载照片。",
    nameTitle: "姓名提及", nameFailure: "无法保存姓名授权。", deleteFailure: "无法删除图片。",
    facebookTitle: "Facebook 群组帖子", facebookBody: "选择最好的图片。SagaTrail 结束卡片始终会作为封面图片加入。",
    captionPlaceholder: "帖子文字", preparePost: (count) => `准备包含 ${count} 张图片的帖子`,
    facebookHint: "打开群组后，请直接在 Facebook 中添加真正的标签。",
    photoCount: (count) => `${count} 张图片`, noPhotos: "还没有图片",
    empty: "上传后图片会显示在这里。", shareSagaTitle: "SagaTrail 徒步结束", shareScale: "徒步",
    distanceLabel: "距离", ascentLabel: "爬升", timeLabel: "时间", stepsLabel: "步数",
    shareDialogTitle: "准备发布到 Facebook 群组", shareReadyTitle: "帖子已准备好",
    shareReadyBody: "图片和文字已准备好。现在打开 Facebook 群组创建帖子。",
    openFacebook: "打开 Facebook 群组", shareFailure: "无法准备帖子。",
    sharePrepareFailure: "无法准备帖子。", sharedCaption: "与 SagaTrail 一起的徒步。", participantsLabel: "参与者",
  },
  es: {
    eyebrow: "RECUERDOS COMPARTIDOS", title: "Fotos de la caminata", intro: "Comparte recuerdos con el grupo. SagaTrail protege las imágenes y prepara la publicación de Facebook.",
    notFound: "No se ha encontrado la caminata.", addTitle: "Añadir imágenes", rightsConsent: "Tengo los derechos de estas imágenes o permiso para subirlas.",
    peopleConsent: "Las personas reconocibles han aceptado que se compartan.", nameConsent: "Acepto que se mencione mi nombre en la publicación.",
    uploadButton: "Elegir y subir imágenes", consentRequiredTitle: "Se necesita consentimiento",
    consentRequiredBody: "Confirma ambos consentimientos: los derechos para subirlas y el acuerdo de las personas que aparecen.",
    uploadTitle: "Subida de fotos", uploadFailure: "No se han podido subir las fotos.", loadFailure: "No se han podido cargar las fotos.",
    nameTitle: "Mención del nombre", nameFailure: "No se ha podido guardar el permiso del nombre.", deleteFailure: "No se ha podido eliminar la imagen.",
    facebookTitle: "Publicación para el grupo de Facebook", facebookBody: "Elige las mejores imágenes. La tarjeta final de SagaTrail siempre se incluye como portada.",
    captionPlaceholder: "Texto de la publicación", preparePost: (count) => `Preparar publicación con ${count} imagen${count === 1 ? "" : "es"}`,
    facebookHint: "Añade las etiquetas reales directamente en Facebook después de abrir el grupo.",
    photoCount: (count) => `${count} imagen${count === 1 ? "" : "es"}`, noPhotos: "Todavía no hay imágenes",
    empty: "Las imágenes aparecerán aquí después de subirlas.", shareSagaTitle: "Final de caminata SagaTrail", shareScale: "Caminata",
    distanceLabel: "DISTANCIA", ascentLabel: "DESNIVEL", timeLabel: "TIEMPO", stepsLabel: "PASOS",
    shareDialogTitle: "Preparar para el grupo de Facebook", shareReadyTitle: "Publicación preparada",
    shareReadyBody: "La imagen y el texto están listos. Abre ahora el grupo de Facebook para crear la publicación.",
    openFacebook: "Abrir grupo de Facebook", shareFailure: "No se ha podido preparar la publicación.",
    sharePrepareFailure: "No se ha podido preparar la publicación.", sharedCaption: "Una caminata compartida con SagaTrail.", participantsLabel: "Participantes",
  },
  pt: {
    eyebrow: "MEMÓRIAS PARTILHADAS", title: "Fotos da caminhada", intro: "Partilhe memórias com o grupo. O SagaTrail protege as imagens e prepara a publicação para o Facebook.",
    notFound: "Caminhada não encontrada.", addTitle: "Adicionar imagens", rightsConsent: "Tenho os direitos destas imagens ou autorização para as carregar.",
    peopleConsent: "As pessoas identificáveis aceitaram a partilha.", nameConsent: "Aceito que o meu nome seja mencionado na publicação.",
    uploadButton: "Escolher e carregar imagens", consentRequiredTitle: "É necessário consentimento",
    consentRequiredBody: "Confirme os dois consentimentos: os direitos de carregamento e a autorização das pessoas retratadas.",
    uploadTitle: "Carregamento de fotos", uploadFailure: "Não foi possível carregar as fotos.", loadFailure: "Não foi possível carregar as fotos.",
    nameTitle: "Menção do nome", nameFailure: "Não foi possível guardar a autorização do nome.", deleteFailure: "Não foi possível eliminar a imagem.",
    facebookTitle: "Publicação para o grupo do Facebook", facebookBody: "Escolha as melhores imagens. O cartão final do SagaTrail é sempre incluído como imagem de capa.",
    captionPlaceholder: "Texto da publicação", preparePost: (count) => `Preparar publicação com ${count} imagem${count === 1 ? "" : "ns"}`,
    facebookHint: "Adicione as etiquetas reais diretamente no Facebook depois de abrir o grupo.",
    photoCount: (count) => `${count} imagem${count === 1 ? "" : "ns"}`, noPhotos: "Ainda não há imagens",
    empty: "As imagens aparecerão aqui depois do carregamento.", shareSagaTitle: "Final da caminhada SagaTrail", shareScale: "Caminhada",
    distanceLabel: "DISTÂNCIA", ascentLabel: "DESNÍVEL", timeLabel: "TEMPO", stepsLabel: "PASSOS",
    shareDialogTitle: "Preparar para o grupo do Facebook", shareReadyTitle: "Publicação preparada",
    shareReadyBody: "A imagem e o texto estão prontos. Abra agora o grupo do Facebook para criar a publicação.",
    openFacebook: "Abrir grupo do Facebook", shareFailure: "Não foi possível preparar a publicação.",
    sharePrepareFailure: "Não foi possível preparar a publicação.", sharedCaption: "Uma caminhada partilhada com o SagaTrail.", participantsLabel: "Participantes",
  },
  ru: {
    eyebrow: "ОБЩИЕ ВОСПОМИНАНИЯ", title: "Фотографии похода", intro: "Делитесь воспоминаниями с группой. SagaTrail защищает изображения и готовит публикацию для Facebook.",
    notFound: "Поход не найден.", addTitle: "Добавить изображения", rightsConsent: "У меня есть права на эти изображения или разрешение на их загрузку.",
    peopleConsent: "Узнаваемые люди согласились на публикацию.", nameConsent: "Я согласен упомянуть моё имя в публикации.",
    uploadButton: "Выбрать и загрузить изображения", consentRequiredTitle: "Требуется согласие",
    consentRequiredBody: "Подтвердите оба согласия: права на загрузку и согласие людей на изображениях.",
    uploadTitle: "Загрузка фотографий", uploadFailure: "Не удалось загрузить фотографии.", loadFailure: "Не удалось загрузить фотографии.",
    nameTitle: "Упоминание имени", nameFailure: "Не удалось сохранить разрешение на имя.", deleteFailure: "Не удалось удалить изображение.",
    facebookTitle: "Публикация для группы Facebook", facebookBody: "Выберите лучшие изображения. Карточка завершения SagaTrail всегда добавляется как обложка.",
    captionPlaceholder: "Текст публикации", preparePost: (count) => `Подготовить публикацию с изображениями: ${count}`,
    facebookHint: "Настоящие отметки Facebook добавьте непосредственно в Facebook после открытия группы.",
    photoCount: (count) => `Изображений: ${count}`, noPhotos: "Изображений пока нет",
    empty: "После загрузки изображения появятся здесь.", shareSagaTitle: "Завершение похода SagaTrail", shareScale: "Поход",
    distanceLabel: "РАССТОЯНИЕ", ascentLabel: "НАБОР", timeLabel: "ВРЕМЯ", stepsLabel: "ШАГИ",
    shareDialogTitle: "Подготовить для группы Facebook", shareReadyTitle: "Публикация подготовлена",
    shareReadyBody: "Изображение и текст готовы. Откройте группу Facebook, чтобы создать публикацию.",
    openFacebook: "Открыть группу Facebook", shareFailure: "Не удалось подготовить публикацию.",
    sharePrepareFailure: "Не удалось подготовить публикацию.", sharedCaption: "Общий поход с SagaTrail.", participantsLabel: "Участники",
  },
};

export const useMeetupPhotoStrings = createUseStrings(STRINGS);