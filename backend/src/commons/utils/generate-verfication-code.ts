import crypto from "crypto"

export function generateVerificationCode(): string {
  // Generates a number from 100000 to 999999 → always 6 digits
  return crypto.randomInt(100000, 1000000).toString()
}

// Usage:
console.log(generateVerificationCode()) // e.g. "483920"
