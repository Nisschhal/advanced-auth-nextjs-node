import * as z from "zod"

export const emailSchema = z.email().trim().min(1).max(255)
export const passwordSchema = z.string().trim().min(6).max(255)
export const verificationCodeSchema = z.string().trim().min(6).max(6)

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    userAgent: z.string().optional(),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: "Password does not match!",
    path: ["confirmPassword"],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const verficationEmailSchema = z.object({
  code: verificationCodeSchema,
})

export const passwordResetSchema = z.object({
  code: verificationCodeSchema,
  password: passwordSchema,
})
