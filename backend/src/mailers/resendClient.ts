import { config } from "@/config/app.config.js"
import { Resend } from "resend"

export const resendClient = new Resend(config.RESEND_API_KEY)
