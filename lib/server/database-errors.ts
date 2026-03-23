import {
  formatDatabaseTargetForLogs,
  getConfiguredDatabaseConnectionDiagnostics,
  getConfiguredDatabaseUrlInfo,
} from "@/lib/database-url";

type PublicDatabaseError = {
  message: string;
  status: number;
};

const hasErrorCode = (error: unknown, code: string) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === code;

export function getPublicDatabaseError(
  error: unknown
): PublicDatabaseError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message;
  const databaseUrl = getConfiguredDatabaseUrlInfo();
  const databaseDiagnostics = getConfiguredDatabaseConnectionDiagnostics();

  if (message.includes("Invalid URL")) {
    return {
      message:
        "La DATABASE_URL no es válida. Revisa la contraseña y codifica caracteres especiales como #, $ o +.",
      status: 500,
    };
  }

  if (
    hasErrorCode(error, "P1000") ||
    message.includes("Authentication failed against database server")
  ) {
    if (
      databaseUrl.isProduction &&
      databaseUrl.source === "LOCAL_DATABASE_URL"
    ) {
      return {
        message:
          "El deploy está usando LOCAL_DATABASE_URL porque falta DATABASE_URL. Configura DATABASE_URL en tu hosting con la base publicada y vuelve a desplegar.",
        status: 503,
      };
    }

    if (databaseDiagnostics?.usesSupabasePoolerBareUser) {
      return {
        message:
          "La base rechazó las credenciales. Si usas Supabase Session pooler, pega en DATABASE_URL la URL completa de 'Session pooler'. Ese host no suele funcionar con el usuario simple 'postgres', sino con el usuario completo que entrega Supabase.",
        status: 503,
      };
    }

    if (databaseDiagnostics?.isSupabasePooler) {
      return {
        message:
          "La base rechazó las credenciales. Revisa DATABASE_URL en tu hosting y vuelve a copiar la URL completa de Supabase > Connect > Session pooler, incluyendo usuario, contraseña y sslmode=require.",
        status: 503,
      };
    }

    return {
      message:
        "La base de datos respondió pero rechazó las credenciales. Revisa DATABASE_URL en el hosting y confirma que el usuario y la contraseña sigan siendo válidos.",
      status: 503,
    };
  }

  if (
    hasErrorCode(error, "P1001") ||
    message.includes("Can't reach database server at")
  ) {
    if (
      databaseUrl.isProduction &&
      databaseUrl.source === "LOCAL_DATABASE_URL"
    ) {
      return {
        message:
          "El despliegue está usando LOCAL_DATABASE_URL en producción porque falta DATABASE_URL. Configura DATABASE_URL en tu hosting con la base de datos publicada y vuelve a desplegar.",
        status: 503,
      };
    }

    if (databaseDiagnostics?.isSupabaseDirect) {
      return {
        message:
          "Tu entorno no está alcanzando la conexión directa de Supabase. En Supabase > Connect copia la cadena 'Session pooler' (puerto 5432) y úsala como DATABASE_URL.",
        status: 503,
      };
    }

    return {
      message:
        "No se puede conectar con la base de datos. Revisa DATABASE_URL y que el servidor este accesible.",
      status: 503,
    };
  }

  if (
    hasErrorCode(error, "ECONNREFUSED") ||
    message.includes("ECONNREFUSED") ||
    message.includes("connect ECONNREFUSED")
  ) {
    if (databaseDiagnostics?.isLocalhost) {
      return {
        message:
          "La base local no está iniciada o no acepta conexiones. Arranca la app con 'npm run dev' o levanta tu Postgres local y reinicia Next.",
        status: 503,
      };
    }

    return {
      message:
        "No se puede conectar con la base de datos. Revisa DATABASE_URL y que el servidor este accesible.",
      status: 503,
    };
  }

  if (message.includes("self-signed certificate in certificate chain")) {
    return {
      message:
        "La conexión SSL a la base de datos ha sido rechazada por el certificado. Si usas Supabase Session pooler en local, añade 'uselibpqcompat=true&sslmode=require' a la DATABASE_URL y reinicia Next.",
      status: 503,
    };
  }

  if (
    message.includes("too many clients already") ||
    message.includes("remaining connection slots are reserved")
  ) {
    return {
      message:
        databaseDiagnostics?.isSupabase
          ? "La base ha rechazado nuevas conexiones por límite de clientes. Usa la URL de Session pooler en DATABASE_URL y reduce conexiones concurrentes en el deploy."
          : "La base ha rechazado nuevas conexiones por límite de clientes. Revisa el pool del deploy o habilita un pooler.",
      status: 503,
    };
  }

  if (
    databaseUrl.isProduction &&
    databaseUrl.source === "LOCAL_DATABASE_URL" &&
    (message.includes("LOCAL_DATABASE_URL") ||
      message.includes("localhost") ||
      message.includes("127.0.0.1"))
  ) {
    return {
      message:
        `El deploy está usando una URL local para la base de datos (${formatDatabaseTargetForLogs(databaseDiagnostics)}). Configura DATABASE_URL en tu hosting y vuelve a desplegar.`,
      status: 503,
    };
  }

  return null;
}
