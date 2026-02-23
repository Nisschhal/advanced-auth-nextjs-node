import { asyncHandler } from "@/middlewares/asyncHandler.middlware.js"
import type { MFAService } from "./mfa.service.js"
import type { Request, Response } from "express"
import { HTTPSTATUS } from "@/config/http.config.js"

export class MFAController {
  constructor(private mfaService: MFAService) {}

  public generateMFASetup = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await this.mfaService.generateMFASetup(req)
      console.log("mfa result", result)

      res.status(HTTPSTATUS.OK).json(result)
    },
  )
}
