import { getRoutePhoto, getSagaPhoto } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import { Saga } from "@/types";

/**
 * Laedt fuer eine Sage ein echtes Foto (Wikimedia Commons, ueber den eigenen
 * API-Server). Zuerst wird nach dem Kernmotiv der Sage gesucht (z. B.
 * "Vogel Gryff", "Baer") — das Bild soll zeigen, WORUM es in der Sage geht,
 * nicht bloss den Ort der Handlung. Nur wenn das nichts liefert, wird auf ein
 * ortsnahes Foto (Koordinaten) zurueckgegriffen; sonst (und solange nichts
 * geladen ist) zeigt sich das gebuendelte Fallback-Bild.
 */

const heroImg = require("@/assets/images/hero-valley.png");
const teufelImg = require("@/assets/images/saga-teufelsbruecke.png");

export interface SagaFoto {
  source: ImageSourcePropType;
  attribution: string | null;
}

interface GecachtesFoto {
  url: string | null;
  attribution: string | null;
}

const fotoCache = new Map<string, GecachtesFoto>();
const laufend = new Map<string, Promise<GecachtesFoto>>();

function fallbackBild(saga: Saga | null): number {
  return saga?.id === "teufelsbrucke" ? teufelImg : heroImg;
}

function motivSuchbegriff(saga: Saga): string | null {
  return saga.bildmotiv ?? null;
}

function cacheSchluessel(saga: Saga | null): string | null {
  if (!saga) return null;
  return saga.id;
}

async function ladeMotivFoto(saga: Saga, schluessel: string): Promise<GecachtesFoto> {
  const vorhanden = fotoCache.get(schluessel);
  if (vorhanden) return vorhanden;
  const bereits = laufend.get(schluessel);
  if (bereits) return bereits;
  const anfrage = (async (): Promise<GecachtesFoto> => {
    // 0. Sofort-Treffer: Foto bereits in der Sage-Antwort vom Server gecacht.
    if (saga.fotoUrl) {
      return { url: saga.fotoUrl, attribution: saga.fotoAttribution ?? null };
    }
    // 1. Versuch: Foto passend zum konkreten Bildmotiv der Sage (worum es
    // inhaltlich geht, z. B. "Vogel Gryff" statt Rheinufer).
    // sagaId mitschicken: Server schreibt Ergebnis dauerhaft in catalog_sagas.
    const suchbegriff = motivSuchbegriff(saga);
    if (suchbegriff) {
      try {
        const motivAntwort = await getSagaPhoto({
          query: suchbegriff,
          sagaId: saga.id,
        } as Parameters<typeof getSagaPhoto>[0]);
        if (motivAntwort.photoUrl) {
          return {
            url: motivAntwort.photoUrl,
            attribution: motivAntwort.attribution ?? null,
          };
        }
      } catch {
        // ignorieren, weiter mit Orts-Fallback
      }
    }
    // 2. Fallback: ortsnahes Foto ueber die Koordinaten, falls vorhanden.
    if (saga.coordinates) {
      try {
        const ortAntwort = await getRoutePhoto({
          lat: saga.coordinates.lat,
          lng: saga.coordinates.lng,
        });
        if (ortAntwort.photoUrl) {
          return { url: ortAntwort.photoUrl, attribution: ortAntwort.attribution ?? null };
        }
      } catch {
        // ignorieren, Client zeigt gebuendeltes Fallback-Bild
      }
    }
    return { url: null, attribution: null };
  })()
    .then((foto) => {
      if (foto.url) fotoCache.set(schluessel, foto); // Nur Treffer cachen, nie null
      return foto;
    })
    .finally(() => {
      laufend.delete(schluessel);
    });
  laufend.set(schluessel, anfrage);
  return anfrage;
}

export function useSagaFoto(saga: Saga | null): SagaFoto {
  const fallback = fallbackBild(saga);
  const schluessel = cacheSchluessel(saga);
  const [foto, setFoto] = useState<GecachtesFoto | null>(
    () => (schluessel ? fotoCache.get(schluessel) ?? null : null),
  );

  useEffect(() => {
    if (!schluessel || !saga) {
      setFoto(null);
      return;
    }
    let aktiv = true;
    ladeMotivFoto(saga, schluessel).then((geladen) => {
      if (aktiv) setFoto(geladen);
    });
    return () => {
      aktiv = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  if (foto?.url) {
    return { source: { uri: foto.url }, attribution: foto.attribution };
  }
  return { source: fallback, attribution: null };
}
