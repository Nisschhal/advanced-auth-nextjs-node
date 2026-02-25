import prisma from "@/commons/lib/prisma.js"
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/commons/utils/catch-errors.js"
import type { Request } from "express"
import speakeasy from "speakeasy"
import qrcode from "qrcode"
import { XDaysFromNow } from "@/commons/utils/date-time.js"
import {
  accessTokenSignOptions,
  refreshTokenSignOptions,
  signJwtToken,
} from "@/commons/utils/jwt.utilts.js"
import { authService } from "../auth/auth.module.js"

export class MFAService {
  /**
   * Generate MFA setup (QR code + secret + backup codes)
   */
  public async generateMFASetup(req: Request) {
    const user = req.user
    if (!user) {
      throw new UnauthorizedException("User not authorized")
    }

    return await prisma.$transaction(async (tx) => {
      // Load current preferences
      const preferences = await tx.userPreferences.findUnique({
        where: { userId: user.id },
      })

      if (preferences?.enable2FA) {
        return {
          success: false,
          message: "2FA is already enabled",
        }
      }

      // Use existing secret or generate new one
      let secretKey = preferences?.twoFactorSecret

      if (!secretKey) {
        const secretObj = speakeasy.generateSecret({ length: 20 })
        secretKey = secretObj.base32

        // Create or update preferences
        await tx.userPreferences.upsert({
          where: { userId: user.id },
          update: { twoFactorSecret: secretKey },
          create: {
            userId: user.id,
            enable2FA: false,
            emailNotification: true,
            twoFactorSecret: secretKey,
          },
        })
      }

      // Create otpauth URL (what authenticator apps read)
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secretKey,
        label: `YourApp: ${user.email}`,
        issuer: "YourApp",
        encoding: "base32",
      })

      // Generate QR code as base64 string
      const qrImageUrl = await qrcode.toDataURL(otpauthUrl)

      return {
        success: true,
        message:
          "To enable 2FA:\n" +
          "1. Open Google Authenticator, Authy, or Microsoft Authenticator.\n" +
          "2. Scan the QR code below or enter the secret key manually.\n" +
          "3. Enter the current 6-digit code from the app to finish setup.",
        qrImageUrl,
        // secretKey, // for manual entry fallback (show on screen only)
      }
    })
  }

  /**
   * Verify the 6-digit code and enable 2FA
   */
  public async verifyMFASetup(req: Request, code: string) {
    const user = req.user
    if (!user) throw new UnauthorizedException("Unauthorized")

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    })

    if (!preferences?.twoFactorSecret) {
      throw new BadRequestException(
        "2FA setup not started. Call /mfa/setup first.",
      )
    }

    if (preferences.enable2FA) {
      return {
        success: false,
        message: "2FA is already enabled",
      }
    }

    const isValid = speakeasy.totp.verify({
      secret: preferences.twoFactorSecret,
      encoding: "base32",
      token: code.trim(),
      window: 2, // 180 seconds tolerance — covers clock drift & delay
      step: 30,
    })

    console.log("Code valid:", isValid)

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again!")
    }

    // Enable 2FA
    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: { enable2FA: true },
    })

    return {
      success: true,
      message: "2FA enabled successfully",
    }
  }

  public async revokeMFA(req: Request) {
    const user = req.user

    if (!user) {
      throw new UnauthorizedException("User not authorized")
    }

    if (!user.preferences?.enable2FA) {
      return {
        success: false,
        message: "MFA is not enabled",
        userPreferences: {
          enable2FA: user.preferences?.enable2FA,
        },
      }
    }

    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: {
        twoFactorSecret: null,
        enable2FA: false,
      },
    })

    return {
      success: true,
      message: "MFA revoke successfully",
      preferences: {
        enable2FA: user.preferences.enable2FA,
      },
    }
  }

  public async verifyMFAForLogin(
    code: string,
    email: string,
    userAgent?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { preferences: true },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    if (!user.preferences?.enable2FA && !user.preferences?.twoFactorSecret) {
      throw new UnauthorizedException("MFA not enabled for this user")
    }

    const isValid = speakeasy.totp.verify({
      secret: user.preferences?.twoFactorSecret!,
      encoding: "base32",
      token: code,
    })

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again.")
    }

    //sign access token & refresh token
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: userAgent ?? null,
        expiredAt: XDaysFromNow(30),
      },
    })

    const accessToken = signJwtToken(
      {
        userId: user.id,
        sessionId: session.id,
      },
      accessTokenSignOptions,
    )

    const refreshToken = signJwtToken(
      {
        sessionId: session.id,
      },
      refreshTokenSignOptions,
    )

    return {
      success: true,
      message: "MFA Verfigied and login Successfull!",
      data: {
        accessToken,
        refreshToken,
        user: authService.safeUser(user),
      },
    }
  }
}
