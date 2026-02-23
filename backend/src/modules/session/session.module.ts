import { SessionController } from "./session.controller.js"
import { SessionService } from "./session.service.js"

const sessionService = new SessionService()
const sessionController = new SessionController(sessionService)

export { sessionService, sessionController }
