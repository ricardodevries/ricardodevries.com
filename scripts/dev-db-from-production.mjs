import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Builds a local development database that represents production, using the
 * cleaner "fresh schema + data import" workflow instead of copying raw
 * server data files.
 *
 * Why this over a raw file copy:
 *   - Production libSQL is served by `sqld`, not a plain file. Its on-disk
 *     state is a WAL-mode database plus a metastore and compaction state that
 *     only `sqld` understands. Copying `data`/`data-wal`/`data-shm` while the
 *     server runs yields a torn snapshot; copying the whole directory drags in
 *     server-internal state that a local dev file should not have.
 *   - A row-based export through the SQL API reads a consistent view of the
 *     data, then we replay it onto a *fresh* database created from the
 *     current migrations. The result has the exact current schema, the
 *     current migration history (so `db:migrate` is a no-op), and the real
 *     production rows — without production-specific artifacts such as the
 *     leftover `_astro_db_snapshot` bookkeeping table.
 *
 * Usage:
 *   node scripts/dev-db-from-production.mjs [out-file.db]
 *   (reads DATABASE_URL / ASTRO_DB_REMOTE_URL for the source; defaults to the
 *    SSH-tunneled http://127.0.0.1:18080)
 *
 * It never writes to the source database.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = join(root, "drizzle");

const sourceUrl =
  process.env.DATABASE_URL ||
  process.env.ASTRO_DB_REMOTE_URL ||
  "http://127.0.0.1:18080";
const outFile = process.argv[2] || "local.db";
const sourceAuth =
  process.env.DATABASE_AUTH_TOKEN || process.env.ASTRO_DB_APP_TOKEN || undefined;

const source = createClient({ url: sourceUrl, authToken: sourceAuth });
const targetUrl = `file:${outFile}`;
const target = createClient({ url: targetUrl });
const targetDb = drizzle(target);

const quote = (id) => `\`${String(id).replace(/`/g, "``")}\``;
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

try {
  console.log(`1/4 Reading schema from ${sourceUrl} ...`);
  const { rows: tables } = await source.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  // Skip Drizzle-internal and legacy astro:db bookkeeping tables; the fresh
  // build recreates what the current migrations define.
  const skip = new Set(["__drizzle_migrations", "_astro_db_snapshot", "sqlite_sequence"]);
  const dataTables = tables.map((t) => t.name).filter((n) => !skip.has(n));

  console.log(`2/4 Applying current migrations to a fresh ${outFile} ...`);
  await migrate(targetDb, { migrationsFolder });

  console.log(`3/4 Importing rows (${dataTables.join(", ")}) ...`);
  const counts = [];
  for (const name of dataTables) {
    const exists = (
      await target.execute({
        sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        args: [name],
      })
    ).rows;

    if (exists.length === 0) {
      // Table only exists in the source and not in the current schema.
      console.log(`   - ${name}: not in current schema, skipping`);
      continue;
    }

    let src;
    try {
      src = await source.execute({ sql: `SELECT * FROM ${quote(name)}` });
    } catch (e) {
      // The source is a live server; retry once on transient network errors.
      console.log(`   - ${name}: read failed (${String(e.message).slice(0, 80)}), retrying once ...`);
      await new Promise((r) => setTimeout(r, 1000));
      src = await source.execute({ sql: `SELECT * FROM ${quote(name)}` });
    }
    const rows = src.rows;

    if (rows.length === 0) {
      counts.push([name, 0]);
      continue;
    }

    const cols = Object.keys(rows[0]);
    // Only insert columns the current schema actually has; warn if the
    // source carries extras (e.g. a column dropped by a migration).
    const targetCols = new Set(
      (
        await target.execute({
          sql: `SELECT name FROM pragma_table_info(${lit(name)})`,
        })
      ).rows.map((r) => r.name),
    );
    const shared = cols.filter((c) => targetCols.has(c));
    const dropped = cols.filter((c) => !targetCols.has(c));

    if (dropped.length) {
      console.log(`   - ${name}: source columns not in current schema, skipped: ${dropped.join(", ")}`);
    }

    const colList = shared.map(quote).join(",");
    const placeholders = shared.map(() => "?").join(",");
    const stmts = rows.map((row) => ({
      sql: `INSERT INTO ${quote(name)} (${colList}) VALUES (${placeholders})`,
      // libSQL clients return undefined for missing columns; the native
      // driver rejects undefined arguments, so normalize to null.
      args: shared.map((c) => (row[c] === undefined ? null : row[c])),
    }));
    // Chunk so very large tables don't build one gigantic in-memory batch.
    const CHUNK = 500;
    for (let i = 0; i < stmts.length; i += CHUNK) {
      await target.batch(stmts.slice(i, i + CHUNK));
    }
    counts.push([name, rows.length]);
    console.log(`   - ${name}: ${rows.length} rows imported`);
  }

  console.log(`4/4 Verifying row counts against source ...`);
  let ok = true;
  for (const [name, expected] of counts) {
    const { rows } = await target.execute({ sql: `SELECT count(*) AS n FROM ${quote(name)}` });
    const actual = rows[0].n;
    const match = Number(actual) === expected;

    if (!match) {
      ok = false;
    }

    console.log(`   ${match ? "OK " : "MISMATCH"} ${name}: ${actual} (source ${expected})`);
  }

  console.log(ok ? `\nDone. Local dev database ready at ${outFile} (matches production row counts).` : `\nDone with mismatches — inspect the tables above.`);
  process.exitCode = ok ? 0 : 1;
} finally {
  source.close();
  target.close();
}
