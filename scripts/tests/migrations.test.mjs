import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATE = join(root, "scripts", "migrate.mjs");

const BASELINE_HASH =
  "60a0837e6fa1dab26a4e34f8bf1aa614347465110f34df8ed0b02f6293aabb6c";
const BASELINE_WHEN = 1787923245906;

/** Pre-0001 Comments indexes (the old, createdAt-leading ones). */
const OLD_COMMENTS_INDEXES = [
  `CREATE INDEX "Comments_createdAt_postSlug_status_idx" ON "Comments" ("createdAt","postSlug","status")`,
  `CREATE INDEX "Comments_createdAt_parentId_postSlug_idx" ON "Comments" ("createdAt","parentId","postSlug")`,
  `CREATE INDEX "Comments_authorUserId_createdAt_idx" ON "Comments" ("authorUserId","createdAt")`,
];

/** The table DDL exactly as the `@astrojs/db`-managed production database had
 *  it before the manual better-auth-1.7 DDL: pre-1.7 AuthAccount (no issuer
 *  column). */
const LEGACY_TABLES = [
  `CREATE TABLE "Analytics" ("id" text PRIMARY KEY NOT NULL, "date" text NOT NULL, "path" text NOT NULL, "referrer" text, "botName" text, "flag" text, "country" text, "city" text, "fingerprint" text)`,
  `CREATE TABLE "AuthAccount" ("id" text PRIMARY KEY NOT NULL, "userId" text NOT NULL, "accountId" text NOT NULL, "providerId" text NOT NULL, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" text, "refreshTokenExpiresAt" text, "scope" text, "createdAt" text NOT NULL, "updatedAt" text NOT NULL)`,
  `CREATE TABLE "AuthSession" ("id" text PRIMARY KEY NOT NULL, "userId" text NOT NULL, "token" text NOT NULL, "expiresAt" text NOT NULL, "ipAddress" text, "userAgent" text, "createdAt" text NOT NULL, "updatedAt" text NOT NULL)`,
  `CREATE TABLE "AuthUser" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL, "emailVerified" integer DEFAULT FALSE NOT NULL, "image" text, "createdAt" text NOT NULL, "updatedAt" text NOT NULL)`,
  `CREATE TABLE "AuthVerification" ("id" text PRIMARY KEY NOT NULL, "identifier" text NOT NULL, "value" text NOT NULL, "expiresAt" text NOT NULL, "createdAt" text NOT NULL, "updatedAt" text NOT NULL)`,
  `CREATE TABLE "Comments" ("id" text PRIMARY KEY NOT NULL, "postSlug" text NOT NULL, "parentId" text, "authorUserId" text NOT NULL, "authorName" text NOT NULL, "authorImage" text, "body" text NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "moderatedByUserId" text, "moderatedAt" text, "createdAt" text NOT NULL, "updatedAt" text NOT NULL)`,
  `CREATE TABLE "Views" ("id" text PRIMARY KEY NOT NULL, "count" integer DEFAULT 1 NOT NULL)`,
  `CREATE TABLE "Visitors" ("id" text PRIMARY KEY NOT NULL, "postId" text NOT NULL, "fingerprint" text, "date" text NOT NULL)`,
];

/** AuthAccount after the manual better-auth-1.7 DDL (issuer column added). */
const POST_DDL_ACCOUNT =
  `CREATE TABLE "AuthAccount" ("id" text PRIMARY KEY NOT NULL, "userId" text NOT NULL, "accountId" text NOT NULL, "providerId" text NOT NULL, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" text, "refreshTokenExpiresAt" text, "scope" text, "createdAt" text NOT NULL, "updatedAt" text NOT NULL, "issuer" text)`;

const ACCOUNT_INDEXES_POST_DDL = [
  `CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount" ("userId")`,
  `CREATE UNIQUE INDEX "AuthAccount_accountId_issuer_idx" ON "AuthAccount" ("accountId", "issuer")`,
];

/** Indexes on the non-account tables, as created by the original schema. */
const OTHER_INDEXES = [
  `CREATE UNIQUE INDEX "AuthSession_token_unique" ON "AuthSession" ("token")`,
  `CREATE INDEX "AuthSession_userId_idx" ON "AuthSession" ("userId")`,
  `CREATE UNIQUE INDEX "AuthUser_email_unique" ON "AuthUser" ("email")`,
  `CREATE INDEX "AuthVerification_identifier_idx" ON "AuthVerification" ("identifier")`,
];

const OTHER_TABLES = LEGACY_TABLES.filter((s) => !s.includes('"AuthAccount"'));

function makeDb(name) {
  const dir = mkdtempSync(join(tmpdir(), `migrations-test-${name}-`));
  const file = join(dir, `${name}.db`);

  return { file, url: `file:${file}`, dir };
}

function runMigrate(url, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [MIGRATE, ...extraArgs],
    { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" },
  );
}

async function seed(url, statements) {
  const c = createClient({ url });
  try {
    if (statements.length) {
      await c.batch(statements.map((sql) => ({ sql })));
    }

    return c;
  } catch (e) {
    c.close();
    throw e;
  }
}

async function inspect(url) {
  const c = createClient({ url });
  const tables = (await c.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )).rows;
  const indexes = (await c.execute(
    "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )).rows;
  const migrations = (await c.execute(
    "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
  )).rows;

  return { tables, indexes, migrations };
}

async function columnNames(c, table) {
  const result = await c.execute({ sql: `PRAGMA table_info(${table})` });

  return result.rows.map((r) => r.name);
}

/** Seed a database matching the VERIFIED current production state before
 *  migration 0001/0002 are applied: the manual better-auth-1.7 DDL has
 *  already added the `issuer` column and the (accountId, issuer) unique
 *  index; the old createdAt-leading Comments indexes are still present; the
 *  __drizzle_migrations baseline row recorded on 2026-08-28 is present. The
 *  single real AuthAccount row is legacy (issuer NULL). */
async function seedProductionShape(url) {
  const statements = [
    ...OTHER_TABLES,
    POST_DDL_ACCOUNT,
    ...ACCOUNT_INDEXES_POST_DDL,
    ...OTHER_INDEXES,
    ...OLD_COMMENTS_INDEXES,
    `CREATE TABLE "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
    `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ('${BASELINE_HASH}', ${BASELINE_WHEN})`,
    // The one real account row: legacy, issuer NULL (created pre-1.7).
    `INSERT INTO "AuthUser" (id, name, email, emailVerified, image, createdAt, updatedAt) VALUES ('u1', 'Test User', 'user@example.com', 1, NULL, '2026-07-04T20:44:12.000Z', '2026-07-04T20:44:12.000Z')`,
    `INSERT INTO "AuthAccount" (id, userId, accountId, providerId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, createdAt, updatedAt, issuer) VALUES ('a1', 'u1', '78354174', 'github', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-04T20:44:13.000Z', '2026-07-04T20:44:13.000Z', NULL)`,
  ];
  const c = await seed(url, statements);
  c.close();
}

test("fresh database bootstraps to the final schema", async () => {
  const { url, dir } = makeDb("fresh");
  try {
    const r = runMigrate(url);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const { tables, indexes, migrations } = await inspect(url);
    assert.deepEqual(
      tables.map((t) => t.name).sort(),
      ["Analytics", "AuthAccount", "AuthSession", "AuthUser", "AuthVerification", "Comments", "Views", "Visitors", "__drizzle_migrations"].sort(),
    );
    const indexNames = indexes.map((i) => i.name);
    assert.ok(indexNames.includes("Comments_postSlug_status_createdAt_idx"));
    assert.ok(indexNames.includes("Comments_authorUserId_createdAt_idx"));
    assert.ok(indexNames.includes("AuthAccount_accountId_issuer_idx"));
    assert.ok(!indexNames.includes("Comments_createdAt_postSlug_status_idx"));
    assert.ok(!indexNames.includes("Comments_createdAt_parentId_postSlug_idx"));
    assert.equal(migrations.length, 3);
    assert.equal(migrations[0].created_at, BASELINE_WHEN);

    // Re-running is a no-op.
    const r2 = runMigrate(url);
    assert.equal(r2.status, 0, r2.stdout + r2.stderr);
    const after = await inspect(url);
    assert.equal(after.migrations.length, 3);
    assert.deepEqual(after.indexes.map((i) => i.name), indexNames);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production-shaped database (baselined 0000, legacy AuthAccount) migrates without re-running 0000", async () => {
  const { url, dir } = makeDb("prod");
  try {
    await seedProductionShape(url);
    const r = runMigrate(url);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const { indexes, migrations } = await inspect(url);
    // 0000 was skipped (baseline row); 0001 + 0002 applied.
    assert.equal(migrations.length, 3);
    assert.equal(migrations[0].hash, BASELINE_HASH);
    assert.equal(migrations[0].created_at, BASELINE_WHEN);
    const indexNames = indexes.map((i) => i.name);
    assert.ok(indexNames.includes("Comments_postSlug_status_createdAt_idx"));
    assert.ok(!indexNames.includes("Comments_createdAt_postSlug_status_idx"));
    assert.ok(!indexNames.includes("Comments_createdAt_parentId_postSlug_idx"));

    // 0002 backfilled the legacy NULL-issuer account so better-auth 1.7
    // lookups (issuer = 'local:oauth:github') resolve to the existing user.
    const c = createClient({ url });
    const accounts = (
      await c.execute("SELECT issuer, providerId, accountId FROM AuthAccount")
    ).rows;
    c.close();
    assert.deepEqual(accounts, [
      { issuer: "local:oauth:github", providerId: "github", accountId: "78354174" },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("existing database without Drizzle history refuses plain migrate, bootstraps with --baseline", async () => {
  const { url, dir } = makeDb("adopt");
  try {
    // Legacy tables + old indexes, no __drizzle_migrations, no issuer column.
    const c = await seed(url, [...LEGACY_TABLES, ...OLD_COMMENTS_INDEXES]);
    await c.batch([
      { sql: `INSERT INTO "AuthUser" (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('u1', 'Test User', 'user@example.com', 1, '2026-07-04T20:44:12.000Z', '2026-07-04T20:44:12.000Z')` },
      { sql: `INSERT INTO "AuthAccount" (id, userId, accountId, providerId, createdAt, updatedAt) VALUES ('a1', 'u1', '78354174', 'github', '2026-07-04T20:44:13.000Z', '2026-07-04T20:44:13.000Z')` },
    ]);
    c.close();

    // Plain migrate: clean refusal, no partial changes.
    const refused = runMigrate(url);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr + refused.stdout, /--baseline/);
    {
      const c = createClient({ url });
      const cols = await columnNames(c, "AuthAccount");
      c.close();
      assert.ok(!cols.includes("issuer"), "no schema changes should have been made on refusal");
    }

    // With --baseline: adds the issuer column, records the baseline,
    // applies 0001 + 0002.
    const r = runMigrate(url, ["--baseline"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const check = createClient({ url });
    assert.ok((await columnNames(check, "AuthAccount")).includes("issuer"));
    const accounts = (
      await check.execute("SELECT issuer FROM AuthAccount")
    ).rows;
    check.close();
    assert.deepEqual(accounts, [{ issuer: "local:oauth:github" }]);

    const { indexes, migrations } = await inspect(url);
    assert.equal(migrations.length, 3);
    assert.ok(
      indexes.map((i) => i.name).includes("Comments_postSlug_status_createdAt_idx"),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--baseline is idempotent", async () => {
  const { url, dir } = makeDb("baseline-idem");
  try {
    await seedProductionShape(url);
    // Baseline row already present: --baseline must be a no-op on the row.
    const r = runMigrate(url, ["--baseline"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const { migrations } = await inspect(url);
    assert.equal(migrations.length, 3);
    const first = migrations.filter((m) => m.created_at === BASELINE_WHEN);
    assert.equal(first.length, 1, "baseline row must not be duplicated");
    assert.equal(first[0].hash, BASELINE_HASH);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--baseline verifies the recorded baseline hash and refuses on mismatch", async () => {
  const { url, dir } = makeDb("baseline-mismatch");
  try {
    // An existing application database (with history) whose recorded baseline
    // hash diverges from the 0000 file on disk. This is the corrupted-history
    // case from the review: --baseline must refuse rather than proceed.
    const c = await seed(url, [
      ...OTHER_TABLES,
      POST_DDL_ACCOUNT,
      ...ACCOUNT_INDEXES_POST_DDL,
      ...OTHER_INDEXES,
      ...OLD_COMMENTS_INDEXES,
      `CREATE TABLE "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', ${BASELINE_WHEN})`,
    ]);
    c.close();

    // --baseline: must detect the hash mismatch and refuse, without
    // touching the recorded row or applying any migration.
    const mismatch = runMigrate(url, ["--baseline"]);
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr + mismatch.stdout, /inconsistent with the files/);

    const check = createClient({ url });
    const mig = (await check.execute("SELECT hash, created_at FROM __drizzle_migrations")).rows;
    const comments = (await check.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Comments'")).rows;
    check.close();
    assert.equal(mig.length, 1, "no migration rows may be added");
    assert.equal(mig[0].hash, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", "recorded row must be untouched");
    assert.ok(comments.some((i) => i.name === "Comments_createdAt_postSlug_status_idx"), "0001 must not have run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fresh and production-shaped databases converge on the same schema", async () => {
  const fresh = makeDb("converge-fresh");
  const prod = makeDb("converge-prod");
  try {
    await seedProductionShape(prod.url);
    assert.equal(runMigrate(fresh.url).status, 0);
    assert.equal(runMigrate(prod.url).status, 0);

    const a = await inspect(fresh.url);
    const b = await inspect(prod.url);

    const ca = {};
    {
      const c = createClient({ url: fresh.url });
      for (const t of a.tables.filter((t) => t.name !== "__drizzle_migrations")) {
        ca[t.name] = await columnNames(c, t.name);
      }
      c.close();
    }
    const cb = {};
    {
      const c = createClient({ url: prod.url });
      for (const t of b.tables.filter((t) => t.name !== "__drizzle_migrations")) {
        cb[t.name] = await columnNames(c, t.name);
      }
      c.close();
    }

    assert.deepEqual(Object.keys(ca).sort(), Object.keys(cb).sort());
    for (const name of Object.keys(ca)) {
      // Compare column *sets*, not order: a production database adopted via
      // ALTER TABLE ADD COLUMN carries `issuer` as its last column, while a
      // fresh build creates it in schema order. Position is immaterial to the
      // app and the auth library (all lookups are by named column).
      assert.deepEqual(ca[name].sort(), cb[name].sort(), `column set of ${name} differs`);
    }
    assert.deepEqual(
      a.indexes.map((i) => `${i.tbl_name}.${i.name}`).sort(),
      b.indexes.map((i) => `${i.tbl_name}.${i.name}`).sort(),
      "index sets differ",
    );
  } finally {
    rmSync(fresh.dir, { recursive: true, force: true });
    rmSync(prod.dir, { recursive: true, force: true });
  }
});
