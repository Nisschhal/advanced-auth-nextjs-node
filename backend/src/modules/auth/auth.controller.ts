import { asycnHandler } from "@/middlewares/asyncHandler.middlware.js" // Note: Fix typo to 'asyncHandler' if needed
import type { AuthService } from "./auth.service.js"
import { HTTPSTATUS } from "@/config/http.config.js"
import type { Request, Response } from "express"
import {
  emailSchema,
  forgetPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verficationEmailSchema,
} from "@/commons/validators/auth.validator.js"
import type { ApiResponse } from "@/commons/types/api-response.js"
import {
  clearAuthCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthCookies,
} from "@/commons/utils/cookie.js"
import { UnauthorizedExpception } from "@/commons/utils/catch-errors.js"
import { success } from "zod"

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

  public refreshToken = asycnHandler(async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken as string | undefined

      if (!refreshToken) {
        throw new UnauthorizedExpception("User not authorized!")
      }

      const { accessToken, newRefreshToken } =
        await this.authService.refreshToken(refreshToken)
      // Set cookies//tokens
      res
        .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
        .cookie(
          "refreshToken",
          newRefreshToken ?? refreshToken,
          getRefreshTokenCookieOptions(),
        )

      // Consistent success response
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: "Tokens refreshed successfully",
        // data: null, // or { accessToken } if you want to return it in body too (optional)
      })
    } catch (err: any) {
      res
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({
          success: false,
          message: err.message || "Session expired or invalid",
          error: { code: "UNAUTHORIZED" },
        })
    }
  })

  public verifyEmail = asycnHandler(async (req: Request, res: Response) => {
    const { code } = verficationEmailSchema.parse(req.body)
    await this.authService.verifyEmail(code)

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Email verified Successfully!",
    })
  })

  public forgetPassword = asycnHandler(async (req: Request, res: Response) => {
    const { email } = forgetPasswordSchema.parse(req.body)
    const data = await this.authService.forgetPassword(email)
    console.log("forgetpassword data", data)

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Password reset link send successfully!",
    })
  })

  public resetPassword = asycnHandler(async (req: Request, res: Response) => {
    const body = resetPasswordSchema.parse(req.body)
    const result = await this.authService.resetPassword(body)
    // Set HTTP status based on success or error
    const status = result.success ? HTTPSTATUS.OK : HTTPSTATUS.BAD_REQUEST
    return clearAuthCookies(res).status(status).json(result) // Send the formatted response
  })
}
