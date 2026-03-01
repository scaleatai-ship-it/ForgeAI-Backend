import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import ms from "ms";
import { env } from "../config/env.js";

const ACCESS_COOKIE_NAME = "forge_access_token";
const REFRESH_COOKIE_NAME = "forge_refresh_token";

type TokenPayload = {
  userId: string;
  email: string;
  plan: string;
  isAdmin: boolean;
};

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]
  });
}

export function signRefreshToken(payload: Pick<TokenPayload, "userId" | "email">) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as Pick<TokenPayload, "userId" | "email">;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiryDate() {
  const milliseconds = ms(env.REFRESH_TOKEN_TTL);
  return new Date(Date.now() + milliseconds);
}

export function setAuthCookies(
  response: { cookie: (name: string, value: string, options: Record<string, unknown>) => void },
  accessToken: string,
  refreshToken: string
) {
  const secure = env.NODE_ENV === "production";

  response.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: Number(ms(env.ACCESS_TOKEN_TTL)),
    path: "/"
  });

  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: Number(ms(env.REFRESH_TOKEN_TTL)),
    path: "/"
  });
}

export function clearAuthCookies(
  response: { clearCookie: (name: string, options: Record<string, unknown>) => void }
) {
  response.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  response.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
}

export const authCookies = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME
};
