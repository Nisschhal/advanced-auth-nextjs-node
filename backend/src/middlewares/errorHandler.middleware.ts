// src/middlewares/errorHandler.middleware.ts

import type { ErrorRequestHandler } from "express"
import { HTTPSTATUS, type HttpStatusCode } from "@/config/http.config.js"
import { AppError } from "@/commons/utils/AppError.js"
import type { ApiResponse } from "@/commons/types/api-response.js" // import the type

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.error(`Error on ${req.method} ${req.path}:`, error)

  let status: HttpStatusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR
  let response: ApiResponse = {
    success: false,
    message: "Internal Server Error",
    errors: { code: HTTPSTATUS.INTERNAL_SERVER_ERROR },
  }

  // ─── Handle specific error types ───

  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    status = HTTPSTATUS.BAD_REQUEST
    response = {
      success: false,
      message: "Invalid JSON format in request body",
      errors: { code: "INVALID_JSON" },
    }
  } else if (error instanceof AppError) {
    status = error.statusCode || HTTPSTATUS.BAD_REQUEST
    response = {
      success: false,
      message: error.message,
      errors: {
        code: error.errorCode || "APP_ERROR",
        details: error.stack || error.message,
      },
    }
  } else if (error.name === "ZodError") {
    // if you're using Zod validation
    status = HTTPSTATUS.BAD_REQUEST
    response = {
      success: false,
      message: "Validation failed",
      errors: {
        code: "VALIDATION_ERROR",
        details: error.stack || error.message,
      },
    }
  }

  // ─── Fallback for unknown errors ───
  else {
    response = {
      success: false,
      message: error.message || "Internal Server Error",
      errors: {
        code: "UNKNOWN_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    }
  }

  res.status(status).json(response)
}
