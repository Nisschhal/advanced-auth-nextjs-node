import prisma from "@/commons/lib/prisma.js"
import { NotFoundException } from "@/commons/utils/catch-errors.js"

export class SessionService {
  public async getAllSession(userId: string) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiredAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    })
    if (!sessions) throw new NotFoundException("Session not found of the user")
    return sessions
  }
  public async getSessionById(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
        expiredAt: {
          gt: new Date(),
        },
      },
      include: { user: true },
    })
    if (!session) throw new NotFoundException("Session not found")

    // ONLY SEND THE SESSION USER AS FOR CURRENT SESSION WE DON'T WANT TO SEND OTHER SENSITIVE DATA
    // THIS IS JUST TO CHECK IF SESSION HAS CURRENT USER
    return session.user
  }

  public async deleteSession(
    sessionId: string,
    userId: string,
    currentSessionId: string,
  ) {
    // Find session to delete — enforce ownership
    const sessionToDelete = await prisma.session.findUnique({
      where: {
        id: sessionId,
        userId, // only allow deleting own sessions
      },
    })

    if (!sessionToDelete) {
      throw new NotFoundException("Session not found or does not belong to you")
    }

    // Delete the target session
    await prisma.session.delete({
      where: { id: sessionId },
    })

    // Optional: if user is deleting their CURRENT session → clear cookies
    const isDeletingCurrent = sessionId === currentSessionId

    return {
      success: true,
      message: "Session deleted successfully",
      data: {
        isCurrentSessionDeleted: isDeletingCurrent,
        // Optional: frontend can decide to redirect to login if isCurrentSessionDeleted
      },
    }
  }
}
