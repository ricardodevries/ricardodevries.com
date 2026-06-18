export type AuthProviderId = "github" | "microsoft";

export interface PublicAuthProvider {
  id: AuthProviderId;
  label: string;
}

interface AuthProviderDefinition extends PublicAuthProvider {
  clientIdEnv: keyof ImportMetaEnv;
  clientSecretEnv: keyof ImportMetaEnv;
}

const authProviderDefinitions: AuthProviderDefinition[] = [
  {
    id: "github",
    label: "GitHub",
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
  },
  {
    id: "microsoft",
    label: "Microsoft",
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
];

export function getEnv(name: keyof ImportMetaEnv): string | undefined {
  return process.env[name] || import.meta.env[name] || undefined;
}

export function getConfiguredAuthProviderDefinitions(): AuthProviderDefinition[] {
  return authProviderDefinitions.filter(
    (provider) =>
      getEnv(provider.clientIdEnv) && getEnv(provider.clientSecretEnv),
  );
}

export function getConfiguredAuthProviders(): PublicAuthProvider[] {
  return getConfiguredAuthProviderDefinitions().map(({ id, label }) => ({
    id,
    label,
  }));
}

export function getAuthProviderCredentials(
  provider: AuthProviderDefinition,
): { clientId: string; clientSecret: string } | null {
  const clientId = getEnv(provider.clientIdEnv);
  const clientSecret = getEnv(provider.clientSecretEnv);

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}
