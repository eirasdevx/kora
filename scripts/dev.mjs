import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const commandShell = process.env.ComSpec || "cmd.exe";

const envFiles = [
  ".env.development.local",
  ".env.local",
  ".env.development",
  ".env",
];

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const readDatabaseUrl = () => {
  let localDatabaseUrl = process.env.LOCAL_DATABASE_URL;
  let hostedDatabaseUrl = process.env.DATABASE_URL;

  for (const fileName of envFiles) {
    const filePath = path.join(rootDir, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const normalizedValue = stripWrappingQuotes(rawValue);

      if (key === "LOCAL_DATABASE_URL") {
        localDatabaseUrl = normalizedValue;
      }

      if (key === "DATABASE_URL") {
        hostedDatabaseUrl = normalizedValue;
      }
    }
  }

  return process.env.VERCEL ? hostedDatabaseUrl ?? localDatabaseUrl : localDatabaseUrl ?? hostedDatabaseUrl;
};

const spawnCommand = (command, args, extraOptions = {}) => {
  if (isWindows) {
    return spawn(commandShell, ["/d", "/s", "/c", [command, ...args].join(" ")], {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
      ...extraOptions,
    });
  }

  return spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    ...extraOptions,
  });
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawnCommand(command, args);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });

const spawnNextDev = () => {
  const child = spawnCommand(npxCommand, ["next", "dev"]);

  const stopChild = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => stopChild("SIGINT"));
  process.on("SIGTERM", () => stopChild("SIGTERM"));

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
};

const main = async () => {
  const databaseUrl = readDatabaseUrl();

  if (databaseUrl?.startsWith("prisma+postgres://")) {
    try {
      await run(npxCommand, ["prisma", "dev", "--detach"]);
    } catch (error) {
      console.warn(
        "[kora] No se pudo arrancar prisma dev automáticamente. " +
          "Si usas la base local de Prisma, ejecuta 'npx prisma dev --detach' en otra terminal."
      );
      if (error instanceof Error) {
        console.warn(error.message);
      }
    }
  }

  spawnNextDev();
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
