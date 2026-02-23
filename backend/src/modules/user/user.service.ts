import prisma from "@/commons/lib/prisma.js"
import { authService } from "../auth/auth.module.js"

export class UserService {
  public async findUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })
    return user ? authService.safeUser(user) : null
  }
}
