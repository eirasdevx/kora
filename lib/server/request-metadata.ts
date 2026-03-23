import "server-only";

import type { NextRequest } from "next/server";
import type { ClientMetadata } from "@/lib/server/session-service";

export function getClientMetadata(request: NextRequest): ClientMetadata {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  return {
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}
