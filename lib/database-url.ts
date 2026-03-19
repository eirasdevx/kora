const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
};

export const getConfiguredDatabaseUrl = (
  env: NodeJS.ProcessEnv = process.env
) => {
  if (!env.VERCEL && env.LOCAL_DATABASE_URL) {
    return env.LOCAL_DATABASE_URL;
  }

  return env.DATABASE_URL ?? env.LOCAL_DATABASE_URL;
};

export const resolveConnectionString = (value?: string) => {
  if (!value) {
    throw new Error(
      "A database URL is required. Set LOCAL_DATABASE_URL for local development or DATABASE_URL for hosted environments."
    );
  }

  if (value.startsWith("postgresql://") || value.startsWith("postgres://")) {
    return value;
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

    return payload.databaseUrl;
  } catch {
    throw new Error(
      "Could not extract a PostgreSQL connection string from the configured database URL."
    );
  }
};
