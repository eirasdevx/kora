import "server-only";

import { createHash } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "kora_session";

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
