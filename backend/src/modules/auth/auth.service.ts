import { ErrorCode } from "@/commons/enums/error-code.enum.js"
import type { LoginDto, RegisterDto } from "@/commons/dto/auth.dto.js"
import prisma from "@/commons/lib/prisma.js"
import { compareHashValue, hashValue } from "@/commons/utils/bcrypt-hash.js"
import { BadRequestException } from "@/commons/utils/catch-errors.js"
import { XMinutesFromNow } from "@/commons/utils/date-time.js"
import { generateVerificationCode } from "@/commons/utils/generate-verfication-code.js"
import type { User, UserPreferences } from "@/generated/prisma/client.js"
import { VerificationType } from "@/generated/prisma/enums.js"
import type { ApiResponse } from "@/commons/types/api-response.js"
import jwt, { type SignOptions } from "jsonwebtoken"
import { config } from "@/config/app.config.js"
import type { StringValue } from "ms" // or from '@types/ms' if needed
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
          create: {
            twoFactorSecret: "123",
          },
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

    // TODO: SEND VERIFICATION EMAIL
    // Example: await sendVerificationEmail(email, verificationCode.code);

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
      user: ReturnType<AuthService["safeUser"]>
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

    const session = await prisma.session.create({
      data: {
        userId: existingUser.id,
        userAgent: userAgent ?? null,
        expiredAt: XMinutesFromNow(15),
      },
    })

    const payload = {
      userId: existingUser.id,
      sessionId: session.id,
    }

    const accessSignOptions: SignOptions = {
      audience: ["user"], // array is fine
      expiresIn: config.JWT.EXPIRES_IN as StringValue, // make sure this is stringValue | number
      // algorithm: 'HS256',           // add if you want explicit (default is HS256 anyway)
    }
    const refreshSignOptions: SignOptions = {
      audience: ["user"], // array is fine
      expiresIn: config.JWT.REFRESH_EXPIRES_IN as StringValue, // make sure this is stringValue | number
      // algorithm: 'HS256',           // add if you want explicit (default is HS256 anyway)
    }

    const accessToken = jwt.sign(payload, config.JWT.SECRET, accessSignOptions)
    const refreshToken = jwt.sign(
      payload,
      config.JWT.REFRESH_SECRET,
      refreshSignOptions,
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

  /**
   * Remove sensitive fields from user object before returning to client
   */
  private safeUser(user: User & { preferences: UserPreferences | null }): Omit<
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
