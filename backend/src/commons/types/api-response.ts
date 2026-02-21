// src/commons/types/api-response.ts
import type { HttpStatusCode } from "@/config/http.config.js"

export type ApiSuccessResponse<T = unknown> = {
  success: true
  message?: string // optional – many APIs omit on pure data responses
  data: T // force data on success (or make optional if you want)
}

export type ApiErrorResponse = {
  success: false
  message: string
  error?: {
    code: string | HttpStatusCode
    issues?: Array<{
      path: string // "email" or "items.0.price"
      code: string // ZodIssueCode or your custom codes
      message: string
    }>
    details?: string | string[] | Record<string, string | string[]>
    stack?: string // only in dev
  }
  errorMessage?: string // ← Optional unified summary
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
