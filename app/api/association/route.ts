import { NextRequest, NextResponse } from "next/server";
import { deleteCurrentAssociation, updateCurrentAssociation } from "@/lib/server/session-service";

type AssociationPayload = {
  name?: string;
  logoUrl?: string;
  taxId?: string;
  phone?: string;
  contactEmail?: string;
  location?: string;
  address?: string;
  membershipSettings?: unknown;
  representatives?: Array<{
    id: string;
    role: string;
    name: string;
    email?: string;
    phone?: string;
  }>;
};

export async function PATCH(request: NextRequest) {
  let payload: AssociationPayload;

  try {
    payload = (await request.json()) as AssociationPayload;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  if (!payload.name) {
    return NextResponse.json(
      { error: "El nombre de la asociación es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const session = await updateCurrentAssociation(payload as Required<Pick<AssociationPayload, "name">> & AssociationPayload);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la asociación.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    await deleteCurrentAssociation();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la asociación.",
      },
      { status: 400 }
    );
  }
}
