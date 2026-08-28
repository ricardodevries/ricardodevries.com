import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Resolve the libSQL connection URL.
 *
 * `DATABASE_URL` is the preferred variable, but `ASTRO_DB_REMOTE_URL` is kept
 * as a fallback so existing production configuration keeps working after the
 * migration away from `@astrojs/db`. When neither is set (local development or
 * build time) a local file database is used.
 */
const url =
  process.env.DATABASE_URL ||
  process.env.ASTRO_DB_REMOTE_URL ||
  "file:local.db";

const authToken =
  process.env.DATABASE_AUTH_TOKEN || process.env.ASTRO_DB_APP_TOKEN || undefined;

export const db = drizzle(createClient({ url, authToken }), { schema });

export * from "./schema";

export {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
