// RevenueCat: native In-App-Purchase-Abwicklung fuer das Premium-Abo.
// Deckt die ElevenLabs-Erzaehlkosten (~$0.30-0.70/Hike) ueber ein
// Abo-Modell. Siehe scripts/src/seedRevenueCat.ts fuer die
// Projekt-/Produkt-Konfiguration in RevenueCat.
import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
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

  // Meldet den RevenueCat-Customer mit der Clerk-Nutzer-ID an, damit der
  // Server Kaeufe verifiziert abgleichen kann (POST /me/premium/sync prueft
  // den Customer mit genau dieser ID). Beim Abmelden zurueck zur anonymen ID.
  useEffect(() => {
    if (!authLoaded) return;
    let abgebrochen = false;
    (async () => {
      try {
        const aktuelleId = await Purchases.getAppUserID();
        if (isSignedIn && userId && aktuelleId !== userId) {
          // logIn transferiert anonym getaetigte Kaeufe auf den Nutzer.
          const { customerInfo } = await Purchases.logIn(userId);
          void customerInfo;
        } else if (!isSignedIn && !aktuelleId.startsWith("$RCAnonymousID:")) {
          await Purchases.logOut();
        } else {
          if (!abgebrochen) setRcAppUserId(aktuelleId);
          return;
        }
        const neueId = await Purchases.getAppUserID();
        if (!abgebrochen) {
          setRcAppUserId(neueId);
          queryClient.invalidateQueries({ queryKey: ["revenuecat"] });
        }
      } catch {
        // Nicht fatal: ohne Login bleibt der Kauf anonym; der naechste
        // App-Start versucht es erneut.
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [authLoaded, isSignedIn, userId, queryClient]);

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
