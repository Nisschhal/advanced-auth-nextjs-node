import prisma from "@/commons/lib/prisma.js"
import {
  BadRequestException,
  UnauthorizedException,
} from "@/commons/utils/catch-errors.js"
import type { Request } from "express"
import speakeasy from "speakeasy"
import qrcode from "qrcode"
import { hashValue } from "@/commons/utils/bcrypt-hash.js"

export class MFAService {
  public async generateMFASetup(req: Request) {
    const user = req.user

    if (!user) {
      throw new UnauthorizedException("User not authorized")
    }

    // Get current preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    })

    if (preferences?.enable2FA) {
      return {
        success: false,
        message: "2FA is already enabled",
      }
    }

    // Use transaction for safety
    return await prisma.$transaction(async (tx) => {
      let secretKey = preferences?.twoFactorSecret

      // Generate new secret if missing
      if (!secretKey) {
        const secretObj = speakeasy.generateSecret({
          length: 20, // strong 160-bit secret
        })
        secretKey = secretObj.base32

        // Update preferences (create if not exists)
        await tx.userPreferences.upsert({
          where: { userId: user.id },
          update: {
            twoFactorSecret: secretKey,
          },
          create: {
            userId: user.id,
            enable2FA: false, // still off until verified
            emailNotification: true,
            twoFactorSecret: secretKey,
          },
        })
      }

      // Generate otpauth URL (shows nicely in authenticator app)
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secretKey,
        label: `YourApp: ${user.email}`, // ← important: user sees their email
        issuer: "YourApp", // your app/company name
        encoding: "base32",
      })

      // Generate QR code as base64 data URL
      const qrImageUrl = await qrcode.toDataURL(otpauthUrl)

      // Generate 10 backup codes (one-time use)
      const backupCodes = Array.from({ length: 10 }, () =>
        speakeasy.totp({
          secret: speakeasy.generateSecret().base32,
          digits: 8,
        }),
      )

      // // Hash and save backup codes (never store plain)
      // const hashedBackupCodes = await Promise.all(
      //   backupCodes.map((code) => hashValue(code)),
      // )

      // // Save hashed backup codes (you'll need a field for this)
      // await tx.userPreferences.update({
      //   where: { userId: user.id },
      //   data: {
      //     backupCodes: hashedBackupCodes, // add this field to schema
      //   },
      // })

      return {
        success: true,
        message:
          "Scan the QR code with Google Authenticator, Authy, or Microsoft Authenticator. " +
          "Enter the current 6-digit code to enable 2FA. Save your backup codes!",
        qrImageUrl,
        // Do NOT return secretKey in response (security)
        // User can see it in authenticator app or use manual entry
        backupCodes, // return plain codes ONCE during setup only!
      }
    })
  }

  // Bonus: Verify code during enable/setup
  public async verifyMFASetup(req: Request, code: string) {
    const user = req.user
    if (!user) throw new UnauthorizedException("Unauthorized")

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    })

    if (!preferences?.twoFactorSecret) {
      throw new BadRequestException("2FA not set up yet")
    }

    const isValid = speakeasy.totp.verify({
      secret: preferences.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1, // 90 sec tolerance
    })

    if (!isValid) {
      throw new BadRequestException("Invalid 2FA code")
    }

    // Enable 2FA
    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: { enable2FA: true },
    })

    return { success: true, message: "2FA enabled successfully" }
  }
}
