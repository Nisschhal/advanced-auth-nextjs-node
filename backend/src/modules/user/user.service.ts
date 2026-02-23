import prisma from "@/commons/lib/prisma.js"

export class UserService {
  public async findUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { preferences: true },
    })
    return user ? user : null
  }
}
