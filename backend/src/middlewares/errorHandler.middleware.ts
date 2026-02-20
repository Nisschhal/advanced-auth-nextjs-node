import { AppError } from "@/commons/utils/AppError.js"
import { HTTPSTATUS } from "@/config/http.config.js"
import type { ErrorRequestHandler } from "express"

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log(`Error occured on PATH: ${req.path}`, error)

  // Type of error
  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON format, please check your request body",
    })
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
    })
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: error?.message || "Unknown error occured.",
  })
}
