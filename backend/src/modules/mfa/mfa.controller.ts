import { asyncHandler } from "@/middlewares/asyncHandler.middlware.js"
import type { MFAService } from "./mfa.service.js"
import type { Request, Response } from "express"
import { HTTPSTATUS } from "@/config/http.config.js"
import {
  verifyMfaForLoginSchema,
  verifyMFASchema,
} from "@/commons/validators/mfa.validator.js"
import { setAuthCookies } from "@/commons/utils/cookie.js"

export class MFAController {
  constructor(private mfaService: MFAService) {}

  public generateMFASetup = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await this.mfaService.generateMFASetup(req)
      console.log("mfa result", result)

      res.status(HTTPSTATUS.OK).json(result)
    },
  )
  public verifyMFASetup = asyncHandler(async (req: Request, res: Response) => {
    const { code } = verifyMFASchema.parse({ ...req.body })
    const result = await this.mfaService.verifyMFASetup(req, code)

    res.status(HTTPSTATUS.OK).json(result)
  })

  public revokeMFA = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.mfaService.revokeMFA(req)
    res.status(HTTPSTATUS.OK).json(result)
  })

  public verifyMFAForLogin = asyncHandler(
    async (req: Request, res: Response) => {
      const { code, email, userAgent } = verifyMfaForLoginSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
      })

      const result = await this.mfaService.verifyMFAForLogin(
        code,
        email,
        userAgent,
      )
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
    },
  )
}
