import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "kora_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ? null;
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
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
