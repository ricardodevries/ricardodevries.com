import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Applies pending Drizzle migrations from the `drizzle/` folder to the
 * configured libSQL database. Used by the deployment workflow (replacing the
 * removed `astro db push`) and available locally via `npm run db:migrate`.
 */
const url =
  process.env.DATABASE_URL ||
  process.env.ASTRO_DB_REMOTE_URL ||
  "file:local.db";

const authToken =
  process.env.DATABASE_AUTH_TOKEN || process.env.ASTRO_DB_APP_TOKEN || undefined;

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

const client = createClient({ url, authToken });
const db = drizzle(client);

try {
  console.log(`Applying database migrations to ${url} ...`);
  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied.");
} finally {
  client.close();
}
