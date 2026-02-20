import type { HttpStatusCode } from "@/config/http.config.js"

// src/commons/types/api-response.ts  (create this file)
export type ApiSuccessResponse<T = unknown> = {
  success: true
  message: string
  data?: T
}

export type ApiErrorResponse = {
  success: false
  message: string
  errors?: {
    code?: HttpStatusCode | string
    details?: string | string[] | Record<string, string>
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
