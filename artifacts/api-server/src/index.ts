import app from "./app";
import { logger } from "./lib/logger";
import { seedCatalog } from "./lib/catalogSeed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Katalog beim Start idempotent seeden, damit die App sofort Daten sieht.
  try {
    await seedCatalog();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Katalog-Seeding fehlgeschlagen");
  }
});
