import { asycnHandler } from "@/middlewares/asyncHandler.middlware.js" // Note: Fix typo to 'asyncHandler' if needed
import type { AuthService } from "./auth.service.js"
import { HTTPSTATUS } from "@/config/http.config.js"
import type { Request, Response } from "express"
import { registerSchema } from "@/commons/validators/auth.validator.js"
import type { ApiResponse } from "./auth.service.js" // Import the response type

export class AuthController {
  private authService: AuthService
  constructor(authService: AuthService) {
    this.authService = authService
  }

  public register = asycnHandler(
    // Note: Fix typo to 'asyncHandler' if needed
    async (req: Request, res: Response): Promise<any> => {
      const userAgent = req.headers["user-agent"]
      const body = registerSchema.parse({
        ...req.body,
        userAgent,
      })

      const result: ApiResponse = await this.authService.register(body) // Await the service promise

      // Set HTTP status based on success or error
      const status = result.success
        ? HTTPSTATUS.CREATED
        : HTTPSTATUS.BAD_REQUEST

      res.status(status).json(result) // Send the formatted response
    },
  )
}
