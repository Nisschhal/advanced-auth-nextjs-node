// File: src/utils/auth-cookies.ts (or similar)
// Purpose of this entire file:
// This file centralizes all logic for setting secure HTTP-only cookies for JWT tokens.
// It makes sure:
// - Tokens are stored safely (cannot be read by JavaScript → anti-XSS)
// - Cookies have proper security flags (secure, sameSite, httpOnly)
// - Access token is sent on every request (path "/")
// - Refresh token is sent ONLY to the refresh endpoint (restricted path)
// - Expiration dates match JWT lifetimes
// - Code is reusable, consistent, and easy to maintain

import { config } from "@/config/app.config.js"
import type { CookieOptions, Response } from "express"
import { getExpirationDate } from "./date-time.js"

// ────────────────────────────────────────────────
// TYPE DEFINITION
// ────────────────────────────────────────────────

// This type ensures that when we call setAuthCookies, we always pass
// the response object + both tokens.
// Helps catch mistakes early (TypeScript autocompletion + errors)
type CookiePayloadType = {
  res: Response // Express response object to set cookies on
  accessToken: string // Short-lived JWT for authentication
  refreshToken: string // Long-lived JWT for getting new access tokens
}

// ────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────

// Special path ONLY for refresh token cookie
// Security reason: browser will ONLY send refresh token cookie when user requests
// paths starting with /auth/refresh (or whatever BASE_PATH is)
// → greatly reduces attack surface: refresh token cannot be sent/leaked on other routes
export const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`

// ────────────────────────────────────────────────
// SHARED DEFAULT COOKIE SETTINGS
// ────────────────────────────────────────────────

// These flags are applied to BOTH access & refresh token cookies
// They are the foundation of secure cookie-based auth
const defaults: CookieOptions = {
  // httpOnly: true → most important flag
  // Reason: JavaScript (frontend code) cannot read or modify this cookie
  // → protects tokens from XSS attacks (even if attacker injects JS)
  httpOnly: true,

  // secure: true in production → cookie is only sent over HTTPS
  // Reason: prevents tokens from being sent over plain HTTP (sniffing on public Wi-Fi, MITM)
  // In development we allow false (localhost usually HTTP)
  secure: config.NODE_ENV === "production",

  // sameSite controls when cookie is sent on cross-site requests
  // "strict" in production = very strong CSRF protection (cookie never sent from other sites)
  // "lax" in dev = allows normal link clicking (better dev experience)
  // Reason: prevents CSRF attacks where evil.com tricks browser into sending cookie
  sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
}

// ────────────────────────────────────────────────
// REFRESH TOKEN COOKIE OPTIONS
// ────────────────────────────────────────────────

// Factory function: creates cookie settings specifically for refresh token
// Why separate? Refresh token is:
// - longer lived
// - more dangerous if leaked
// - should be sent ONLY to /auth/refresh endpoint
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  // Use env value or fallback to safe default if missing
  // Reason: prevents crashes / infinite expiry if env is not set
  const expiresIn = config.JWT.REFRESH_EXPIRES_IN ?? "7d"

  // Convert duration string ("7d") → actual Date object browser understands
  const expires = getExpirationDate(expiresIn)

  return {
    // Inherit all secure defaults (httpOnly, secure, sameSite)
    ...defaults,

    // Browser will delete cookie after this date
    // Matches refresh token JWT lifetime → keeps them in sync
    expires,

    // Critical security feature
    // Cookie is ONLY sent when browser requests /auth/refresh (or sub-paths)
    // → even if XSS happens elsewhere, refresh token cannot be sent to attacker
    path: REFRESH_PATH,
  }
}

// ────────────────────────────────────────────────
// ACCESS TOKEN COOKIE OPTIONS
// ────────────────────────────────────────────────

// Factory for access token cookie
// Why different? Access token is:
// - short-lived (usually 5–60 min)
// - needs to be sent on EVERY request (for protected routes)
export const getAccessTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT.EXPIRES_IN ?? "15m" // fallback
  const expires = getExpirationDate(expiresIn)

  return {
    ...defaults,
    expires, // browser auto-expires after ~15 min
    path: "/", // sent on ALL requests to your domain → required for auth
  }
}

// ────────────────────────────────────────────────
// MAIN HELPER FUNCTION
// ────────────────────────────────────────────────

// One-line helper to set BOTH cookies at once
// Returns the Response object so you can chain .status().json() after
// Usage in controller: setAuthCookies({ res, accessToken, refreshToken }).status(200).json(result)
export const setAuthCookies = ({
  res,
  accessToken,
  refreshToken,
}: CookiePayloadType): Response =>
  res
    // Set short-lived access token (used for all protected requests)
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())

    // Set long-lived refresh token (only used for /auth/refresh)
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions())
