import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getConfiguredDatabaseUrl,
  resolveConnectionString,
} from "@/lib/database-url";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const connectionString = resolveConnectionString(getConfiguredDatabaseUrl());
const adapter = new PrismaPg({ connectionString });

const prisma = global.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
