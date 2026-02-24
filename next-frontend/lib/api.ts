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

export const loginMutationFn = async (loginData: LoginType) =>
  await API.post("/auth/login", loginData)

export const registerMutationFn = async (registerData: LoginType) =>
  await API.post("/auth/register", registerData)
