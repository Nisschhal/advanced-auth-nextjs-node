import type { UserModel } from "@/generated/prisma/models.ts"
import { Request } from "express"

// add this types to tsconfig.json include
declare global {
  namespace Express {
    // User from prisma generated
    interface User extends UserModel {}
    interface Request {
      sessionId?: string
    }
  }
}
