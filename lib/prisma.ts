import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
};

const resolveConnectionString = (value?: string) => {
  if (!value) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  if (
    value.startsWith("postgresql://") ||
    value.startsWith("postgres://")
  ) {
    return value;
  }

  if (!value.startsWith("prisma+postgres://")) {
    throw new Error(
      "Unsupported DATABASE_URL protocol. Use postgresql://, postgres://, or prisma+postgres://."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  const apiKey = parsed.searchParams.get("api_key");

  if (!apiKey) {
    throw new Error(
      "DATABASE_URL with prisma+postgres:// must include an api_key parameter."
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
      "Could not extract a PostgreSQL connection string from DATABASE_URL."
    );
  }
};

const connectionString = resolveConnectionString(process.env.DATABASE_URL);
const adapter = new PrismaPg({ connectionString });

const prisma = global.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
