import type {
  UserModel,
  UserPreferencesModel,
} from "@/generated/prisma/models.ts"
import { Request } from "express"

// Extend Express.User to match what you actually get from Prisma
declare global {
  namespace Express {
    interface User extends UserModel {
      // Add preferences directly (from include: { preferences: true })
      preferences: UserPreferencesModel | null
    }

    interface Request {
      sessionId?: string
      // Optional: if you ever attach more (e.g. roles)
      // roles?: string[]
    }
  }
}
