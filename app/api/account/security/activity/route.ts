import { NextResponse } from "next/server";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import { listCurrentUserSecurityActivity } from "@/lib/server/session-service";

export async function GET() {
  try {
    const activity = await listCurrentUserSecurityActivity();
    return NextResponse.json({ activity });
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ??
          (error instanceof Error
            ? error.message
            : "No se pudo recuperar la actividad de seguridad."),
      },
      { status: publicDatabaseError?.status ?? 400 }
    );
  }
}
