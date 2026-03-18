import { NextRequest, NextResponse } from "next/server";
import type { PasswordDigest } from "@/core/security/passwords";
import { updateCurrentUserProfile } from "@/lib/server/session-service";

type ProfilePayload = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  passwordDigest?: PasswordDigest;
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      updates?: boolean;
      email?: boolean;
      browser?: boolean;
    };
  };
};

export async function PATCH(request: NextRequest) {
  let payload: ProfilePayload;

  try {
    payload = (await request.json()) as ProfilePayload;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  if (
    !payload.firstName ||
    !payload.lastName ||
    !payload.dni ||
    !payload.email ||
    !payload.preferences
  ) {
    return NextResponse.json(
      { error: "Faltan datos del perfil." },
      { status: 400 }
    );
  }

  try {
    const session = await updateCurrentUserProfile({
      firstName: payload.firstName,
      lastName: payload.lastName,
      dni: payload.dni,
      email: payload.email,
      phone: payload.phone,
      photoUrl: payload.photoUrl,
      passwordDigest: payload.passwordDigest,
      preferences: {
        language: payload.preferences.language ?? "es",
        timezone: payload.preferences.timezone ?? "(GMT+01:00) Madrid",
        notifications: {
          updates: Boolean(payload.preferences.notifications?.updates),
          email: Boolean(payload.preferences.notifications?.email),
          browser: Boolean(payload.preferences.notifications?.browser),
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el perfil.",
      },
      { status: 400 }
    );
  }
}
