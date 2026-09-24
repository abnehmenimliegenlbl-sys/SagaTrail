import { createUseStrings, StringsDict } from "./createStrings";

export interface ComponentStrings {
  backToApp: string;
  backToOverview: string;
  fullscreenMap: string;
  closeFullscreen: string;
  details: string;
  arCamera: string;
  terrainProfileLoading: string;
  mapLoading: string;
  satelliteLoading: string;
  terrain3dTitle: string;
  terrain3dUnavailable: string;
  timeline: string;
  pause: string;
  play: string;
  speed: (value: number) => string;
}

const STRINGS: StringsDict<ComponentStrings> = {
  de: { backToApp: "Zurück zur App", backToOverview: "Zurück zur Übersicht", fullscreenMap: "Karte im Vollbild anzeigen", closeFullscreen: "Vollbild schliessen", details: "Details", arCamera: "AR-Kamera öffnen", terrainProfileLoading: "Höhenprofil wird geladen", mapLoading: "Karte wird geladen", satelliteLoading: "Satellitenbild wird geladen", terrain3dTitle: "3D-Gelände", terrain3dUnavailable: "Die 3D-Geländeansicht ist auf diesem Gerät ohne native Grafikunterstützung nicht verfügbar.", timeline: "Position in der 3D-Zeitleiste", pause: "Pause", play: "Abspielen", speed: (value) => `Tempo ${value}x` },
  gsw: { backToApp: "Zrugg zur App", backToOverview: "Zrugg zur Übersicht", fullscreenMap: "Charte im Vollbild zeige", closeFullscreen: "Vollbild zumache", details: "Details", arCamera: "AR-Kamera öffne", terrainProfileLoading: "Höchi-Profil wird glade", mapLoading: "Charte wird glade", satelliteLoading: "Satellittebild wird glade", terrain3dTitle: "3D-Gelände", terrain3dUnavailable: "D 3D-Geländeansicht isch uf däm Grät ohni nativi Grafikunterstützig nöd verfüegbar.", timeline: "Position i dr 3D-Ziitleiste", pause: "Pause", play: "Abspiele", speed: (value) => `Tempo ${value}x` },
  en: { backToApp: "Back to app", backToOverview: "Back to overview", fullscreenMap: "Show map full screen", closeFullscreen: "Close full screen", details: "Details", arCamera: "Open AR camera", terrainProfileLoading: "Loading elevation profile", mapLoading: "Loading map", satelliteLoading: "Loading satellite image", terrain3dTitle: "3D terrain", terrain3dUnavailable: "The 3D terrain view is not available on this device without native graphics support.", timeline: "Position in the 3D timeline", pause: "Pause", play: "Play", speed: (value) => `Speed ${value}x` },
  fr: { backToApp: "Retour à l’application", backToOverview: "Retour à l’aperçu", fullscreenMap: "Afficher la carte en plein écran", closeFullscreen: "Fermer le plein écran", details: "Détails", arCamera: "Ouvrir la caméra AR", terrainProfileLoading: "Chargement du profil d’altitude", mapLoading: "Chargement de la carte", satelliteLoading: "Chargement de l’image satellite", terrain3dTitle: "Terrain 3D", terrain3dUnavailable: "La vue du terrain 3D n’est pas disponible sur cet appareil sans prise en charge graphique native.", timeline: "Position dans la chronologie 3D", pause: "Pause", play: "Lire", speed: (value) => `Vitesse ${value}x` },
  it: { backToApp: "Torna all’app", backToOverview: "Torna alla panoramica", fullscreenMap: "Mostra la mappa a schermo intero", closeFullscreen: "Chiudi schermo intero", details: "Dettagli", arCamera: "Apri fotocamera AR", terrainProfileLoading: "Caricamento del profilo altimetrico", mapLoading: "Caricamento della mappa", satelliteLoading: "Caricamento dell’immagine satellitare", terrain3dTitle: "Terreno 3D", terrain3dUnavailable: "La vista del terreno 3D non è disponibile su questo dispositivo senza supporto grafico nativo.", timeline: "Posizione nella timeline 3D", pause: "Pausa", play: "Riproduci", speed: (value) => `Velocità ${value}x` },
  es: { backToApp: "Volver a la app", backToOverview: "Volver a la vista general", fullscreenMap: "Mostrar mapa en pantalla completa", closeFullscreen: "Cerrar pantalla completa", details: "Detalles", arCamera: "Abrir cámara AR", terrainProfileLoading: "Cargando perfil de elevación", mapLoading: "Cargando mapa", satelliteLoading: "Cargando imagen satelital", terrain3dTitle: "Terreno 3D", terrain3dUnavailable: "La vista del terreno 3D no está disponible en este dispositivo sin compatibilidad gráfica nativa.", timeline: "Posición en la línea de tiempo 3D", pause: "Pausa", play: "Reproducir", speed: (value) => `Velocidad ${value}x` },
  pt: { backToApp: "Voltar à aplicação", backToOverview: "Voltar à vista geral", fullscreenMap: "Mostrar mapa em ecrã inteiro", closeFullscreen: "Fechar ecrã inteiro", details: "Detalhes", arCamera: "Abrir câmara AR", terrainProfileLoading: "A carregar perfil de elevação", mapLoading: "A carregar mapa", satelliteLoading: "A carregar imagem de satélite", terrain3dTitle: "Terreno 3D", terrain3dUnavailable: "A vista do terreno 3D não está disponível neste dispositivo sem suporte gráfico nativo.", timeline: "Posição na linha temporal 3D", pause: "Pausa", play: "Reproduzir", speed: (value) => `Velocidade ${value}x` },
  zh: { backToApp: "返回应用", backToOverview: "返回概览", fullscreenMap: "全屏显示地图", closeFullscreen: "关闭全屏", details: "详情", arCamera: "打开 AR 相机", terrainProfileLoading: "正在加载海拔剖面", mapLoading: "正在加载地图", satelliteLoading: "正在加载卫星图像", terrain3dTitle: "三维地形", terrain3dUnavailable: "此设备不支持原生图形，无法使用三维地形视图。", timeline: "三维时间轴位置", pause: "暂停", play: "播放", speed: (value) => `速度 ${value}x` },
  ru: { backToApp: "Назад в приложение", backToOverview: "Назад к обзору", fullscreenMap: "Открыть карту на весь экран", closeFullscreen: "Закрыть полноэкранный режим", details: "Подробнее", arCamera: "Открыть AR-камеру", terrainProfileLoading: "Загрузка профиля высот", mapLoading: "Загрузка карты", satelliteLoading: "Загрузка спутникового снимка", terrain3dTitle: "3D-рельеф", terrain3dUnavailable: "3D-рельеф недоступен на этом устройстве без поддержки нативной графики.", timeline: "Позиция на 3D-шкале времени", pause: "Пауза", play: "Воспроизвести", speed: (value) => `Скорость ${value}x` },
};

export const useComponentStrings = createUseStrings(STRINGS);