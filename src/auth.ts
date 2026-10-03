import {
  db,
  AuthAccount,
  AuthSession,
  AuthUser,
  AuthVerification,
} from "@/lib/db";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import {
  getAuthProviderCredentials,
  getConfiguredAuthProviderDefinitions,
  getEnv,
} from "@/lib/auth-providers";

type SocialProviders = NonNullable<
  Parameters<typeof betterAuth>[0]["socialProviders"]
>;

const siteUrl = getEnv("BETTER_AUTH_URL") || "http://localhost:4321";
const authSecret =
  getEnv("BETTER_AUTH_SECRET") ||
  "local-development-better-auth-secret-change-before-production";

const socialProviders: SocialProviders = {};

for (const provider of getConfiguredAuthProviderDefinitions()) {
  const credentials = getAuthProviderCredentials(provider);

  if (credentials) {
    socialProviders[provider.id] = credentials;
  }
}

export const auth = betterAuth({
  baseURL: siteUrl,
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: AuthUser,
      session: AuthSession,
      account: AuthAccount,
      verification: AuthVerification,
    },
  }),
  socialProviders,
  trustedOrigins: [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "https://ricardodevries.com",
  ],
});
