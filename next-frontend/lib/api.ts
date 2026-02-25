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
