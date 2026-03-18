import { NextRequest, NextResponse } from "next/server";
import type { PasswordDigest } from "@/core/security/passwords";
import type { UserPermissions, UserRole, UserStatus } from "@/core/users/users.store";
import { createAssociationMember } from "@/lib/server/session-service";

type CreateUserPayload = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  email?: string;
  passwordDigest?: PasswordDigest;
  role?: UserRole;
  status?: UserStatus;
  photoUrl?: string;
  permissions?: UserPermissions;
};

export async function POST(request: NextRequest) {
  let payload: CreateUserPayload;

  try {
    payload = (await request.json()) as CreateUserPayload;
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
    !payload.passwordDigest ||
    !payload.role ||
    !payload.status
  ) {
    return NextResponse.json(
      { error: "Faltan datos para crear el usuario." },
      { status: 400 }
    );
  }

  try {
    const session = await createAssociationMember({
      firstName: payload.firstName,
      lastName: payload.lastName,
      dni: payload.dni,
      email: payload.email,
      passwordDigest: payload.passwordDigest,
      role: payload.role,
      status: payload.status,
      photoUrl: payload.photoUrl,
      permissions: payload.permissions,
    });

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el usuario.",
      },
      { status: 400 }
    );
  }
}
