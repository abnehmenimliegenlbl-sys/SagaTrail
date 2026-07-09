import { Mountain, Cloud, MapPin, Play, Sun, Moon } from "lucide-react";

export type ThemeTokens = {
  bgTop: string;
  bgBottom: string;
  headerText: string;
  headerSub: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardSub: string;
  chipBg: string;
  chipText: string;
  primary: string;
  primaryText: string;
  accent: string;
  accentText: string;
  pillBg: string;
  pillText: string;
  modeIcon: "sun" | "moon";
  mountainColor: string;
  cloudColor: string;
  glassBg: string;
  glassBorder: string;
};

export function ScreenMock({
  tokens,
  modeLabel,
  weatherLabel,
}: {
  tokens: ThemeTokens;
  modeLabel: string;
  weatherLabel: string;
}) {
  const ModeIcon = tokens.modeIcon === "sun" ? Sun : Moon;
  const cardShadow = "0 8px 24px -8px rgba(0,0,0,0.18), 0 2px 6px -2px rgba(0,0,0,0.12)";
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${tokens.bgTop} 0%, ${tokens.bgBottom} 100%)`,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80" style={{ color: tokens.headerSub }}>
            Guten Morgen
          </p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: tokens.headerText }}>
            SagaTrail
          </h1>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: tokens.pillBg, color: tokens.pillText }}
        >
          <ModeIcon size={14} />
          {modeLabel}
        </div>
      </div>

      {/* Weather / conditions banner (frosted glass) */}
      <div className="px-6 mb-5">
        <div
          className="rounded-2xl p-4 flex items-center gap-3 border backdrop-blur-md"
          style={{
            backgroundColor: tokens.glassBg,
            borderColor: tokens.glassBorder,
            boxShadow: cardShadow,
          }}
        >
          <Cloud size={22} color={tokens.cloudColor} />
          <div>
            <p className="text-sm font-semibold" style={{ color: tokens.chipText }}>
              {weatherLabel}
            </p>
            <p className="text-xs opacity-70" style={{ color: tokens.chipText }}>
              Ideale Bedingungen zum Wandern
            </p>
          </div>
        </div>
      </div>

      {/* Saga card (frosted glass, 3D depth) */}
      <div className="px-6 mb-5">
        <div
          className="rounded-3xl overflow-hidden border backdrop-blur-md"
          style={{ backgroundColor: tokens.glassBg, borderColor: tokens.cardBorder, boxShadow: cardShadow }}
        >
          <div
            className="h-32 w-full flex items-end p-4"
            style={{
              background: `linear-gradient(160deg, ${tokens.accent}33 0%, ${tokens.mountainColor}22 100%)`,
            }}
          >
            <Mountain size={40} color={tokens.mountainColor} />
          </div>
          <div className="p-4">
            <div
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mb-2"
              style={{ backgroundColor: tokens.chipBg, color: tokens.chipText }}
            >
              <MapPin size={12} /> Uri
            </div>
            <h3 className="font-bold text-lg" style={{ color: tokens.cardText }}>
              Die Sage vom Tell-Pass
            </h3>
            <p className="text-sm mt-1" style={{ color: tokens.cardSub }}>
              6.4 km · 3 Std. · Mittel
            </p>
          </div>
        </div>
      </div>

      {/* Second saga chip row (frosted glass tiles) */}
      <div className="px-6 flex gap-3 mb-6">
        <div
          className="flex-1 rounded-2xl p-3 border backdrop-blur-md"
          style={{ backgroundColor: tokens.glassBg, borderColor: tokens.cardBorder, boxShadow: cardShadow }}
        >
          <p className="text-xs font-semibold" style={{ color: tokens.cardSub }}>
            Fortschritt
          </p>
          <p className="text-lg font-bold" style={{ color: tokens.cardText }}>
            12 Sagen
          </p>
        </div>
        <div
          className="flex-1 rounded-2xl p-3 border backdrop-blur-md"
          style={{ backgroundColor: tokens.glassBg, borderColor: tokens.cardBorder, boxShadow: cardShadow }}
        >
          <p className="text-xs font-semibold" style={{ color: tokens.cardSub }}>
            Distanz
          </p>
          <p className="text-lg font-bold" style={{ color: tokens.cardText }}>
            84 km
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 mt-auto pb-10">
        <button
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-base"
          style={{
            backgroundColor: tokens.primary,
            color: tokens.primaryText,
            boxShadow: `0 10px 24px -6px ${tokens.primary}66, 0 2px 6px -2px rgba(0,0,0,0.2)`,
          }}
        >
          <Play size={18} fill={tokens.primaryText} />
          Wanderung starten
        </button>
      </div>
    </div>
  );
}
