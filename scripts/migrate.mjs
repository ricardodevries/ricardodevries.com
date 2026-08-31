import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Applies pending Drizzle migrations from the `drizzle/` folder to the
 * configured libSQL database. Used by the deployment workflow (replacing the
 * removed `astro db push`) and available locally via `npm run db:migrate`.
 *
 * Behavior:
 * - Fresh database (no application tables): the full migration history runs
 *   from the start.
 * - Database already carrying `__drizzle_migrations`: pending migrations are
 *   applied by their `when` timestamp (already-applied ones are skipped).
 * - Existing database with the application tables but no
 *   `__drizzle_migrations` history (created before Drizzle, e.g. by
 *   `@astrojs/db`): plain `db:migrate` refuses to run, because re-executing
 *   migration 0000 against an existing database is not what you want. Pass
 *   `--baseline` (see SETUP.md, "Existing databases") to record the baseline
 *   migration 0000 without executing it — after adding the
 *   `AuthAccount.issuer` column when it is missing (databases predating
 *   better-auth 1.7) — and then apply every later migration.
 *
 * Migration 0000 is intentionally kept byte-identical to the baseline file
 * the operator already recorded in the production database (its sha256 is the
 * `hash` in `__drizzle_migrations`); adopters must therefore go through the
 * guard above rather than a re-write of 0000. `0001`/`0002` are idempotent
 * (IF EXISTS / IF NOT EXISTS / WHERE-guarded), so re-running them is safe.
 */
const url =
  process.env.DATABASE_URL ||
  process.env.ASTRO_DB_REMOTE_URL ||
  "file:local.db";

const authToken =
  process.env.DATABASE_AUTH_TOKEN || process.env.ASTRO_DB_APP_TOKEN || undefined;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = join(root, "drizzle");

const BASELINE_TAG = "0000_careless_typhoid_mary";
const BASELINE_WHEN = 1787923245906;

const client = createClient({ url, authToken });
const db = drizzle(client);

async function tableExists(name) {
  const { rows } = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE name = ?",
    args: [name],
  });

  return rows.length > 0;
}

async function columnExists(table, column) {
  const { rows } = await client.execute({ sql: `PRAGMA table_info(${table})` });

  return rows.some((r) => r.name === column);
}

function journalEntries() {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
  );

  return journal.entries;
}

function sha256Of(tag) {
  const sql = readFileSync(join(migrationsFolder, `${tag}.sql`), "utf8");

  return createHash("sha256").update(sql).digest("hex");
}

async function verifyBaselineRow() {
  // Verify the recorded baseline (hash of the 0000 file + its `when`), or
  // record it. Throws on any inconsistency so a corrupted or divergent
  // migration history can never proceed silently.
  const journalEntry = journalEntries().find((e) => e.tag === BASELINE_TAG);

  if (!journalEntry || journalEntry.when !== BASELINE_WHEN) {
    throw new Error(
      `Baseline journal entry ${BASELINE_TAG} is missing or has an unexpected "when"; refusing to continue.`,
    );
  }

  // Same shape the Drizzle migrator uses (migrator.js), so a later plain
  // `db:migrate` run sees a consistent tracking table.
  await client.execute({
    sql: "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)",
  });

  const hash = sha256Of(BASELINE_TAG);
  const { rows } = await client.execute({
    sql: "SELECT hash FROM __drizzle_migrations WHERE created_at = ?",
    args: [BASELINE_WHEN],
  });

  if (rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      args: [hash, BASELINE_WHEN],
    });
    console.log(`Recorded baseline ${BASELINE_TAG} (sha256 ${hash}) without executing it.`);
  } else if (rows[0].hash !== hash) {
    throw new Error(
      [
        `Recorded baseline for ${BASELINE_TAG} has hash ${rows[0].hash}, but the`,
        `migration file on disk hashes to ${hash}. The migration history is`,
        "inconsistent with the files; refusing to continue.",
        "If this database was baselined against a different 0000, restore the",
        "matching file (or its recorded hash) and re-run.",
      ].join("\n"),
    );
  } else {
    console.log(`Baseline ${BASELINE_TAG} already recorded (hash verified); nothing to do.`);
  }
}

try {
  const hasAppTables =
    (await tableExists("Analytics")) &&
    (await tableExists("AuthUser")) &&
    (await tableExists("Comments")) &&
    (await tableExists("Views"));
  const hasHistory = await tableExists("__drizzle_migrations");

  if (hasAppTables) {
    const wantBaseline = process.argv.includes("--baseline");

    if (wantBaseline) {
      // --baseline on an existing application database: verify (or record)
      // the baseline row, and add the issuer column if this database
      // predates better-auth 1.7. Safe to run any number of times.
      if ((await tableExists("AuthAccount")) && !(await columnExists("AuthAccount", "issuer"))) {
        console.log("Adding missing `AuthAccount.issuer` column.");
        await client.execute({ sql: 'ALTER TABLE "AuthAccount" ADD COLUMN "issuer" text' });
      }

      await verifyBaselineRow();
    } else if (!hasHistory) {
      // Adoption without history must be an explicit operator decision.
      throw new Error(
        [
          "Database already contains the application tables but has no",
          "__drizzle_migrations history. Refusing to run migration 0000",
          "against an existing database.",
          "If this database predates Drizzle (or its tracking table was",
          "lost), bootstrap the history with:",
          "  npm run db:migrate -- --baseline",
          "(see SETUP.md, 'Existing databases').",
        ].join("\n"),
      );
    }
  }

  console.log(`Applying database migrations to ${url} ...`);
  await migrate(db, { migrationsFolder });
  console.log("Database migrations applied.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  client.close();
}
