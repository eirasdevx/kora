const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
};

export type DatabaseUrlSource = "DATABASE_URL" | "LOCAL_DATABASE_URL" | null;

export type DatabaseConnectionDiagnostics = {
  source: DatabaseUrlSource;
  environment: string;
  isProduction: boolean;
  hostname: string | null;
  port: string | null;
  databaseName: string | null;
  username: string | null;
  sslMode: string | null;
  isSupabase: boolean;
  isSupabasePooler: boolean;
  isSupabaseDirect: boolean;
  isLocalhost: boolean;
  usesSupabasePoolerBareUser: boolean;
};

const isLocalHostname = (value: string) =>
  value === "localhost" || value === "127.0.0.1" || value === "::1";

const isSupabaseHostname = (value: string) =>
  value.endsWith(".supabase.co") || value.endsWith(".supabase.com");

const finalizeConnectionString = (value: string) => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return value;
  }

  if (
    isSupabaseHostname(parsed.hostname) &&
    !parsed.searchParams.has("sslmode")
  ) {
    parsed.searchParams.set("sslmode", "require");
  }

  if (!parsed.searchParams.has("application_name")) {
    parsed.searchParams.set("application_name", "kora");
  }

  if (!parsed.searchParams.has("connect_timeout")) {
    parsed.searchParams.set("connect_timeout", "15");
  }

  return parsed.toString();
};

const readEnvValue = (value?: string) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const getConfiguredDatabaseUrlInfo = (
  env: NodeJS.ProcessEnv = process.env
) => {
  const environment = env.NODE_ENV ? "development";
  const isProduction = environment === "production";
  const hostedDatabaseUrl = readEnvValue(env.DATABASE_URL);
  const localDatabaseUrl = readEnvValue(env.LOCAL_DATABASE_URL);

  if (!isProduction && localDatabaseUrl) {
    return {
      value: localDatabaseUrl,
      source: "LOCAL_DATABASE_URL" as const,
      environment,
      isProduction,
    };
  }

  if (hostedDatabaseUrl) {
    return {
      value: hostedDatabaseUrl,
      source: "DATABASE_URL" as const,
      environment,
      isProduction,
    };
  }

  if (localDatabaseUrl) {
    return {
      value: localDatabaseUrl,
      source: "LOCAL_DATABASE_URL" as const,
      environment,
      isProduction,
    };
  }

  return {
    value: undefined,
    source: null,
    environment,
    isProduction,
  };
};

export const getConfiguredDatabaseUrl = (
  env: NodeJS.ProcessEnv = process.env
) => getConfiguredDatabaseUrlInfo(env).value;

export const resolveConnectionString = (value?: string) => {
  if (!value) {
    throw new Error(
      "A database URL is required. Set LOCAL_DATABASE_URL for local development or DATABASE_URL for hosted environments."
    );
  }

  if (value.startsWith("postgresql://") || value.startsWith("postgres://")) {
    return finalizeConnectionString(value);
  }

  if (!value.startsWith("prisma+postgres://")) {
    throw new Error(
      "Unsupported database URL protocol. Use postgresql://, postgres://, or prisma+postgres://."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("The configured database URL is not a valid URL.");
  }

  const apiKey = parsed.searchParams.get("api_key");

  if (!apiKey) {
    throw new Error(
      "A prisma+postgres:// URL must include an api_key query parameter."
    );
  }

  try {
    const decoded = decodeBase64Url(apiKey);
    const payload = JSON.parse(decoded) as {
      databaseUrl?: string;
    };

    if (
      !payload.databaseUrl ||
      (!payload.databaseUrl.startsWith("postgresql://") &&
        !payload.databaseUrl.startsWith("postgres://"))
    ) {
      throw new Error();
    }

    return finalizeConnectionString(payload.databaseUrl);
  } catch {
    throw new Error(
      "Could not extract a PostgreSQL connection string from the configured database URL."
    );
  }
};

export const inspectConnectionString = (
  value: string,
  source: DatabaseUrlSource = null,
  environment = process.env.NODE_ENV ? "development"
): DatabaseConnectionDiagnostics => {
  const parsed = new URL(value);
  const hostname = parsed.hostname.toLowerCase();
  const username = parsed.username || null;
  const isSupabase = isSupabaseHostname(hostname);
  const isSupabasePooler = hostname.includes(".pooler.supabase.com");
  const isSupabaseDirect =
    hostname.startsWith("db.") && hostname.endsWith(".supabase.co");

  return {
    source,
    environment,
    isProduction: environment === "production",
    hostname,
    port: parsed.port || null,
    databaseName: parsed.pathname.replace(/^\/+/, "") || null,
    username,
    sslMode: parsed.searchParams.get("sslmode"),
    isSupabase,
    isSupabasePooler,
    isSupabaseDirect,
    isLocalhost: isLocalHostname(hostname),
    usesSupabasePoolerBareUser:
      isSupabasePooler &&
      typeof username === "string" &&
      username.length > 0 &&
      !username.includes("."),
  };
};

export const getConfiguredDatabaseConnectionDiagnostics = (
  env: NodeJS.ProcessEnv = process.env
) => {
  const databaseUrl = getConfiguredDatabaseUrlInfo(env);

  if (!databaseUrl.value) {
    return null;
  }

  try {
    return inspectConnectionString(
      resolveConnectionString(databaseUrl.value),
      databaseUrl.source,
      databaseUrl.environment
    );
  } catch {
    return null;
  }
};

export const formatDatabaseTargetForLogs = (
  diagnostics: DatabaseConnectionDiagnostics | null
) => {
  if (!diagnostics) {
    return "source=unknown";
  }

  const provider =
    diagnostics.isSupabasePooler
      ? "supabase-pooler"
      : diagnostics.isSupabaseDirect
        ? "supabase-direct"
        : diagnostics.isSupabase
          ? "supabase"
          : "postgres";

  return [
    `source=${diagnostics.source ? "unknown"}`,
    `env=${diagnostics.environment}`,
    `host=${diagnostics.hostname ? "unknown"}`,
    `port=${diagnostics.port ? "default"}`,
    `database=${diagnostics.databaseName ? "default"}`,
    `sslmode=${diagnostics.sslMode ? "default"}`,
    `provider=${provider}`,
  ].join(" ");
};
