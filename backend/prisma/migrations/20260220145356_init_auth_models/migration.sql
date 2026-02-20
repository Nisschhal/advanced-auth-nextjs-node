/*
  Warnings:

  - You are about to drop the column `preferences_email_notification` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferences_enable_2fa` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferences_two_factor_secret` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "preferences_email_notification",
DROP COLUMN "preferences_enable_2fa",
DROP COLUMN "preferences_two_factor_secret",
ADD COLUMN     "preferencesEmailNotification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "preferencesEnable2FA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferencesTwoFactorSecret" TEXT;
