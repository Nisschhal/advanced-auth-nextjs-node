import { ErrorCode } from "@/commons/enums/error-code.enum.js"
import type {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from "@/commons/dto/auth.dto.js"
import prisma from "@/commons/lib/prisma.js"
import { compareHashValue, hashValue } from "@/commons/utils/bcrypt-hash.js"
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "@/commons/utils/catch-errors.js"
import {
  getExpirationDate,
  ONE_DAY_IN_MS,
  XDaysFromNow,
  XMinutesAgo,
  XMinutesFromNow,
} from "@/commons/utils/date-time.js"
import { generateVerificationCode } from "@/commons/utils/generate-verfication-code.js"
import type { User, UserPreferences } from "@/generated/prisma/client.js"
import { VerificationType } from "@/generated/prisma/enums.js"
import type { ApiResponse } from "@/commons/types/api-response.js"
import { config } from "@/config/app.config.js"
import {
  refreshTokenSignOptions,
  signJwtToken,
  verifyJWTToken,
  type RefreshTPayload,
} from "@/commons/utils/jwt.utilts.js"
import { sendEmail } from "@/mailers/mailer.js"
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "@/mailers/templates/template.js"
import { HTTPSTATUS } from "@/config/http.config.js"
export class AuthService {
  public async register(
    registerDto: RegisterDto,
  ): Promise<ApiResponse<{ user: ReturnType<AuthService["safeUser"]> }>> {
    const { name, email, password } = registerDto

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new BadRequestException(
        `User with email ${email} already exists!`,
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      )
    }

    const hashedPassword = await hashValue(password)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword, // hashed!
        preferences: {
          create: {}, // Creates preferece table and linked to user with default values
        },
      },

      include: {
        preferences: true,
      },
    })

    const verificationCode = await prisma.verificationCode.create({
      data: {
        userId: newUser.id,
        code: generateVerificationCode(),
        type: VerificationType.EMAIL_VERIFICATION,
        expiresAt: XMinutesFromNow(45), // 45 minutes from now
      },
    })

    if (verificationCode) console.log("VerficationCode created successfully!")

    const verficationUrl = `${config.APP_ORIGIN}/confirm-account?code=${verificationCode.code}`

    // TODO: SEND VERIFICATION EMAIL
    // Example: await sendVerificationEmail(email, verificationCode.code);
    await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verficationUrl),
    })

    return {
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
      data: { user: this.safeUser(newUser) },
    }
  }

  public async login(loginDto: LoginDto): Promise<
    ApiResponse<{
      accessToken: string
      refreshToken: string
      user: ReturnType<AuthService["safeUser"]> | null
    }>
  > {
    const { email, password, userAgent } = loginDto
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        preferences: true,
      },
    })
    if (!existingUser || !compareHashValue(password, existingUser.password))
      throw new BadRequestException(
        "Invalid email or password provided!",
        ErrorCode.AUTH_USER_NOT_FOUND,
      )

    // TODO: check if user enabled 2fa and send verify code
    if (existingUser.preferences?.enable2FA) {
      return {
        success: false,
        message: "MFA enabled need to verify user",

        data: {
          mfaRequired: true,
          accessToken: "",
          refreshToken: "",
          user: null,
        },
      }
    }

    const session = await prisma.session.create({
      data: {
        userId: existingUser.id,
        userAgent: userAgent ?? null,
        expiredAt: XDaysFromNow(30),
      },
    })

    const accessToken = signJwtToken({
      userId: existingUser.id,
      sessionId: session.id,
    })

    const refreshToken = signJwtToken(
      { sessionId: session.id },
      refreshTokenSignOptions,
    )

    return {
      success: true,
      message: "User login Successfull!",
      data: {
        accessToken,
        refreshToken,
        user: this.safeUser(existingUser),
      },
    }
  }

  public async refreshToken(refreshToken: string) {
    const { payload, error } = verifyJWTToken<RefreshTPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    })

    if (error) throw new UnauthorizedException(error) // or "Invalid/expired refresh token"

    const session = await prisma.session.findUnique({
      where: {
        id: payload!.sessionId,
      },
    })
    const now = Date.now()
    if (!session) throw new UnauthorizedException("Session doesn't exist!")

    if (session.expiredAt.getTime() <= now)
      throw new UnauthorizedException("Session expired")

    const sessionRequiredRefresh =
      session.expiredAt.getTime() - now <= ONE_DAY_IN_MS

    if (sessionRequiredRefresh) {
      await prisma.session.update({
        where: {
          id: payload!.sessionId,
        },
        data: {
          expiredAt: getExpirationDate("30d"),
        },
      })
    }
    const newRefreshToken = sessionRequiredRefresh
      ? signJwtToken(
          {
            sessionId: session.id,
          },
          refreshTokenSignOptions,
        )
      : undefined

    const accessToken = signJwtToken({
      userId: session.userId,
      sessionId: session.id,
    })

    return {
      accessToken,
      newRefreshToken,
    }
  }

  public async verifyEmail(code: string) {
    const validCode = await prisma.verificationCode.findUnique({
      where: {
        code,
        type: VerificationType.EMAIL_VERIFICATION,
        expiresAt: { gt: new Date() },
      },
    })
    if (!validCode)
      throw new BadRequestException("Invalid or expired verfication code")

    const existingUser = await prisma.user.update({
      where: {
        id: validCode.userId,
      },
      data: {
        isEmailVerified: true,
      },
      include: { preferences: true },
    })
    if (!existingUser)
      throw new BadRequestException(
        "Unable to verify Email",
        ErrorCode.VALIDATION_ERROR,
      )
    await prisma.verificationCode.delete({
      where: { id: validCode.id },
    })

    return {
      success: true,
      message: "User login Successfull!",
      data: {
        user: this.safeUser(existingUser),
      },
    }
  }

  public async forgetPassword(email: string) {
    // 1. Find user (use select to get only needed fields)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }, // no need for full user object
    })

    if (!existingUser) {
      throw new NotFoundException("User not found")
    }

    // 2. Rate limiting: max 3 reset emails per 3 minutes
    // Use _count aggregation → much more efficient than findMany + length
    const timeAgo = XMinutesAgo(3)
    const expiredCodes = await prisma.verificationCode.count({
      where: {
        userId: existingUser.id,
        type: VerificationType.PASSWORD_RESET,
        createdAt: { gte: timeAgo }, // get all codes that are greater than/from 3 minutes ago to now
      },
    })

    const maxLimit = 3
    if (expiredCodes >= maxLimit) {
      throw new HttpException(
        "Too many requests, try again later",
        HTTPSTATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS,
      )
    }

    // 3. Generate code & expiry
    const expiresAt = XMinutesFromNow(60)
    const code = generateVerificationCode()

    // 4. Create verification record
    await prisma.verificationCode.create({
      data: {
        userId: existingUser.id,
        type: VerificationType.PASSWORD_RESET,
        code,
        expiresAt,
      },
    })

    // 5. Build secure reset link
    // Important: NEVER put expiry timestamp in URL — it's not needed and leaks info
    // Just use the code — expiry is already enforced in DB
    const resetLink = `${config.APP_ORIGIN}/reset-password?code=${code}`

    // 6. Send email
    const { data, error } = await sendEmail({
      to: email,
      ...passwordResetTemplate(resetLink),
    })

    console.log({ data, error })

    if (!data?.id) {
      // In production: do NOT leak internal error details to client
      throw new InternalServerException("Failed to send reset email")
    }

    // 7. Return minimal info — never return the code or full link in API response
    return {
      message: "Password reset email sent successfully",
      // Optional: only return emailId for logging/debugging if needed
      // emailId: data.id,
    }
    // TODO: clean old/unused code in cron job in bg weekly or daily
  }

  public async resetPassword({ password, code }: ResetPasswordDto) {
    return await prisma.$transaction(async (tx) => {
      // 1. Find valid code
      const validCode = await tx.verificationCode.findUnique({
        where: {
          code,
          type: VerificationType.PASSWORD_RESET,
          expiresAt: { gt: new Date() },
        },
      })

      if (!validCode) {
        throw new NotFoundException("Invalid or expired verification code")
      }

      // 2. Hash new password
      const hashedPassword = await hashValue(password)

      // 3. Update password
      await tx.user.update({
        where: { id: validCode.userId },
        data: { password: hashedPassword },
        include: { preferences: true },
      })

      // 4. Make code single-use
      await tx.verificationCode.delete({
        where: { code },
      })

      // 5. Logout all sessions/devices
      await tx.session.deleteMany({
        where: { userId: validCode.userId },
      })

      // Return success
      return {
        success: true,
        message: "Password reset successfully. Please log in again.",
        data: null, // or keep { user: this.safeUser(updatedUser) } if frontend needs it
      }
    })
  }

  public async logout(sessionId: string) {
    const session = await prisma.session.delete({
      where: { id: sessionId },
    })
    if (!session)
      throw new NotFoundException("Invalid sessionId, couldn't logout")

    return {
      success: true,
      message: "Logout Successfull!",
      data: null,
    }
  }

  /**
   * Remove sensitive fields from user object before returning to client
   */
  public safeUser(user: User & { preferences: UserPreferences | null }): Omit<
    User,
    "password"
  > & {
    preferences: Omit<UserPreferences, "twoFactorSecret"> | null
  } {
    const { password, ...safeUser } = user

    let safePreferences: Omit<UserPreferences, "twoFactorSecret"> | null = null

    if (safeUser.preferences) {
      const { twoFactorSecret, ...cleanPrefs } = safeUser.preferences
      safePreferences = cleanPrefs
    }

    return {
      ...safeUser,
      preferences: safePreferences,
    }
  }
}
