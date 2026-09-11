import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PermissionsStep } from "@/components/brand/PermissionsStep";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useRequiredPermissions } from "@/contexts/RequiredPermissionsContext";
import { useColors } from "@/hooks/useColors";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";

export default function RequiredPermissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useOnboardingStrings();
  const { refresh } = useRequiredPermissions();
  const [allGranted, setAllGranted] = useState(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!allGranted || verifyingRef.current) return;
    verifyingRef.current = true;
    void refresh("permission-screen-complete").finally(() => {
      verifyingRef.current = false;
    });
  }, [allGranted, refresh]);

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 28,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 48,
        }}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <SparkMountain size={76} />
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.titleBold,
              fontSize: 28,
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {t.permissionsTitle}
          </Text>
        </View>
        <PermissionsStep onAllGrantedChange={setAllGranted} />
      </ScrollView>
    </Background>
  );
}