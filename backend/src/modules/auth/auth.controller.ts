import { asycnHandler } from "@/middlewares/asyncHandler.middlware.js" // Note: Fix typo to 'asyncHandler' if needed
import type { AuthService } from "./auth.service.js"
import { HTTPSTATUS } from "@/config/http.config.js"
import type { Request, Response } from "express"
import {
  loginSchema,
  registerSchema,
} from "@/commons/validators/auth.validator.js"
import type { ApiResponse } from "@/commons/types/api-response.js"
import { setAuthCookies } from "@/commons/utils/cookie.js"

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

      const result = await this.authService.register(body) // Await the service promise

      // Set HTTP status based on success or error
      const status = result.success
        ? HTTPSTATUS.CREATED
        : HTTPSTATUS.BAD_REQUEST

      res.status(status).json(result) // Send the formatted response
    },
  )

  public login = asycnHandler(async (req: Request, res: Response) => {
    const userAgent = req.headers["user-agent"]
    console.log("user agent", userAgent)

    const body = loginSchema.parse({ ...req.body, userAgent })

    const result = await this.authService.login(body) // Await the service promise

    // Set HTTP status based on success or error
    const status = result.success ? HTTPSTATUS.OK : HTTPSTATUS.BAD_REQUEST

    // ← Add this check
    if (result.success && result.data) {
      setAuthCookies({
        res,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      })
    }

    res.status(status).json(result) // Send the formatted response
  })
}
