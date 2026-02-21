// src/middlewares/errorHandler.middleware.ts
import type { ErrorRequestHandler } from "express"
import { HTTPSTATUS, type HttpStatusCode } from "@/config/http.config.js"
import { AppError } from "@/commons/utils/AppError.js"
import type { ApiResponse } from "@/commons/types/api-response.js"
import { ZodError } from "zod"

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // console.error(`Error on ${req.method} ${req.path}:`, err)

  let status: HttpStatusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR
  let response: ApiResponse = {
    success: false,
    message: "Internal Server Error",
    // We omit `error` here → it's optional
  }

  // In errorHandler.middleware.ts (Zod section)
  if (err instanceof ZodError) {
    status = HTTPSTATUS.BAD_REQUEST

    const issues = err.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    }))

    // New: Unified message – join all issue messages (customize separator)
    const unifiedMessage = issues
      .map((i) => `${i.path ? i.path + ": " : ""}${i.message}`)
      .join(". ") // e.g., "email: Invalid format. password: Too short."

    response = {
      success: false,
      message: "Validation failed", // Or use unifiedMessage here if you want
      errorMessage: unifiedMessage || "Invalid input", // ← New field for toasts
      error: {
        code: "VALIDATION_ERROR",
        issues, // Keep for detailed form handling
      },
    }
  } else if (err instanceof AppError) {
    status = err.statusCode ?? HTTPSTATUS.BAD_REQUEST

    response = {
      success: false,
      message: err.message || "Operation failed",
      error: {
        code: err.errorCode ?? "APP_ERROR",
        // Only add stack in development
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    }
  } else if (err instanceof SyntaxError && err.message.includes("JSON")) {
    status = HTTPSTATUS.BAD_REQUEST

    response = {
      success: false,
      message: "Invalid JSON in request body",
      error: {
        code: "INVALID_JSON",
      },
    }
  } else {
    // Unknown error – safely handle unknown/any
    const isDev = process.env.NODE_ENV === "development"
    const errorMessage = err instanceof Error ? err.message : String(err)

    response = {
      success: false,
      message: errorMessage || "Something went wrong",
      error: {
        code: "UNKNOWN_ERROR",
        ...(isDev && err instanceof Error && { stack: err.stack }),
        ...(isDev && { raw: String(err) }), // helpful for non-Error objects
      },
    }
  }

  res.status(status).json(response)
}
