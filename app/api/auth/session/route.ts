import { NextResponse } from "next/server";
import { getPublicDatabaseError } from "@/lib/server/database-errors";
import { getSessionBootstrap } from "@/lib/server/session-service";

export async function GET() {
  try {
    const payload = await getSessionBootstrap();

    if (!payload) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    const publicDatabaseError = getPublicDatabaseError(error);

    return NextResponse.json(
      {
        error:
          publicDatabaseError?.message ?
          "No se pudo recuperar la sesión actual.",
      },
      { status: publicDatabaseError?.status ? 500 }
    );
  }
}
