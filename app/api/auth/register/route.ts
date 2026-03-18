import { NextRequest, NextResponse } from "next/server";
import type { PasswordDigest } from "@/core/security/passwords";
import { registerAssociationAdmin } from "@/lib/server/session-service";

type RegisterPayload = {
  admin?: {
    firstName?: string;
    lastName?: string;
    dni?: string;
    email?: string;
    passwordDigest?: PasswordDigest;
  };
  association?: {
    name?: string;
    logoUrl?: string;
    taxId?: string;
    contactEmail?: string;
    phone?: string;
    location?: string;
    address?: string;
  };
};

export async function POST(request: NextRequest) {
  let payload: RegisterPayload;

  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  if (
    !payload.admin?.firstName ||
    !payload.admin?.lastName ||
    !payload.admin?.dni ||
    !payload.admin?.email ||
    !payload.admin?.passwordDigest ||
    !payload.association?.name
  ) {
    return NextResponse.json(
      { error: "Faltan datos para registrar la asociación." },
      { status: 400 }
    );
  }

  try {
    const session = await registerAssociationAdmin({
      admin: {
        firstName: payload.admin.firstName,
        lastName: payload.admin.lastName,
        dni: payload.admin.dni,
        email: payload.admin.email,
        passwordDigest: payload.admin.passwordDigest,
      },
      association: {
        name: payload.association.name,
        logoUrl: payload.association.logoUrl,
        taxId: payload.association.taxId,
        contactEmail: payload.association.contactEmail,
        phone: payload.association.phone,
        location: payload.association.location,
        address: payload.association.address,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar el registro.",
      },
      { status: 400 }
    );
  }
}
