import { Feather } from "@expo/vector-icons";
import {
  useGetMeetups,
  type AvalancheBulletin,
  type Meetup,
  type TransportStationboard,
  type TrailConditionReport,
  type WeatherReport,
} from "@workspace/api-client-react";
import React, { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import type { LanguageCode } from "@/lib/i18n/languageCode";
import {
  evaluatePreStartSafety,
  type SafetyClosure,
  type SafetyReasonCode,
  type SafetyReasonSource,
} from "@/lib/preStartSafety";
export type { SafetyClosure } from "@/lib/preStartSafety";

interface SafetyCopy {
  title: string;
  live: string;
  decision: Record<"start" | "caution" | "postpone" | "blocked", string>;
  summary: Record<"start" | "caution" | "postpone" | "blocked", string>;
  weather: string;
  hazards: string;
  access: string;
  meetup: string;
  transport: string;
  clear: string;
  check: string;
  missing: string;
  loading: string;
  retry: string;
  thunderstorm: string;
  snowIce: string;
  difficultGround: string;
  avalancheHigh: string;
  avalancheModerate: string;
  closureHint: string;
  closureWarning: string;
  communityBlocked: string;
  communityDifficult: string;
  transportAvailable: (name: string) => string;
  transportUnknown: string;
  meetupAvailable: (date: string, count: string) => string;
  meetupFull: (date: string) => string;
  noMeetup: string;
  dataIncomplete: string;
  details: string;
  sourceWeather: string;
  sourceEaws: string;
  sourceCommunity: string;
  sourceOfficial: string;
}

const COPY: Record<LanguageCode, SafetyCopy> = {
  de: {
    title: "Vor dem Start",
    live: "Live geprüft",
    decision: { start: "Start ist plausibel", caution: "Mit Vorsicht starten", postpone: "Start verschieben", blocked: "Route gesperrt" },
    summary: {
      start: "Die verfügbaren Hinweise sprechen heute für einen Start. Prüfe die Details vor dem Losgehen trotzdem kurz.",
      caution: "Es gibt einen relevanten Hinweis. Starte nur mit passender Ausrüstung und prüfe die betroffene Stelle.",
      postpone: "Mindestens ein aktueller Hinweis spricht gegen einen sicheren Start. Warte ab oder wähle eine Alternative.",
      blocked: "Für diese Route liegt eine bestätigte Sperre vor. Starte nicht, bis sie aufgehoben ist.",
    },
    weather: "Wetter",
    hazards: "Gefahren & Weg",
    access: "Anreise & Treffpunkt",
    meetup: "Treffpunkt",
    transport: "ÖV",
    clear: "Keine kritischen Hinweise",
    check: "Bitte prüfen",
    missing: "Nicht verifiziert",
    loading: "Sicherheitsdaten werden geprüft …",
    retry: "Erneut prüfen",
    thunderstorm: "Gewitter am Ausgangspunkt",
    snowIce: "Schnee oder Eis möglich",
    difficultGround: "Erschwerte Wegbedingungen",
    avalancheHigh: "Hohe Lawinengefahr",
    avalancheModerate: "Erhöhte Lawinengefahr",
    closureHint: "Aktuelle Meldung im Kanton – Routenzuordnung prüfen",
    closureWarning: "Warnung oder Wegschaden gemeldet",
    communityBlocked: "Community meldet den Weg als blockiert",
    communityDifficult: "Frische Community-Hinweise zu Schnee, Eis oder Matsch",
    transportAvailable: (name) => `ÖV am Ziel: ${name}`,
    transportUnknown: "ÖV am Ziel nicht verifiziert",
    meetupAvailable: (date, count) => `Treffpunkt ${date} · ${count}`,
    meetupFull: (date) => `Treffpunkt ${date} · ausgebucht`,
    noMeetup: "Kein geplanter Treffpunkt",
    dataIncomplete: "Ein Teil der Live-Daten fehlt; das ist keine Freigabe.",
    details: "Details",
    sourceWeather: "Open-Meteo",
    sourceEaws: "EAWS / SLF",
    sourceCommunity: "Community",
    sourceOfficial: "Meldungsfeed",
  } as SafetyCopy,
  gsw: {
    title: "Vor em Start",
    live: "Live prüeft",
    decision: { start: "Start isch plausibel", caution: "Mit Vorsicht starte", postpone: "Start verschiebe", blocked: "Route gsperrt" },
    summary: {
      start: "D verfüegbare Hinwiis spreched hüt für en Start. Lueg d Details vor em Loslaufe trotzdem kurz aa.",
      caution: "Es git en wichtige Hinwiis. Starte nume mit passender Usrüstig und prüef d betroffeni Stell.",
      postpone: "Mindestens en aktuelle Hinwiis spricht gege en sichere Start. Wart ab oder nimm e Alternative.",
      blocked: "Für die Route git s e bestätigti Sperrig. Lauf nöd los, bis sie ufghebe isch.",
    },
    weather: "Wätter", hazards: "Gfahre & Wäg", access: "Aareis & Treffpunkt", meetup: "Treffpunkt", transport: "ÖV",
    clear: "Kei kritische Hinwiis", check: "Bitte prüefe", missing: "Nöd verifiziert", loading: "Sicherheitsdate werde prüeft …", retry: "Nomal prüefe",
    thunderstorm: "Gwitter am Start", snowIce: "Schnee oder Iis möglich", difficultGround: "Erschwerti Wägbedingige", avalancheHigh: "Hohe Lawinegfahr", avalancheModerate: "Erhöhti Lawinegfahr",
    closureHint: "Aktuelli Meldig im Kanton – Route-Zueordnig prüefe", closureWarning: "Warnig oder Wägschade gmeldet", communityBlocked: "Community meldet de Wäg als blockiert", communityDifficult: "Frischi Hinwiis zu Schnee, Iis oder Matsch",
    transportAvailable: (name) => `ÖV am Ziel: ${name}`, transportUnknown: "ÖV am Ziel nöd verifiziert", meetupAvailable: (date, count) => `Treffpunkt ${date} · ${count}`, meetupFull: (date) => `Treffpunkt ${date} · voll`, noMeetup: "Kei geplante Treffpunkt",
    dataIncomplete: "Es fählt en Teil vo de Live-Date; das isch kei Freigab.", details: "Details", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Community", sourceOfficial: "Meldigfeed",
  },
  fr: {
    title: "Avant le départ", live: "Vérifié en direct",
    decision: { start: "Départ plausible", caution: "Départ avec prudence", postpone: "Reporter le départ", blocked: "Itinéraire fermé" },
    summary: { start: "Les indications disponibles permettent un départ aujourd’hui. Vérifiez tout de même les détails.", caution: "Un signal important a été trouvé. Partez avec l’équipement adapté et contrôlez le passage.", postpone: "Un signal actuel s’oppose à un départ sûr. Attendez ou choisissez une alternative.", blocked: "Une fermeture confirmée concerne cet itinéraire. Ne partez pas avant sa levée." },
    weather: "Météo", hazards: "Dangers et sentier", access: "Accès et rendez-vous", meetup: "Rendez-vous", transport: "Transports", clear: "Aucun signal critique", check: "À vérifier", missing: "Non vérifié", loading: "Vérification des données …", retry: "Réessayer",
    thunderstorm: "Orage au départ", snowIce: "Neige ou glace possible", difficultGround: "Sentier difficile", avalancheHigh: "Danger d’avalanche élevé", avalancheModerate: "Danger d’avalanche accru", closureHint: "Avis cantonal actuel – vérifier le lien avec l’itinéraire", closureWarning: "Avertissement ou dégât signalé", communityBlocked: "La communauté signale le sentier bloqué", communityDifficult: "Signal récent de neige, glace ou boue",
    transportAvailable: (name) => `Transport à l’arrivée : ${name}`, transportUnknown: "Transport à l’arrivée non vérifié", meetupAvailable: (date, count) => `Rendez-vous ${date} · ${count}`, meetupFull: (date) => `Rendez-vous ${date} · complet`, noMeetup: "Aucun rendez-vous prévu", dataIncomplete: "Certaines données en direct manquent ; cela ne vaut pas autorisation.", details: "Détails", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Communauté", sourceOfficial: "Flux d’avis",
  },
  it: {
    title: "Prima della partenza", live: "Verificato in tempo reale",
    decision: { start: "Partenza plausibile", caution: "Partire con prudenza", postpone: "Rimandare la partenza", blocked: "Itinerario chiuso" },
    summary: { start: "Le indicazioni disponibili permettono la partenza oggi. Controlla comunque brevemente i dettagli.", caution: "È presente un’indicazione importante. Parti con l’equipaggiamento adatto e controlla il passaggio.", postpone: "Un’indicazione attuale sconsiglia una partenza sicura. Attendi o scegli un’alternativa.", blocked: "Per questo itinerario è segnalata una chiusura confermata. Non partire finché non sarà revocata." },
    weather: "Meteo", hazards: "Pericoli e sentiero", access: "Accesso e ritrovo", meetup: "Ritrovo", transport: "Trasporti", clear: "Nessun avviso critico", check: "Da verificare", missing: "Non verificato", loading: "Verifica dei dati …", retry: "Riprova",
    thunderstorm: "Temporale alla partenza", snowIce: "Possibile neve o ghiaccio", difficultGround: "Condizioni difficili del sentiero", avalancheHigh: "Pericolo valanghe elevato", avalancheModerate: "Pericolo valanghe aumentato", closureHint: "Avviso cantonale attuale – verificare il collegamento con l’itinerario", closureWarning: "Segnalato avviso o danno al sentiero", communityBlocked: "La community segnala il sentiero bloccato", communityDifficult: "Segnalazione recente di neve, ghiaccio o fango",
    transportAvailable: (name) => `Trasporti all’arrivo: ${name}`, transportUnknown: "Trasporti all’arrivo non verificati", meetupAvailable: (date, count) => `Ritrovo ${date} · ${count}`, meetupFull: (date) => `Ritrovo ${date} · completo`, noMeetup: "Nessun ritrovo previsto", dataIncomplete: "Mancano alcuni dati live; non è un’autorizzazione.", details: "Dettagli", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Community", sourceOfficial: "Feed avvisi",
  },
  en: {
    title: "Before you start", live: "Checked live",
    decision: { start: "Start looks reasonable", caution: "Start with caution", postpone: "Postpone your start", blocked: "Route is closed" },
    summary: { start: "The available signals support starting today. Still check the details before setting off.", caution: "There is a relevant warning. Start only with suitable equipment and check the affected section.", postpone: "At least one current signal argues against a safe start. Wait or choose an alternative.", blocked: "A confirmed closure affects this route. Do not start until it is lifted." },
    weather: "Weather", hazards: "Hazards & trail", access: "Access & meetup", meetup: "Meetup", transport: "Transport", clear: "No critical warnings", check: "Check before starting", missing: "Not verified", loading: "Checking safety data …", retry: "Check again",
    thunderstorm: "Thunderstorm at the trailhead", snowIce: "Snow or ice possible", difficultGround: "Difficult trail conditions", avalancheHigh: "High avalanche danger", avalancheModerate: "Elevated avalanche danger", closureHint: "Current cantonal notice — check whether it affects this route", closureWarning: "Warning or trail damage reported", communityBlocked: "Community reports the trail as blocked", communityDifficult: "Recent community report of snow, ice or mud",
    transportAvailable: (name) => `Transport at destination: ${name}`, transportUnknown: "Transport at destination not verified", meetupAvailable: (date, count) => `Meetup ${date} · ${count}`, meetupFull: (date) => `Meetup ${date} · full`, noMeetup: "No planned meetup", dataIncomplete: "Some live data is missing; this is not a clearance.", details: "Details", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Community", sourceOfficial: "Notice feed",
  },
  zh: {
    title: "出发前", live: "实时检查", decision: { start: "可以考虑出发", caution: "谨慎出发", postpone: "推迟出发", blocked: "路线已关闭" },
    summary: { start: "现有信息支持今天出发，但请在出发前快速查看详情。", caution: "发现重要提示。请使用合适装备并检查受影响路段。", postpone: "至少一项当前信息不支持安全出发。请等待或选择替代路线。", blocked: "该路线有确认的关闭信息。解除前请勿出发。" },
    weather: "天气", hazards: "危险与路况", access: "交通与集合", meetup: "集合", transport: "交通", clear: "没有关键警告", check: "请检查", missing: "未验证", loading: "正在检查安全数据 …", retry: "重新检查", thunderstorm: "起点有雷暴", snowIce: "可能有雪或冰", difficultGround: "路况困难", avalancheHigh: "高雪崩危险", avalancheModerate: "雪崩危险升高", closureHint: "当前州级通告——请确认是否影响路线", closureWarning: "有警告或道路损坏报告", communityBlocked: "社区报告道路受阻", communityDifficult: "社区近期报告有雪、冰或泥", transportAvailable: (name) => `终点交通：${name}`, transportUnknown: "终点交通未验证", meetupAvailable: (date, count) => `集合 ${date} · ${count}`, meetupFull: (date) => `集合 ${date} · 已满`, noMeetup: "没有计划中的集合", dataIncomplete: "部分实时数据缺失；这不代表路线已获许可。", details: "详情", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "社区", sourceOfficial: "通告源",
  },
  es: {
    title: "Antes de salir", live: "Comprobado en directo", decision: { start: "El inicio parece razonable", caution: "Salir con precaución", postpone: "Aplazar la salida", blocked: "Ruta cerrada" },
    summary: { start: "Los datos disponibles permiten salir hoy. Revisa los detalles antes de comenzar.", caution: "Hay un aviso relevante. Sal solo con el equipo adecuado y comprueba el tramo afectado.", postpone: "Al menos un aviso actual desaconseja salir con seguridad. Espera o elige una alternativa.", blocked: "Hay un cierre confirmado en esta ruta. No salgas hasta que se levante." },
    weather: "Tiempo", hazards: "Peligros y sendero", access: "Acceso y encuentro", meetup: "Encuentro", transport: "Transporte", clear: "Sin avisos críticos", check: "Comprobar", missing: "No verificado", loading: "Comprobando datos de seguridad …", retry: "Comprobar de nuevo", thunderstorm: "Tormenta en el inicio", snowIce: "Posible nieve o hielo", difficultGround: "Condiciones difíciles", avalancheHigh: "Peligro de avalancha alto", avalancheModerate: "Peligro de avalancha elevado", closureHint: "Aviso cantonal actual: comprueba si afecta a la ruta", closureWarning: "Aviso o daño del sendero", communityBlocked: "La comunidad indica que el sendero está bloqueado", communityDifficult: "Aviso reciente de nieve, hielo o barro", transportAvailable: (name) => `Transporte en el destino: ${name}`, transportUnknown: "Transporte en el destino no verificado", meetupAvailable: (date, count) => `Encuentro ${date} · ${count}`, meetupFull: (date) => `Encuentro ${date} · completo`, noMeetup: "Sin encuentro previsto", dataIncomplete: "Faltan algunos datos en directo; esto no es una autorización.", details: "Detalles", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Comunidad", sourceOfficial: "Fuente de avisos",
  },
  pt: {
    title: "Antes de começar", live: "Verificado ao vivo", decision: { start: "O início parece razoável", caution: "Começar com cuidado", postpone: "Adiar o início", blocked: "Rota fechada" },
    summary: { start: "Os sinais disponíveis permitem começar hoje. Mesmo assim, confira os detalhes antes de sair.", caution: "Há um aviso relevante. Comece apenas com equipamento adequado e verifique o trecho afetado.", postpone: "Pelo menos um sinal atual desaconselha um início seguro. Espere ou escolha uma alternativa.", blocked: "Há um fechamento confirmado nesta rota. Não comece até que seja suspenso." },
    weather: "Tempo", hazards: "Perigos e trilha", access: "Acesso e encontro", meetup: "Encontro", transport: "Transporte", clear: "Sem avisos críticos", check: "Verificar", missing: "Não verificado", loading: "Verificando dados de segurança …", retry: "Verificar novamente", thunderstorm: "Trovoada no início", snowIce: "Possibilidade de neve ou gelo", difficultGround: "Condições difíceis", avalancheHigh: "Perigo de avalanche alto", avalancheModerate: "Perigo de avalanche elevado", closureHint: "Aviso cantonal atual — verifique se afeta a rota", closureWarning: "Aviso ou dano na trilha", communityBlocked: "A comunidade indica a trilha bloqueada", communityDifficult: "Aviso recente de neve, gelo ou lama", transportAvailable: (name) => `Transporte no destino: ${name}`, transportUnknown: "Transporte no destino não verificado", meetupAvailable: (date, count) => `Encontro ${date} · ${count}`, meetupFull: (date) => `Encontro ${date} · lotado`, noMeetup: "Nenhum encontro planejado", dataIncomplete: "Faltam alguns dados ao vivo; isso não é uma liberação.", details: "Detalhes", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Comunidade", sourceOfficial: "Fonte de avisos",
  },
  ru: {
    title: "Перед стартом", live: "Проверено в реальном времени", decision: { start: "Старт выглядит безопасным", caution: "Старт с осторожностью", postpone: "Отложите старт", blocked: "Маршрут закрыт" },
    summary: { start: "Доступные данные позволяют начать сегодня. Перед выходом всё же проверьте детали.", caution: "Есть важное предупреждение. Используйте подходящее снаряжение и проверьте участок.", postpone: "По крайней мере один актуальный сигнал говорит против безопасного старта. Подождите или выберите альтернативу.", blocked: "Для маршрута подтверждено закрытие. Не начинайте, пока его не отменят." },
    weather: "Погода", hazards: "Опасности и тропа", access: "Доступ и встреча", meetup: "Встреча", transport: "Транспорт", clear: "Критических предупреждений нет", check: "Проверьте", missing: "Не проверено", loading: "Проверяем данные безопасности …", retry: "Проверить снова", thunderstorm: "Гроза у начала маршрута", snowIce: "Возможны снег или лёд", difficultGround: "Сложные условия на тропе", avalancheHigh: "Высокая лавинная опасность", avalancheModerate: "Повышенная лавинная опасность", closureHint: "Актуальное кантональное сообщение — проверьте связь с маршрутом", closureWarning: "Сообщено о предупреждении или повреждении тропы", communityBlocked: "Сообщество сообщает о перекрытии тропы", communityDifficult: "Свежий отчёт о снеге, льду или грязи", transportAvailable: (name) => `Транспорт в пункте назначения: ${name}`, transportUnknown: "Транспорт в пункте назначения не проверен", meetupAvailable: (date, count) => `Встреча ${date} · ${count}`, meetupFull: (date) => `Встреча ${date} · мест нет`, noMeetup: "Запланированных встреч нет", dataIncomplete: "Часть данных в реальном времени недоступна; это не разрешение на маршрут.", details: "Подробности", sourceWeather: "Open-Meteo", sourceEaws: "EAWS / SLF", sourceCommunity: "Сообщество", sourceOfficial: "Лента сообщений",
  },
};

type Props = {
  routeId: string;
  language: LanguageCode;
  weather: WeatherReport | null;
  weatherLoading: boolean;
  weatherError: boolean;
  avalanche: AvalancheBulletin | null;
  avalancheLoading: boolean;
  trailConditions: TrailConditionReport[] | undefined;
  conditionsLoading: boolean;
  sperrungen: SafetyClosure[];
  sperrungenLoading: boolean;
  transport: TransportStationboard | null;
  transportLoading: boolean;
  onRetryWeather?: () => void;
};

function formatMeetupDate(value: Date, language: LanguageCode): string {
  return value.toLocaleDateString(language === "de" || language === "gsw" ? "de-CH" : language, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function PreStartSafetyCard(props: Props) {
  const colors = useColors();
  const { language } = useApp();
  const copy = COPY[props.language] ?? COPY[language] ?? COPY.de;
  const meetups = useGetMeetups({ routeId: props.routeId });

  const analysis = useMemo(
    () =>
      evaluatePreStartSafety({
        weather: props.weather,
        weatherLoading: props.weatherLoading,
        weatherError: props.weatherError,
        avalanche: props.avalanche,
        avalancheLoading: props.avalancheLoading,
        trailConditions: props.trailConditions,
        conditionsLoading: props.conditionsLoading,
        sperrungen: props.sperrungen,
        sperrungenLoading: props.sperrungenLoading,
      }),
    [props],
  );
  const reasonText: Record<SafetyReasonCode, string> = {
    thunderstorm: copy.thunderstorm,
    "critical-weather": copy.difficultGround,
    "caution-weather": copy.snowIce,
    "avalanche-high": copy.avalancheHigh,
    "avalanche-moderate": copy.avalancheModerate,
    "community-blocked": copy.communityBlocked,
    "community-difficult": copy.communityDifficult,
    "official-closure": copy.closureHint,
    "closure-warning": copy.closureWarning,
    clear: copy.clear,
  };
  const reasonSource: Record<SafetyReasonSource, string> = {
    weather: copy.sourceWeather,
    eaws: copy.sourceEaws,
    community: copy.sourceCommunity,
    official: copy.sourceOfficial,
    none: "",
  };
  const reasonIcon: Record<SafetyReasonCode, React.ComponentProps<typeof Feather>["name"]> = {
    thunderstorm: "cloud-lightning",
    "critical-weather": "cloud",
    "caution-weather": "cloud",
    "avalanche-high": "alert-triangle",
    "avalanche-moderate": "alert-triangle",
    "community-blocked": "slash",
    "community-difficult": "map",
    "official-closure": "alert-octagon",
    "closure-warning": "alert-triangle",
    clear: "check-circle",
  };

  const decisionColor = analysis.decision === "start"
    ? "#78C800"
    : analysis.decision === "caution"
      ? "#F2B705"
      : "#EF4444";
  const upcomingMeetup = (meetups.data?.meetups ?? [])
    .filter((meetup: Meetup) => meetup.status === "scheduled" && new Date(meetup.startsAt).getTime() >= Date.now())
    .sort((a: Meetup, b: Meetup) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const meetupLabel = upcomingMeetup
    ? upcomingMeetup.participantCount >= upcomingMeetup.maxParticipants
      ? copy.meetupFull(formatMeetupDate(new Date(upcomingMeetup.startsAt), props.language))
      : copy.meetupAvailable(
          formatMeetupDate(new Date(upcomingMeetup.startsAt), props.language),
          `${upcomingMeetup.participantCount}/${upcomingMeetup.maxParticipants}`,
        )
    : copy.noMeetup;

  return (
    <View style={[styles.card, GLAS_3D, { borderColor: decisionColor + "88", backgroundColor: colors.glassBg }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: decisionColor + "20" }]}>
          <Feather name={analysis.decision === "start" ? "check-circle" : analysis.decision === "caution" ? "alert-triangle" : "alert-octagon"} size={18} color={decisionColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleLine}>
            <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
            <Text style={[styles.live, { color: colors.mutedForeground }]}>{copy.live}</Text>
          </View>
          <Text style={[styles.decision, { color: decisionColor }]}>{copy.decision[analysis.decision]}</Text>
        </View>
      </View>
      <Text style={[styles.summary, { color: colors.foreground }]}>{copy.summary[analysis.decision]}</Text>

      <View style={styles.reasonList}>
        {analysis.reasons.map((reason, index) => (
          <View key={`${reason.code}-${index}`} style={[styles.reason, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder }]}>
            <Feather name={reasonIcon[reason.code]} size={15} color={reason.tone === "danger" ? "#EF4444" : reason.tone === "warn" ? "#F2B705" : colors.accent} />
            <Text style={[styles.reasonText, { color: colors.foreground }]} numberOfLines={2}>{reasonText[reason.code]}</Text>
            {reasonSource[reason.source] ? <Text style={[styles.source, { color: colors.mutedForeground }]}>{reasonSource[reason.source]}</Text> : null}
          </View>
        ))}
      </View>

      <View style={[styles.context, { borderTopColor: colors.glassBorder }]}>
        <ContextRow icon="cloud" label={copy.weather} value={
          props.weatherLoading ? copy.loading
            : props.weather ? props.weather.conditionLabel
            : copy.missing
        } colors={colors} />
        <ContextRow icon="send" label={copy.transport} value={
          props.transportLoading ? copy.loading
            : props.transport?.station ? copy.transportAvailable(props.transport.station.name)
            : copy.transportUnknown
        } colors={colors} />
        <ContextRow icon="users" label={copy.meetup} value={meetupLabel} colors={colors} />
      </View>

      {analysis.dataMissing ? (
        <View style={styles.dataHintRow}>
          <Text style={[styles.dataHint, { color: colors.mutedForeground }]}>
            <Feather name="info" size={12} color={colors.mutedForeground} /> {copy.dataIncomplete}
          </Text>
          {props.weatherError && props.onRetryWeather ? (
            <Pressable onPress={props.onRetryWeather} hitSlop={8} style={styles.retry}>
              <Feather name="refresh-cw" size={12} color={colors.accent} />
              <Text style={[styles.retryText, { color: colors.accent }]}>{copy.retry}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {analysis.activeClosures.some((closure) => closure.url) ? (
        <View style={styles.links}>
          {analysis.activeClosures.filter((closure) => closure.url).slice(0, 2).map((closure) => (
            <Pressable key={closure.id} onPress={() => closure.url && void Linking.openURL(closure.url)} style={styles.link}>
              <Text style={[styles.linkText, { color: colors.accent }]}>{copy.details}</Text>
              <Feather name="external-link" size={12} color={colors.accent} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ContextRow({ icon, label, value, colors }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.contextRow}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.contextValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, borderWidth: 1, borderRadius: 16, padding: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.bodyBold, fontSize: 15 },
  live: { fontFamily: fonts.mono, fontSize: 9, textTransform: "uppercase" },
  decision: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 2 },
  summary: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 12 },
  reasonList: { marginTop: 10 },
  reason: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  reasonText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  source: { fontFamily: fonts.mono, fontSize: 9 },
  context: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8, gap: 6 },
  contextRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contextLabel: { fontFamily: fonts.body, fontSize: 11, width: 92 },
  contextValue: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, textAlign: "right" },
  dataHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginTop: 10 },
  dataHintRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  retry: { flexDirection: "row", alignItems: "center", gap: 4 },
  retryText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  links: { flexDirection: "row", gap: 14, marginTop: 7 },
  link: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 11 },
});