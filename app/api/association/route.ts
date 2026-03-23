import { NextRequest, NextResponse } from "next/server";
import type { AssociationMessagingSettings } from "@/core/messaging/settings";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import {
  createAssociationForCurrentUser,
  deleteCurrentAssociation,
  switchCurrentAssociation,
  updateCurrentAssociation,
} from "@/lib/server/session-service";

type AssociationPostPayload =
  | {
      action: "create";
      name?: string;
      logoUrl?: string;
      taxId?: string;
      phone?: string;
      contactEmail?: string;
      location?: string;
      address?: string;
    }
  | {
      action: "switch";
      associationId?: string;
    };

type AssociationPayload = {
  name?: string;
  logoUrl?: string;
  taxId?: string;
  phone?: string;
  contactEmail?: string;
  location?: string;
  address?: string;
  membershipSettings?: unknown;
  messagingSettings?: Partial<AssociationMessagingSettings>;
  representatives?: Array<{
    id: string;
    role: string;
    name: string;
    email?: string;
    phone?: string;
  }>;
};

export async function POST(request: NextRequest) {
  let payload: AssociationPostPayload;

  try {
    payload = (await request.json()) as AssociationPostPayload;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    if (payload.action === "switch") {
      if (!payload.associationId) {
        return NextResponse.json(
          { error: "Selecciona una asociación." },
          { status: 400 }
        );
      }

      const session = await switchCurrentAssociation(payload.associationId);
      return NextResponse.json(session);
    }

    if (!payload.name) {
      return NextResponse.json(
        { error: "El nombre de la asociación es obligatorio." },
        { status: 400 }
      );
    }

    const session = await createAssociationForCurrentUser({
      name: payload.name,
      logoUrl: payload.logoUrl,
      taxId: payload.taxId,
      phone: payload.phone,
      contactEmail: payload.contactEmail,
      location: payload.location,
      address: payload.address,
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
            : "No se pudo procesar la asociación."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let payload: AssociationPayload;

  try {
    payload = (await request.json()) as AssociationPayload;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    const session = await updateCurrentAssociation(payload);

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
            : "No se pudo actualizar la asociación."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}

export async function DELETE() {
  try {
    await deleteCurrentAssociation();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ??
          (error instanceof Error
            ? error.message
            : "No se pudo eliminar la asociación."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
