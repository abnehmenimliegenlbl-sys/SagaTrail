// RevenueCat: native In-App-Purchase-Abwicklung fuer das Premium-Abo.
// Deckt die ElevenLabs-Erzaehlkosten (~$0.30-0.70/Hike) ueber ein
// Abo-Modell. Siehe scripts/src/seedRevenueCat.ts fuer die
// Projekt-/Produkt-Konfiguration in RevenueCat.
import React, { createContext, useContext, useEffect } from "react";
import { AppState, Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAuth } from "@clerk/expo";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

// Muss mit den "lookup_key"s der Entitlements in scripts/src/portfolio2026.ts
// uebereinstimmen.
export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";
export const REVENUECAT_ELITE_ENTITLEMENT = "elite";
// Offering mit den Kantons-Sagen-Packs (ein Paket pro Kanton,
// lookup_key = pack_<kantonSlug>).
export const REVENUECAT_PACKS_OFFERING = "packs";
// Ein einziges Kantonspack-Paket fuer alle Kantone; die Zuordnung zum
// gewaehlten Kanton macht der Server nach dem Kauf (POST /me/packs/claim).
export const KANTONSPACK_PACKAGE = "kantonspack";

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat Public API Keys not found");
  }

  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }

  if (Platform.OS === "ios") {
    return REVENUECAT_IOS_API_KEY;
  }

  if (Platform.OS === "android") {
    return REVENUECAT_ANDROID_API_KEY;
  }

  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) throw new Error("RevenueCat Public API Key not found");

  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
}

function useSubscriptionContext() {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  // Aktuelle RevenueCat-Customer-ID. Der AppContext wartet mit dem
  // verifizierten Server-Sync, bis diese ID der Clerk-Nutzer-ID entspricht
  // (sonst prueft der Server einen Customer, dem der anonyme Kauf noch
  // nicht zugeordnet wurde).
  const [rcAppUserId, setRcAppUserId] = React.useState<string | null>(null);
  // Merkt sich, ob die letzte Identitaets-Verknuepfung fehlgeschlagen ist
  // (z.B. kurzer Netzwerk-Aussetzer beim kalten App-Start). Ohne erneuten
  // Versuch bleibt RevenueCat sonst bis zum naechsten vollstaendigen
  // App-Neustart auf der anonymen ID haengen — und der Server-Sync
  // (POST /me/premium/sync) prueft dann nie den richtigen Customer, obwohl
  // der Kauf laengst bestaetigt ist.
  const letzterVersuchFehlgeschlagenRef = React.useRef(false);
  const [wiederholungsTick, setWiederholungsTick] = React.useState(0);

  // Meldet den RevenueCat-Customer mit der Clerk-Nutzer-ID an, damit der
  // Server Kaeufe verifiziert abgleichen kann (POST /me/premium/sync prueft
  // den Customer mit genau dieser ID). Beim Abmelden zurueck zur anonymen ID.
  useEffect(() => {
    if (!authLoaded) return;
    let abgebrochen = false;
    (async () => {
      // Bis zu 3 Versuche mit kurzer Pause: deckt voruebergehende
      // Netzwerkfehler beim App-Start ab, ohne den Nutzer auf einen
      // kompletten Neustart warten zu lassen.
      for (let versuch = 0; versuch < 3; versuch++) {
        if (abgebrochen) return;
        try {
          const aktuelleId = await Purchases.getAppUserID();
          if (isSignedIn && userId && aktuelleId !== userId) {
            // logIn transferiert anonym getaetigte Kaeufe auf den Nutzer.
            const { customerInfo } = await Purchases.logIn(userId);
            void customerInfo;
          } else if (!isSignedIn && !aktuelleId.startsWith("$RCAnonymousID:")) {
            await Purchases.logOut();
          } else {
            if (!abgebrochen) {
              setRcAppUserId(aktuelleId);
              letzterVersuchFehlgeschlagenRef.current = false;
            }
            return;
          }
          const neueId = await Purchases.getAppUserID();
          if (!abgebrochen) {
            setRcAppUserId(neueId);
            letzterVersuchFehlgeschlagenRef.current = false;
            queryClient.invalidateQueries({ queryKey: ["revenuecat"] });
          }
          return;
        } catch {
          if (versuch < 2) {
            await new Promise((r) => setTimeout(r, 1500 * (versuch + 1)));
            continue;
          }
          // Alle Versuche fehlgeschlagen: beim naechsten App-Vordergrund
          // (AppState "active") wird es erneut versucht.
          letzterVersuchFehlgeschlagenRef.current = true;
        }
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [authLoaded, isSignedIn, userId, queryClient, wiederholungsTick]);

  // Sicherheitsnetz: kommt die App in den Vordergrund und die letzte
  // Identitaets-Verknuepfung ist fehlgeschlagen, erneut versuchen — statt
  // dauerhaft mit einer nicht verknuepften (anonymen) RevenueCat-ID zu
  // bleiben, was den Premium-Sync unbemerkt verhindern wuerde.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && letzterVersuchFehlgeschlagenRef.current) {
        setWiederholungsTick((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      const info = await Purchases.getCustomerInfo();
      return info;
    },
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings;
    },
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      return Purchases.restorePurchases();
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const aktiveEntitlements = customerInfoQuery.data?.entitlements.active ?? {};
  const isSubscribed =
    aktiveEntitlements[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;
  const isElite = aktiveEntitlements[REVENUECAT_ELITE_ENTITLEMENT] !== undefined;
  const hatEntitlement = (key: string) => aktiveEntitlements[key] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    rcAppUserId,
    offerings: offeringsQuery.data,
    isSubscribed,
    isElite,
    hatEntitlement,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    refreshCustomerInfo: customerInfoQuery.refetch,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
