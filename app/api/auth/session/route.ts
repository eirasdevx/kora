import { NextResponse } from "next/server";
import { getSessionBootstrap } from "@/lib/server/session-service";

export async function GET() {
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
}
