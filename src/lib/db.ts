import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../db/schema";

function connect() {
  const url = process.env.DATABASE_URL ||
    (import.meta.env.DEV ? import.meta.env.DATABASE_URL : undefined);

  if (!url && import.meta.env.PROD) {
    throw new Error("DATABASE_URL is required in production");
  }

  const client = createClient({
    url: url || "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN ||
      (import.meta.env.DEV ? import.meta.env.DATABASE_AUTH_TOKEN : undefined),
  });

  return drizzle(client, { schema });
}

let database: ReturnType<typeof connect> | undefined;

// Prerendering imports auth and middleware without needing a database connection.
export const db = new Proxy({} as ReturnType<typeof connect>, {
  get(_target, property) {
    database ??= connect();
    const value = Reflect.get(database, property);

    return typeof value === "function" ? value.bind(database) : value;
  },
});

export * from "../../db/schema";
export { and, asc, desc, eq, gte, isNotNull, lt, or, sql } from "drizzle-orm";
