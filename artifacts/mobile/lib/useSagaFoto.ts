import { getRoutePhoto } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import { Saga } from "@/types";

/**
 * Laedt fuer eine Sage ein echtes, ortsnahes Foto (Wikimedia Commons, ueber
 * den eigenen API-Server) — dieselbe Quelle, die auch fuer Routenfotos
 * verwendet wird. Nur moeglich, wenn die Sage Koordinaten hat; sonst (und
 * solange nichts geladen ist) wird das gebuendelte Fallback-Bild gezeigt.
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

function cacheSchluessel(saga: Saga | null): string | null {
  if (!saga?.coordinates) return null;
  return `${saga.coordinates.lat.toFixed(3)}|${saga.coordinates.lng.toFixed(3)}`;
}

async function ladeFoto(lat: number, lng: number, schluessel: string): Promise<GecachtesFoto> {
  const vorhanden = fotoCache.get(schluessel);
  if (vorhanden) return vorhanden;
  const bereits = laufend.get(schluessel);
  if (bereits) return bereits;
  const anfrage = getRoutePhoto({ lat, lng })
    .then((antwort) => {
      const foto: GecachtesFoto = {
        url: antwort.photoUrl ?? null,
        attribution: antwort.attribution ?? null,
      };
      fotoCache.set(schluessel, foto);
      return foto;
    })
    .catch((): GecachtesFoto => ({ url: null, attribution: null }))
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
    if (!schluessel || !saga?.coordinates) {
      setFoto(null);
      return;
    }
    let aktiv = true;
    ladeFoto(saga.coordinates.lat, saga.coordinates.lng, schluessel).then((geladen) => {
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
