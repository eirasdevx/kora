import { NextRequest, NextResponse } from "next/server";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import { getClientMetadata } from "@/lib/server/request-metadata";
import { authenticateAssociationUser } from "@/lib/server/session-service";

type LoginPayload = {
  identifier?: string;
  password?: string;
  companyCode?: string;
  twoFactorCode?: string;
};

export async function POST(request: NextRequest) {
  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  if (!payload.identifier || !payload.password || !payload.companyCode) {
    return NextResponse.json(
      { error: "Completa usuario, contraseña y código de empresa." },
      { status: 400 }
    );
  }

  try {
    const result = await authenticateAssociationUser({
      identifier: payload.identifier,
      password: payload.password,
      companyCode: payload.companyCode,
      twoFactorCode: payload.twoFactorCode,
      metadata: getClientMetadata(request),
    });

    if ("twoFactorRequired" in result) {
      return NextResponse.json(result, { status: 409 });
    }

    if ("error" in result) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ?
          "No se pudo completar el inicio de sesión.",
      },
      { status: publicDatabaseError?.status ? 500 }
    );
  }
}
