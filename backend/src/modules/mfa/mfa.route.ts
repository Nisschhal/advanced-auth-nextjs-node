import { authJWT } from "@/commons/strategies/jwt.strategy.js"
import { Router } from "express"
import { mfaController } from "./mfa.module.js"

const mfaRoutes = Router()
mfaRoutes.get("/setup", authJWT, mfaController.generateMFASetup)

export default mfaRoutes
