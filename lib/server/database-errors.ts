import { getConfiguredDatabaseUrl } from "@/lib/database-url";

type PublicDatabaseError = {
  message: string;
  status: number;
};

const looksLikeSupabaseDirectUrl = (value?: string) =>
  typeof value === "string" &&
  /@db\.[a-z0-9-]+\.supabase\.co:5432/i.test(value);

export function getPublicDatabaseError(
  error: unknown
): PublicDatabaseError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message;

  if (message.includes("Invalid URL")) {
    return {
      message:
        "La DATABASE_URL no es válida. Revisa la contraseña y codifica caracteres especiales como #, $ o +.",
      status: 500,
    };
  }

  if (message.includes("Can't reach database server at")) {
    if (looksLikeSupabaseDirectUrl(getConfiguredDatabaseUrl())) {
      return {
        message:
          "Tu entorno local no está alcanzando la conexión directa de Supabase. En Supabase > Connect copia la cadena 'Session pooler' (puerto 5432) y úsala como DATABASE_URL en .env.local.",
        status: 503,
      };
    }

    return {
      message:
        "No se puede conectar con la base de datos. Revisa DATABASE_URL y que el servidor esté accesible.",
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

  return null;
}
