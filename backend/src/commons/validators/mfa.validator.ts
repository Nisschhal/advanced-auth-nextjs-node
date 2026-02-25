import z from "zod"
import { emailSchema, userAgentSchema } from "./auth.validator.js"

export const verifyMFASchema = z.object({
  code: z.string().trim().min(1).max(6),
  // secretKey: z.string().trim().min(1),
})

export const verifyMfaForLoginSchema = z.object({
  code: z.string().trim().min(1).max(6),
  email: emailSchema,
  userAgent: userAgentSchema,
})
