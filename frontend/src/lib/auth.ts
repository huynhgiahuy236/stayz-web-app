"use server";
import { cookies } from "next/headers";
import type { User } from "./types";

const ACCESS_TOKEN_KEY = "stayz_access_token";
const REFRESH_TOKEN_KEY = "stayz_refresh_token";
const USER_KEY = "stayz_user";

// ─── Server-side cookie helpers ───────────────────────────────────────────────

export async function getServerTokens() {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_TOKEN_KEY)?.value ?? null,
    refreshToken: store.get(REFRESH_TOKEN_KEY)?.value ?? null,
  };
}

export async function getServerUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(USER_KEY)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function saveAuthCookies(accessToken: string, refreshToken: string, user: User) {
  const store = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  store.set(ACCESS_TOKEN_KEY, accessToken, { ...opts, maxAge: 60 * 15 }); // 15 min
  store.set(REFRESH_TOKEN_KEY, refreshToken, { ...opts, maxAge: 60 * 60 * 24 * 30 }); // 30 days
  store.set(USER_KEY, JSON.stringify(user), { ...opts, httpOnly: false, maxAge: 60 * 60 * 24 * 30 }); // readable by JS
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_KEY);
  store.delete(REFRESH_TOKEN_KEY);
  store.delete(USER_KEY);
}
