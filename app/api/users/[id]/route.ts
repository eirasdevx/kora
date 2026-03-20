import { NextRequest, NextResponse } from "next/server";
import type { PasswordDigest } from "@/core/security/passwords";
import type {
  UserPermissions,
  UserRole,
  UserStatus,
} from "@/core/users/users.store";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import {
  deleteAssociationMember,
  updateAssociationMember,
} from "@/lib/server/session-service";

type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  dni?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  photoUrl?: string;
  permissions?: UserPermissions;
  passwordDigest?: PasswordDigest;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  let payload: UpdateUserPayload;

  try {
    payload = (await request.json()) as UpdateUserPayload;
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  if (
    !payload.firstName ||
    !payload.lastName ||
    !payload.dni ||
    !payload.email ||
    !payload.role ||
    !payload.status
  ) {
    return NextResponse.json(
      { error: "Faltan datos para actualizar el usuario." },
      { status: 400 }
    );
  }

  const { id } = await context.params;

  try {
    const session = await updateAssociationMember(id, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      dni: payload.dni,
      email: payload.email,
      role: payload.role,
      status: payload.status,
      photoUrl: payload.photoUrl,
      permissions: payload.permissions,
      passwordDigest: payload.passwordDigest,
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
            : "No se pudo actualizar el usuario."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const session = await deleteAssociationMember(id);
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
            : "No se pudo eliminar el usuario."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
