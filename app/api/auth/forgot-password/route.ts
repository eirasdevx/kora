import { NextRequest, NextResponse } from "next/server";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import { getClientMetadata } from "@/lib/server/request-metadata";
import { sendTemporaryPasswordByEmail } from "@/lib/server/session-service";

type ForgotPasswordPayload = {
  email?: string;
};

const GENERIC_SUCCESS_MESSAGE =
  "Si el correo está registrado en una asociación activa, recibirás una clave temporal en unos minutos.";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function POST(request: NextRequest) {
  let payload: ForgotPasswordPayload;

  try {
    payload = (await request.json()) as ForgotPasswordPayload;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Introduce un correo válido." },
      { status: 400 }
    );
  }

  try {
    const result = await sendTemporaryPasswordByEmail({
      email,
      metadata: getClientMetadata(request),
    });

    if (!result.userFound) {
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        result.deliveredAssociations > 1
          ? "Te hemos enviado una clave temporal desde tus asociaciones activas. Usa el código de la asociación correspondiente para iniciar sesión."
          : "Te hemos enviado una clave temporal. Usa también el código de tu asociación para iniciar sesión.",
    });
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ??
          (error instanceof Error
            ? error.message
            : "No se pudo enviar la clave temporal."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
