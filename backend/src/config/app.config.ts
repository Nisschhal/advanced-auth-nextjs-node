import { getEnv } from "../commons/utils/get-env.js"

const appConfig = () => ({
  NODE_ENV: getEnv("NODE_ENV", "development"),
  APP_ORIGIN: getEnv("APP_ORIGIN", "http://localhost:3000"),
  PORT: getEnv("PORT", "5000"),
  BASE_PATH: getEnv("BASE_PATH", "/api/v1"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  JWT: {
    SECRET: getEnv("JWT_SECRET"),
    EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
    REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
    REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
  },
})

export const config = appConfig()
