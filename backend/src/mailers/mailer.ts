import { config } from "@/config/app.config.js"
import { resendClient } from "./resendClient.js"

type SendEmailT = {
  to: string | string[]
  subject: string
  text: string
  html: string
  from?: string
}

const mailer_sender =
  config.NODE_ENV === "development"
    ? "no reply <onboarding@resend.dev>"
    : `no reply <${config.MAILER_SENDER}>`

export const sendEmail = async function ({
  to,
  from = mailer_sender,
  subject,
  text,
  html,
}: SendEmailT) {
  return await resendClient.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
  })
}
