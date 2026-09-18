import { requireOptionalNativeModule } from "expo";
import { lazy, Suspense } from "react";

import type { PeakTerrainGlProps } from "./PeakTerrainGl.types";

const NativeRenderer = lazy(() => import("./PeakTerrainGlRenderer.native"));

export function PeakTerrainGl(props: PeakTerrainGlProps) {
  if (!requireOptionalNativeModule("ExpoGL")) return null;
  return (
    <Suspense fallback={null}>
      <NativeRenderer {...props} />
    </Suspense>
  );
}