import { config } from "@/config/app.config.js"
import jwt, { type SignOptions, type VerifyOptions } from "jsonwebtoken"
import type { StringValue } from "ms"

/**
 * 1st param: Payloads Types
 */

export type AccessTPayload = {
  userId: string
  sessionId: string
}

export type RefreshTPayload = {
  sessionId: string
}

/** 2nd param: Secret Options */

type SignedOptsAndSecret = SignOptions & {
  secret: string
}

/** 3rd param: Default options */
const defaults: SignOptions | VerifyOptions = {
  audience: ["user"],
}

/**
 * Options for accessToken and refreshToken from .env
 */
export const accessTokenSignOptions: SignedOptsAndSecret = {
  expiresIn: config.JWT.EXPIRES_IN as StringValue,
  secret: config.JWT.SECRET,
}

export const refreshTokenSignOptions: SignedOptsAndSecret = {
  expiresIn: config.JWT.REFRESH_EXPIRES_IN as StringValue,
  secret: config.JWT.REFRESH_SECRET,
}

/**
 *
 * @param payload sserId, sessionId
 * @param options secrets and expires_in
 * @returns token based params
 */
export const signJwtToken = (
  payload: AccessTPayload | RefreshTPayload,
  options?: SignedOptsAndSecret,
) => {
  /**
   * Get/destructure the secret and other opts for sign
   */
  const { secret, ...opts } = options || accessTokenSignOptions

  return jwt.sign(payload, secret, { ...(defaults as SignOptions), ...opts })
}

export const verifyJWTToken = <TPayload extends object = AccessTPayload>(
  token: string,
  options?: VerifyOptions & { secret: string },
) => {
  try {
    const { secret = config.JWT.SECRET, ...opts } = options || {}

    const payload = jwt.verify(token, secret, {
      ...(defaults as VerifyOptions),
      ...opts,
    }) as TPayload
    return { payload }
  } catch (error: any) {
    return { error: error.message }
  }
}
