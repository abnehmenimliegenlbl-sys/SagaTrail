import React, { useCallback, useState } from "react";

import { AppModal, AppModalButton } from "@/components/brand/AppModal";

/**
 * Ersatz fuer `Alert.alert`, damit App-eigene Dialoge (Fehler, Bestaetigungen,
 * Logout etc.) im SagaTrail-Glas-Design erscheinen statt im unstylbaren,
 * plattformeigenen OS-Fenster. Gleiche Aufrufsignatur wie `Alert.alert`
 * (title, message?, buttons?), damit bestehende Callsites nur den Import
 * tauschen muessen.
 *
 * Implementiert als Modul-Singleton (statt Hook), damit `alert(...)` genau
 * wie zuvor `Alert.alert(...)` aus jeder Komponente heraus aufgerufen werden
 * kann, ohne dass jede Callsite den Provider durchreichen muss.
 */

export type { AppModalButton as AlertButton };

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppModalButton[];
}

const EMPTY_STATE: AlertState = { visible: false, title: "", buttons: [] };

let showImpl: ((title: string, message?: string, buttons?: AppModalButton[]) => void) | null =
  null;

export function alert(title: string, message?: string, buttons?: AppModalButton[]) {
  if (showImpl) {
    showImpl(title, message, buttons);
  } else if (__DEV__) {
    console.warn("AppAlertProvider ist noch nicht gemountet:", title, message);
  }
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>(EMPTY_STATE);

  const close = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  showImpl = useCallback(
    (title: string, message?: string, buttons?: AppModalButton[]) => {
      const finalButtons: AppModalButton[] =
        buttons && buttons.length > 0 ? buttons : [{ text: "OK" }];
      setState({
        visible: true,
        title,
        message,
        buttons: finalButtons.map((b) => ({
          ...b,
          onPress: () => {
            close();
            // Das native `Modal` schliesst sich mit einer eigenen
            // UIKit-Uebergangsanimation (FadeOut, ~150ms). Feuert der
            // Button-Callback (z.B. router.back()) im selben Tick, laufen
            // zwei native Uebergaenge gleichzeitig — das kann auf iOS zum
            // kompletten UI-Deadlock/Freeze fuehren (gleiches Muster wie die
            // StoreKit-Sheet-Kollision beim Kauf). Erst nach der
            // Dismiss-Animation feuern.
            if (b.onPress) {
              setTimeout(() => b.onPress?.(), 250);
            }
          },
        })),
      });
    },
    [close]
  );

  return (
    <>
      {children}
      <AppModal
        visible={state.visible}
        onRequestClose={close}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
      />
    </>
  );
}
