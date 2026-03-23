import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  formatDatabaseTargetForLogs,
  getConfiguredDatabaseConnectionDiagnostics,
  getConfiguredDatabaseUrlInfo,
  resolveConnectionString,
} from "@/lib/database-url";

declare global {
  var prisma: PrismaClient | undefined;
  var koraDatabaseConfigWarningShown: boolean | undefined;
  var koraDatabaseTargetShown: boolean | undefined;
}

const databaseUrl = getConfiguredDatabaseUrlInfo();
const databaseDiagnostics = getConfiguredDatabaseConnectionDiagnostics();

if (
  databaseUrl.isProduction &&
  databaseUrl.source === "LOCAL_DATABASE_URL" &&
  !global.koraDatabaseConfigWarningShown
) {
  console.error(
    "[kora] Production is using LOCAL_DATABASE_URL because DATABASE_URL is not set. Configure DATABASE_URL in the deployment environment and redeploy."
  );
  global.koraDatabaseConfigWarningShown = true;
}

if (databaseUrl.isProduction && !global.koraDatabaseTargetShown) {
  console.info(
    `[kora] Prisma target ${formatDatabaseTargetForLogs(databaseDiagnostics)}`
  );
  global.koraDatabaseTargetShown = true;
}

const connectionString = resolveConnectionString(databaseUrl.value);

const logDatabaseDriverError = (label: string, error: Error) => {
  console.error(
    `[kora] ${label}: ${error.message} (${formatDatabaseTargetForLogs(databaseDiagnostics)})`
  );
};

const adapter = new PrismaPg(
  {
    connectionString,
    max: databaseUrl.isProduction ? 5 : 10,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  },
  {
    onConnectionError: (error) => {
      logDatabaseDriverError("Prisma connection error", error);
    },
    onPoolError: (error) => {
      logDatabaseDriverError("Prisma pool error", error);
    },
  }
);

const prisma = global.prisma ? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
