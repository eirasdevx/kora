import { NextRequest, NextResponse } from "next/server";
import type { PasswordDigest } from "@/core/security/passwords";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import { getClientMetadata } from "@/lib/server/request-metadata";
import { updateCurrentUserSecurity } from "@/lib/server/session-service";

type SecurityPayload = {
  currentPassword?: string;
  newPasswordDigest?: PasswordDigest;
  twoFactor?: {
    enabled: boolean;
    secret?: string;
  };
};

export async function PATCH(request: NextRequest) {
  let payload: SecurityPayload;

  try {
    payload = (await request.json()) as SecurityPayload;
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  if (!payload.currentPassword) {
    return NextResponse.json(
      { error: "La contrasena actual es obligatoria." },
      { status: 400 }
    );
  }

  try {
    const session = await updateCurrentUserSecurity({
      currentPassword: payload.currentPassword,
      newPasswordDigest: payload.newPasswordDigest,
      twoFactor: payload.twoFactor,
      metadata: getClientMetadata(request),
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ??
          (error instanceof Error
            ? error.message
            : "No se pudo actualizar la seguridad."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
