import type { Request } from "express"
import {
  ExtractJwt,
  type StrategyOptionsWithRequest,
  Strategy as JwtStrategy,
} from "passport-jwt"
import { UnauthorizedException } from "../utils/catch-errors.js"
import { ErrorCode } from "../enums/error-code.enum.js"
import { config } from "@/config/app.config.js"
import type { PassportStatic } from "passport"
import { userService } from "@/modules/user/user.module.js"
import passport from "passport"

interface JwtPayload {
  userId: string
  sessionId: string
}

const options: StrategyOptionsWithRequest = {
  // Extractor function to extract access token from cookie
  // Accepts array of extractors and run in order untill token is found
  // Custom function to get from request.cookies since we know we are keeping our token in cookie
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req: Request) => {
      const accessToken = req.cookies.accessToken

      if (!accessToken) {
        throw new UnauthorizedException(
          "Unauthorized access Token",
          ErrorCode.AUTH_TOKEN_NOT_FOUND,
        )
      }
      return accessToken
    },
  ]),
  // other jwt verifier for jwt token
  secretOrKey: config.JWT.SECRET,
  audience: ["user"],
  algorithms: ["HS256"],
  passReqToCallback: true,
}

export const setupJWTStragegy = (passport: PassportStatic) => {
  passport.use(
    new JwtStrategy(
      options,
      // Verify callback as we set passReqToCallback: true,
      async (req, payload, done) => {
        console.log("Passport verify called with payload:", payload)
        try {
          const user = await userService.findUserById(payload.userId)
          console.log("User found:", user ? "yes" : "no")
          if (!user) return done(null, false)
          req.sessionId = payload.sessionId
          return done(null, user)
        } catch (error) {
          console.error("Verify error:", error)
          return done(error, null)
        }
      },
    ),
  )
}

// middlware to check authjwt in requests
export const authJWT = passport.authenticate("jwt", { session: false })
