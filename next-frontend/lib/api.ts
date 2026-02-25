import API from "./axios-client"

interface LoginType {
  email: string
  password: string
}
interface RegisterType {
  name: string
  email: string
  password: string
  confirmPassword: string
}

type verifyEmailType = { code: string }

type forgotPasswordType = { email: string }
type resetPasswordType = { password: string; code: string }

type SessionType = {
  id: string
  userId: string
  userAgent: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

type SessionResponseType = {
  message: string
  data: { sessions: SessionType[] }
  success: boolean
}

export type mfaType = {
  success: boolean
  message: string
  // secret: string
  qrImageUrl: string
}

type verifyMFAType = { code: string }
type mfaLoginType = { code: string; email: string }

// Auth Requests
export const loginMutationFn = async (loginData: LoginType) =>
  await API.post("/auth/login", loginData)

export const registerMutationFn = async (registerData: LoginType) =>
  await API.post("/auth/register", registerData)

export const verifyEmailMutationFn = async (data: verifyEmailType) =>
  await API.post(`/auth/verify-email`, data)

export const forgotPasswordMutationFn = async (data: forgotPasswordType) =>
  await API.post(`/auth/forgot-password`, data)

export const resetPasswordMutationFn = async (data: resetPasswordType) =>
  await API.post(`/auth/reset-password`, data)

export const logoutMutationFn = async () => await API.post(`/auth/logout`)

// Sessions Requests
export const getUserSessionQueryFn = async () => await API.get(`/session/`)
export const sessionsQueryFn = async () => {
  const response = await API.get<SessionResponseType>(`/session/all`)
  console.log("session incoming", response)
  return response.data
}

export const sessionDelMutationFn = async (id: string) =>
  await API.delete(`/session/${id}`)

// MFA Requests
export const verifyMFALoginMutationFn = async (data: mfaLoginType) =>
  await API.post(`/mfa/verify-login`, data)

export const mfaSetupQueryFn = async () => {
  const response = await API.get<mfaType>(`/mfa/setup`)
  return response
}

export const verifyMFAMutationFn = async (data: verifyMFAType) =>
  await API.post(`/mfa/verify`, data)

export const revokeMFAMutationFn = async () => await API.put(`/mfa/revoke`, {})
