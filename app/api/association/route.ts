import { NextRequest, NextResponse } from "next/server";
import type { AssociationMessagingSettings } from "@/core/messaging/settings";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import {
  deleteCurrentAssociation,
  updateCurrentAssociation,
} from "@/lib/server/session-service";

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

export async function PATCH(request: NextRequest) {
  let payload: AssociationPayload;

  try {
    payload = (await request.json()) as AssociationPayload;
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
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
            : "No se pudo actualizar la asociacion."),
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
            : "No se pudo eliminar la asociacion."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
