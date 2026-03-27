import { NextRequest, NextResponse } from "next/server";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import { getClientMetadata } from "@/lib/server/request-metadata";
import { dispatchAssociationBackupEmail } from "@/lib/server/association-backup-service";

type BackupDispatchPayload = {
  force?: boolean;
};

export async function POST(request: NextRequest) {
  let payload: BackupDispatchPayload = {};

  try {
    payload = (await request.json()) as BackupDispatchPayload;
  } catch {
    payload = {};
  }

  try {
    const result = await dispatchAssociationBackupEmail({
      force: Boolean(payload.force),
      metadata: getClientMetadata(request),
    });

    if (payload.force && result.reason === "not_admin") {
      return NextResponse.json(
        {
          error: "Solo un administrador puede enviar la copia de seguridad.",
          ...result,
        },
        { status: 403 }
      );
    }

    if (payload.force && result.reason === "send_failed") {
      return NextResponse.json(
        {
          error: result.error ?? "No se pudo enviar la copia de seguridad.",
          ...result,
        },
        { status: 400 }
      );
    }

    if (payload.force && result.reason === "missing_recipient") {
      return NextResponse.json(
        {
          error: result.error ?? "Configura un correo de destino.",
          ...result,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ??
          (error instanceof Error
            ? error.message
            : "No se pudo procesar la copia de seguridad."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
