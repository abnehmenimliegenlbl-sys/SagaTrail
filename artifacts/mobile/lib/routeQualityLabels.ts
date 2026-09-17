type QualityLanguage = "de" | "gsw" | "en" | "fr" | "it" | "es" | "pt" | "zh";

const LABELS: Record<QualityLanguage, {
  title: string;
  checkedAt: (date: string) => string;
  source: string;
  unverified: string;
  verified: string;
  partial: string;
  invalid: string;
}> = {
  de: {
    title: "Datenstand & Quellen",
    checkedAt: (date) => `Zuletzt geprüft am ${date}`,
    source: "Quelle öffnen",
    unverified: "Noch nicht geprüft",
    verified: "Geprüfte Routendaten",
    partial: "Teilweise geprüft – einzelne Quellen fehlen",
    invalid: "Prüfung auffällig – Angaben bitte gegen die Quelle prüfen",
  },
  gsw: {
    title: "Date-Stand & Quelle",
    checkedAt: (date) => `Zuletzt prüeft am ${date}`,
    source: "Quelle ufmache",
    unverified: "No nöd prüeft",
    verified: "Prüefti Route-Date",
    partial: "Teilwiis prüeft – einzelni Quelle fählt",
    invalid: "Prüefig uuffällig – bitte mit de Quelle vergliiche",
  },
  en: {
    title: "Data status & sources",
    checkedAt: (date) => `Last checked ${date}`,
    source: "Open source",
    unverified: "Not checked yet",
    verified: "Route data checked",
    partial: "Partially checked – some sources are missing",
    invalid: "Check flagged – verify details against the source",
  },
  fr: {
    title: "État des données et sources",
    checkedAt: (date) => `Dernière vérification : ${date}`,
    source: "Ouvrir la source",
    unverified: "Pas encore vérifié",
    verified: "Données vérifiées",
    partial: "Vérification partielle – certaines sources manquent",
    invalid: "Vérification à contrôler – consulter la source",
  },
  it: {
    title: "Stato dei dati e fonti",
    checkedAt: (date) => `Verificato il ${date}`,
    source: "Apri fonte",
    unverified: "Non ancora verificato",
    verified: "Dati verificati",
    partial: "Verifica parziale – mancano alcune fonti",
    invalid: "Verifica da controllare – confronta la fonte",
  },
  es: {
    title: "Estado de datos y fuentes",
    checkedAt: (date) => `Última comprobación: ${date}`,
    source: "Abrir fuente",
    unverified: "Aún no comprobado",
    verified: "Datos comprobados",
    partial: "Comprobación parcial – faltan algunas fuentes",
    invalid: "Comprobación con aviso – revisa la fuente",
  },
  pt: {
    title: "Estado dos dados e fontes",
    checkedAt: (date) => `Verificado em ${date}`,
    source: "Abrir fonte",
    unverified: "Ainda não verificado",
    verified: "Dados verificados",
    partial: "Verificação parcial – faltam algumas fontes",
    invalid: "Verificação com aviso – consulte a fonte",
  },
  zh: {
    title: "数据状态与来源",
    checkedAt: (date) => `最近检查：${date}`,
    source: "打开来源",
    unverified: "尚未检查",
    verified: "路线数据已检查",
    partial: "部分检查——缺少一些来源",
    invalid: "检查有提示——请对照来源核实",
  },
};

export function routeQualityLabels(language: string) {
  return LABELS[language as QualityLanguage] ?? LABELS.de;
}

export function formatQualityDate(value: Date | string | null | undefined, language: string): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const locale =
    language === "gsw" ? "de-CH" :
    language === "zh" ? "zh-CN" :
    language || "de-CH";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}