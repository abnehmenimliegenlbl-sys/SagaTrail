import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

const WEB_TOP = 67;

const CONTENT: Record<string, { title: string; sections: { h: string; p: string }[] }> = {
  datenschutz: {
    title: "Datenschutz",
    sections: [
      {
        h: "Welche Daten wir erheben",
        p: "SagaTrail verarbeitet Standortdaten (nur während einer aktiven Wanderung), dein Profil (Name, Archetyp, Heimatkanton, Sprache, Alterstufe) sowie deinen Story-Fortschritt und freigeschaltete Sammlungen.",
      },
      {
        h: "Wo die Daten liegen",
        p: "In diesem Erststart-Build werden alle Daten ausschliesslich lokal auf deinem Gerät gespeichert. Es findet keine Übertragung an Server statt. Du kannst deine Daten jederzeit in den Einstellungen exportieren oder vollständig löschen.",
      },
      {
        h: "Standort",
        p: "Der Standort wird nur genutzt, um Erzählmomente an den passenden Wegpunkten auszulösen. Du kannst die Berechtigung jederzeit im Betriebssystem widerrufen; die App funktioniert dann mit einer simulierten Route weiter.",
      },
      {
        h: "Kinder",
        p: "Für die Alterstufe Kinder ist die Bestätigung einer erziehungsberechtigten Person erforderlich. Inhalte werden altersgerecht entschärft.",
      },
    ],
  },
  impressum: {
    title: "Impressum",
    sections: [
      {
        h: "Anbieter",
        p: "SagaTrail (Erststart-Build). Verantwortlich für den Inhalt der App ist das SagaTrail-Team.",
      },
      {
        h: "Sagen & Quellen",
        p: "Die erzählten Sagen beruhen auf gemeinfreien Überlieferungen und historischen Sagensammlungen. Die jeweilige Quelle ist in jeder Sage ausgewiesen.",
      },
      {
        h: "Notfall",
        p: "SagaTrail ersetzt keine offizielle Notfall- oder Bergrettungs-App. Im Notfall gilt: Rega 1414 oder Euro-Notruf 112.",
      },
      {
        h: "Kontakt",
        p: "support@sagatrail.ch",
      },
    ],
  },
};

export default function LegalDoc() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const data = CONTENT[doc ?? "datenschutz"] ?? CONTENT.datenschutz;
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 60,
        }}
      >
        <ScreenHeader eyebrow="Recht & Daten" title={data.title} onBack />
        <SparkDivider style={{ marginVertical: 22 }} />
        {data.sections.map((s) => (
          <React.Fragment key={s.h}>
            <Text style={[styles.h, { color: colors.accent }]}>{s.h}</Text>
            <Text style={[styles.p, { color: colors.foreground }]}>{s.p}</Text>
          </React.Fragment>
        ))}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 20, marginBottom: 6 },
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
});
