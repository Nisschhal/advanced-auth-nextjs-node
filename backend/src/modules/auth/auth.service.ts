import { ErrorCode } from "@/commons/enums/error-code.enum.js"
import type { RegisterDto } from "@/commons/interface/auth.interface.js"
import prisma from "@/commons/lib/prisma.js"
import { hashValue } from "@/commons/utils/bcrypt-hash.js"
import { BadRequestException } from "@/commons/utils/catch-errors.js"
import { XMinutesFromNow } from "@/commons/utils/date-time.js"
import { generateVerificationCode } from "@/commons/utils/generate-verfication-code.js"
import type { User, UserPreferences } from "@/generated/prisma/client.js"
import { VerificationType } from "@/generated/prisma/enums.js"

// Define a consistent response format for success
type SuccessResponse<T = any> = {
  success: true
  message: string
  data?: T
}

// Define a consistent response format for error
type ErrorResponse = {
  success: false
  message: string
  error: {
    code: ErrorCode
    details?: string
  }
}

// Union type for all API responses
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

export class AuthService {
  public async register(
    registerDto: RegisterDto,
  ): Promise<ApiResponse<{ user: any }>> {
    const { name, email, password, userAgent } = registerDto

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

  /**
   * Remove sensitive fields from user object before returning to client
   */
  private safeUser(user: User & { preferences: UserPreferences | null }) {
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
