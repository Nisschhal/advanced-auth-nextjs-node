import { Router } from "express"
import { authController } from "./auth.module.js"

const authRoutes = Router()

authRoutes.post("/register", authController.register)
authRoutes.post("/login", authController.login)
authRoutes.post("/verify-email", authController.verifyEmail)
authRoutes.post("/forgot-password", authController.forgetPassword)
authRoutes.post("/reset-password", authController.resetPassword)

authRoutes.post("/refresh", authController.refreshToken)

export default authRoutes
