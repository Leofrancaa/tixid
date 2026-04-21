import { cookies } from "next/headers";

const COOKIE_PREFIX = "tixid_pt_";

export function playerCookieName(code: string) {
  return `${COOKIE_PREFIX}${code.toUpperCase()}`;
}

export async function readPlayerToken(code: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(playerCookieName(code))?.value ?? null;
}

export async function setPlayerTokenCookie(code: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(playerCookieName(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearPlayerTokenCookie(code: string) {
  const cookieStore = await cookies();
  cookieStore.delete(playerCookieName(code));
}
