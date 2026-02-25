import axios, { AxiosRequestConfig } from "axios"
import { toast } from "sonner"
const options: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
}

const API = axios.create(options)

API.interceptors.response.use(
  (response) => {
    console.log(
      `[API SUCCESS] ${response.config.method?.toUpperCase()} ${response.config.url}`,
    )
    console.log("Status:", response.status)
    console.log("Full response data:", response.data)
    console.log("Headers:", response.headers)
    return response
  },

  (error) => {
    // console.error(
    //   `[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
    // )
    // console.error("Status:", error.response?.status)
    // console.error("Full error response:", error.response?.data)
    // console.error("Message:", error.message)

    const responseData = error.response?.data
    const status = error.response?.status

    let handledError = {
      success: false,
      message: "Something went wrong",
      error: {
        code: "UNKNOWN_ERROR",
        details: error.message,
      },
    }

    if (responseData) {
      // Your backend's actual error shape
      handledError = {
        ...responseData, // keep success, message, error object
        message: responseData.message || "Request failed",
      }

      // Special handling for auth errors
      if (
        status === 401 ||
        responseData.error?.code === "AUTH_TOKEN_NOT_FOUND"
      ) {
        // Example: auto-logout or redirect
        console.warn("Auth error detected - token invalid or missing")
        // clearAuthCookies() // if you have this helper
        // window.location.href = '/login?reason=unauthorized' // or use next/navigation
      }
    }

    // Optional: global toast or notification
    // toast.error(handledError.error.code || handledError.message)

    // Reject with clean error object
    return Promise.reject(handledError)
  },
)
export default API
