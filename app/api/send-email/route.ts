import { NextRequest, NextResponse } from "next/server";
import {
  buildAssociationEmailPayload,
  sendEmailBatch,
  type SendEmailPayload,
} from "@/lib/server/email-delivery";
import { getCurrentSessionContext } from "@/lib/server/session-service";

export const runtime = "nodejs";

type RouteSendEmailPayload = SendEmailPayload & {
  useCurrentAssociation?: boolean;
};

const EMPTY_RESPONSE = {
  success: false,
  sentCount: 0,
  failedCount: 0,
};

export async function POST(req: NextRequest) {
  let payload: RouteSendEmailPayload;

  try {
    payload = (await req.json()) as RouteSendEmailPayload;
  } catch {
    return NextResponse.json(EMPTY_RESPONSE, { status: 400 });
  }

  try {
    const deliveryPayload = payload.useCurrentAssociation
      ? await (async () => {
          const context = await getCurrentSessionContext();
          if (!context) {
            throw new Error("No hay una sesión activa.");
          }

          return buildAssociationEmailPayload({
            associationName: context.membership.association.name,
            contactEmail: context.membership.association.contactEmail,
            messagingSettings: context.membership.association.messagingSettings,
            recipients: payload.recipients,
            subject: payload.subject,
            htmlMessage: payload.htmlMessage,
            globalVariables: payload.globalVariables,
          });
        })()
      : payload;

    const result = await sendEmailBatch(deliveryPayload);

    return NextResponse.json(result, {
      status: result.success ? 200 : 207,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ...EMPTY_RESPONSE,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo enviar el correo.",
      },
      { status: 400 }
    );
  }
}
