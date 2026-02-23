// File: src/utils/auth-cookies.ts
// Purpose:
// Central place to manage secure HTTP-only JWT cookies for authentication.
// Ensures:
// - Tokens are protected against XSS (httpOnly)
// - Only sent over HTTPS in production (secure)
// - CSRF protection (sameSite)
// - Access token sent everywhere (path "/")
// - Refresh token sent only to /auth/refresh (restricted path)
// - Expiration dates sync with JWT lifetimes
// - Reusable, consistent, and easy to audit/maintain

import { config } from "@/config/app.config.js"
import type { CookieOptions, Response } from "express"
import { getExpirationDate } from "./date-time.js"

// ────────────────────────────────────────────────
// TYPE DEFINITION
// ────────────────────────────────────────────────

// Ensures correct arguments when calling setAuthCookies
type CookiePayloadType = {
  res: Response // Express response to set cookies on
  accessToken: string // Short-lived access JWT
  refreshToken: string // Long-lived refresh JWT
}

// ────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────

// Restricted path for refresh token cookie
// Security: browser only sends refresh token on /auth/refresh requests
// Prevents refresh token from leaking on other routes (defense in depth)
export const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`

// ────────────────────────────────────────────────
// SHARED COOKIE DEFAULTS
// ────────────────────────────────────────────────

// Base security flags applied to both access & refresh cookies
const defaults: CookieOptions = {
  httpOnly: true, // Prevents JavaScript access → anti-XSS
  secure: config.NODE_ENV === "production", // Only HTTPS in production
  sameSite: config.NODE_ENV === "production" ? "strict" : "lax", // Strong CSRF protection in prod
  // You can add domain, priority, etc. here later if needed
}

// ────────────────────────────────────────────────
// REFRESH TOKEN COOKIE OPTIONS
// ────────────────────────────────────────────────

// Creates options specifically for refresh token (longer life, restricted path)
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  // Fallback if env var missing → safe default
  const expiresIn = config.JWT.REFRESH_EXPIRES_IN ?? "7d"

  // Convert duration string → browser-compatible Date
  const expires = getExpirationDate(expiresIn)

  return {
    ...defaults, // Inherit security defaults
    expires, // Browser auto-expires cookie
    path: REFRESH_PATH, // Only sent to refresh endpoint → security win
  }
}

// ────────────────────────────────────────────────
// ACCESS TOKEN COOKIE OPTIONS
// ────────────────────────────────────────────────

// Options for access token (short-lived, sent on every request)
export const getAccessTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT.EXPIRES_IN ?? "15m" // fallback
  const expires = getExpirationDate(expiresIn)

  return {
    ...defaults,
    expires,
    path: "/", // Sent on all routes → required for auth
  }
}

// ────────────────────────────────────────────────
// SET COOKIES HELPER
// ────────────────────────────────────────────────

// Sets both cookies in one call
// Returns res so you can chain .status().json()
export const setAuthCookies = ({
  res,
  accessToken,
  refreshToken,
}: CookiePayloadType): Response =>
  res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions())

// ────────────────────────────────────────────────
// CLEAR COOKIES HELPER
// ────────────────────────────────────────────────

// Clears both auth cookies
// Must specify path for refreshToken to actually delete it
export const clearAuthCookies = (res: Response): Response =>
  res
    .clearCookie("accessToken", { path: "/" }) // matches how it was set
    .clearCookie("refreshToken", { path: REFRESH_PATH }) // must match exact path
