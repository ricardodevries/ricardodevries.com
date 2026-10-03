import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

// Deployment always supplies DATABASE_URL; development uses a local SQLite file.
export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:local.db",
  },
});
