import { NextRequest, NextResponse } from "next/server";
import type { PasswordDigest } from "@/core/security/passwords";
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
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  if (!payload.currentPassword) {
    return NextResponse.json(
      { error: "La contraseña actual es obligatoria." },
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la seguridad.",
      },
      { status: 400 }
    );
  }
}
