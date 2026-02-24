import { authJWT } from "@/commons/strategies/jwt.strategy.js"
import { Router } from "express"
import { mfaController } from "./mfa.module.js"

const mfaRoutes = Router()
mfaRoutes.get("/setup", authJWT, mfaController.generateMFASetup)
mfaRoutes.post("/verify", authJWT, mfaController.verifyMFASetup)
mfaRoutes.put("/revoke", authJWT, mfaController.revokeMFA)

mfaRoutes.post("/verify-login", mfaController.verifyMFAForLogin)

export default mfaRoutes
