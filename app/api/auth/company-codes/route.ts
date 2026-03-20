import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  buildAssociationEmailPayload,
  sendEmailBatch,
} from "@/lib/server/email-delivery";
import { getPublicDatabaseError } from "@/lib/server/database-errors";

type CompanyCodePayload = {
  identifier?: string;
};

const GENERIC_SUCCESS_MESSAGE =
  "Si la cuenta existe y tiene asociaciones activas, enviaremos un correo con sus codigos.";

type AssociationDelivery = {
  id: string;
  name: string;
  companyCode: string;
  contactEmail: string | null;
  messagingSettings: unknown;
};

export async function POST(request: NextRequest) {
  let payload: CompanyCodePayload;

  try {
    payload = (await request.json()) as CompanyCodePayload;
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const identifier = payload.identifier?.trim();
  if (!identifier) {
    return NextResponse.json(
      { error: "Introduce tu DNI o correo." },
      { status: 400 }
    );
  }

  try {
    const memberships = await prisma.associationUser.findMany({
      where: {
        deactivatedAt: null,
        user: {
          OR: [
            { email: identifier.toLowerCase() },
            { documentNumber: identifier.toUpperCase() },
          ],
        },
      },
      select: {
        associationId: true,
        user: {
          select: {
            email: true,
          },
        },
        association: {
          select: {
            id: true,
            name: true,
            companyCode: true,
            contactEmail: true,
            messagingSettings: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const recipientEmail = memberships[0]?.user.email?.trim().toLowerCase() ?? "";
    if (!recipientEmail) {
      return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    const associations = Array.from(
      memberships.reduce<Map<string, AssociationDelivery>>((acc, membership) => {
        if (!acc.has(membership.associationId)) {
          acc.set(membership.associationId, {
            id: membership.association.id,
            name: membership.association.name,
            companyCode: membership.association.companyCode,
            contactEmail: membership.association.contactEmail,
            messagingSettings: membership.association.messagingSettings,
          });
        }
        return acc;
      }, new Map()).values()
    ).sort((left, right) => left.name.localeCompare(right.name, "es"));

    for (const association of associations) {
      try {
        await sendEmailBatch(
          buildAssociationEmailPayload({
            associationName: association.name,
            contactEmail: association.contactEmail,
            messagingSettings: association.messagingSettings,
            recipients: [recipientEmail],
            subject: `Codigo de acceso a ${association.name} en Kora`,
            htmlMessage: `
              <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
                <h2>Codigo de asociacion</h2>
                <p>Has solicitado recordar el codigo de acceso de tu asociacion en Kora.</p>
                <div style="margin: 16px 0; padding: 16px; border: 1px solid #dbeafe; border-radius: 12px; background: #f8fbff;">
                  <p style="margin: 0 0 8px;"><strong>Asociacion:</strong> ${association.name}</p>
                  <p style="margin: 0; letter-spacing: 0.08em;"><strong>Codigo:</strong> ${association.companyCode}</p>
                </div>
                <p>Si no solicitaste este correo, puedes ignorarlo.</p>
              </div>
            `,
          })
        );
      } catch (deliveryError) {
        console.error(
          `[company-codes] ${association.id}:`,
          deliveryError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ??
          "No se pudieron recuperar los codigos de asociacion.",
      },
      { status: publicDatabaseError?.status ?? 500 }
    );
  }
}
