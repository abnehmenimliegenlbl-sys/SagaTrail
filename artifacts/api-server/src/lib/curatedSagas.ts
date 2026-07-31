import { createRequire } from "node:module";
import type { InsertCatalogSaga } from "@workspace/db";

const _r = createRequire(import.meta.url);
export const CURATED_SAGAS: InsertCatalogSaga[] = _r("./curatedSagas.json");
