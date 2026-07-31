import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ADMIN_DASHBOARD_HTML: string = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "admin-dashboard.html"),
  "utf8",
);
