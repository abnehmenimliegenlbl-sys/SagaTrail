/**
 * Vorab per OpenAI gpt-audio gerenderte Navigations-Ansagen.
 * Je 2 Clips (links/rechts) für alle 9 App-Sprachen.
 * Bundled als statische Assets — kein Netzwerk-Request während der Wanderung nötig.
 */

const TURNS: Record<string, { links: number; rechts: number }> = {
  de:  { links: require("../assets/audio/turns/de_links.mp3"),  rechts: require("../assets/audio/turns/de_rechts.mp3")  },
  gsw: { links: require("../assets/audio/turns/gsw_links.mp3"), rechts: require("../assets/audio/turns/gsw_rechts.mp3") },
  fr:  { links: require("../assets/audio/turns/fr_links.mp3"),  rechts: require("../assets/audio/turns/fr_rechts.mp3")  },
  it:  { links: require("../assets/audio/turns/it_links.mp3"),  rechts: require("../assets/audio/turns/it_rechts.mp3")  },
  en:  { links: require("../assets/audio/turns/en_links.mp3"),  rechts: require("../assets/audio/turns/en_rechts.mp3")  },
  zh:  { links: require("../assets/audio/turns/zh_links.mp3"),  rechts: require("../assets/audio/turns/zh_rechts.mp3")  },
  es:  { links: require("../assets/audio/turns/es_links.mp3"),  rechts: require("../assets/audio/turns/es_rechts.mp3")  },
  pt:  { links: require("../assets/audio/turns/pt_links.mp3"),  rechts: require("../assets/audio/turns/pt_rechts.mp3")  },
  ru:  { links: require("../assets/audio/turns/ru_links.mp3"),  rechts: require("../assets/audio/turns/ru_rechts.mp3")  },
};

/**
 * Gibt den require()-Bezeichner für den passenden Clip zurück.
 * Fällt auf Deutsch zurück wenn die Sprache nicht vorhanden ist.
 */
export function getTurnAudio(
  lang: string,
  direction: "links" | "rechts",
): number {
  return (TURNS[lang] ?? TURNS["de"])[direction];
}
