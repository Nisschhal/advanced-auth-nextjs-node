import { asyncHandler } from "@/middlewares/asyncHandler.middlware.js"
import type { SessionService } from "./session.service.js"
import type { Request, Response } from "express"
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/commons/utils/catch-errors.js"
import { HTTPSTATUS } from "@/config/http.config.js"
import z, { success } from "zod"
import { clearAuthCookies } from "@/commons/utils/cookie.js"

export class SessionController {
  constructor(private sessionService: SessionService) {}

  public getAllSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id

    if (!userId) throw new NotFoundException("User not found for sessions")

    const sessionId = req.sessionId
    if (!sessionId)
      throw new BadRequestException("Session Id required, please login")

    const sessions = await this.sessionService.getAllSession(userId)
    const modifySession = sessions.map((session) => ({
      ...session,
      isCurrent: session.id === sessionId,
    }))

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Sessions reterived successfully!",
      data: modifySession,
    })
  })

  public getSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.sessionId
    if (!sessionId)
      throw new BadRequestException("Session Id required, please login")

    const session = await this.sessionService.getSessionById(sessionId)

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Sessions reterived successfully!",
      data: session,
    })
  })

  public deleteSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = z.string().parse(req.params.id)

    const userId = req.user?.id

    const currentSessionId = req.sessionId

    if (!userId || !currentSessionId) {
      throw new UnauthorizedException("Authentication required")
    }

    const result = await this.sessionService.deleteSession(
      sessionId,
      userId,
      currentSessionId,
    )

    // ONLY clear cookies if user deleted their CURRENT session
    if (result.data.isCurrentSessionDeleted) {
      clearAuthCookies(res)
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: "Current session deleted. You have been logged out.",
        data: null,
      })
      return
    }

    // Normal case: deleted another device → no cookie clear
    res.status(HTTPSTATUS.OK).json(result)
  })
}
