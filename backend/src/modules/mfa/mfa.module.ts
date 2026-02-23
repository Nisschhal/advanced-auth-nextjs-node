import { MFAController } from "./mfa.controller.js"
import { MFAService } from "./mfa.service.js"

const mfaService = new MFAService()
const mfaController = new MFAController(mfaService)

export { mfaService, mfaController }
