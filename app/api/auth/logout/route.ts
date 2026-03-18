import { NextResponse } from "next/server";
import { logoutCurrentSession } from "@/lib/server/session-service";

export async function POST() {
  await logoutCurrentSession();
  return NextResponse.json({ success: true });
}
