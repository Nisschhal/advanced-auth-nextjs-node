// 1. Load environment variables from .env file automatically
//    This makes process.env.PORT, process.env.JWT_SECRET, etc. available
//    "dotenv/config" is a special import that runs dotenv.config() behind the scenes
import "dotenv/config"

// 2. Import Express and its type helpers (Request, Response)
//    We use these types for better TypeScript autocompletion on req/res
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"

// 3. Import cors middleware — allows frontend (different origin) to call this backend
import cors from "cors"

// 4. Import cookie-parser — parses cookies from requests (very important for httpOnly JWT)
import cookieParser from "cookie-parser"

// 5. Import your central config file (loaded from .env with safe defaults)
import { config } from "./config/app.config.js"
import { connectDatabase } from "./database/db.js"
import { errorHandler } from "./middlewares/errorHandler.middleware.js"
import { HTTPSTATUS } from "./config/http.config.js"
import { asyncHandler } from "./middlewares/asyncHandler.middlware.js"
import { BadRequestException } from "./commons/utils/catch-errors.js"
import authRoutes from "./modules/auth/auth.routes.js"

import passport from "@/middlewares/passport.middleware.js"
import sessionRoutes from "./modules/session/session.route.js"
import { authJWT } from "./commons/strategies/jwt.strategy.js"
import mfaRoutes from "./modules/mfa/mfa.route.js"

// Create the main Express application instance
// This 'app' is your entire server — routes, middleware, etc. attach here
const app = express()

// api/v1
const BASE_PATH = config.BASE_PATH

// -----------------------------------------------------------------------------
//                  BODY PARSING (VERY IMPORTANT FOR APIs)
// -----------------------------------------------------------------------------

// Parse incoming JSON request bodies (e.g. { "email": "user@example.com" })
// Limit 10mb to prevent huge payloads crashing the server (default is only 100kb)
app.use(express.json({ limit: "10mb" }))

// Parse URL-encoded form bodies (HTML <form> submissions)
// extended: true → supports nested objects (e.g. address[city]=Kathmandu)
// Again, 10mb limit for safety
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// -----------------------------------------------------------------------------
//                  CORS CONFIGURATION (SECURITY + FRONTEND ACCESS)
// -----------------------------------------------------------------------------

// Allow frontend (e.g. http://localhost:3000) to call this backend
// credentials: true → allows cookies (httpOnly JWT) to be sent/received
// origin: config.APP_ORIGIN → only allow specific frontend URL (safer than "*")
app.use(
  cors({
    origin: [config.APP_ORIGIN, "*"], // e.g. "http://localhost:3000" or your production frontend
    credentials: true, // ← MUST be true if using cookies/JWT in browser
  }),
)

// -----------------------------------------------------------------------------
//                  COOKIE PARSER (NEEDED FOR READING COOKIES)
// -----------------------------------------------------------------------------

// Parses cookies from incoming requests → req.cookies.jwt, req.signedCookies, etc.
// Required when using httpOnly cookies for JWT (most secure way)
app.use(cookieParser())
app.use(passport.initialize())

// -----------------------------------------------------------------------------
//                  ROUTES (your actual API endpoints)
// -----------------------------------------------------------------------------

// Basic health-check / root route — returns simple JSON
// Useful for testing if server is alive (e.g. load balancers, frontend ping)
app.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    // throw new BadRequestException("Bad request")
    res.status(HTTPSTATUS.OK).json({
      message: "Hello World!",
      // Optional: show environment & port for debugging
      // environment: config.NODE_ENV,
      // port: config.PORT
    })
  }),
)

// ---------- Auth Routes
app.use(`${BASE_PATH}/auth`, authRoutes)
// ---------- Multi-Factor-Auth Routes
app.use(`${BASE_PATH}/mfa`, authJWT, mfaRoutes)
// ---------- Session Routes
app.use(`${BASE_PATH}/session`, authJWT, sessionRoutes)

// Catch-all 404 — MUST be after all routes
app.use((req: Request, res: Response) => {
  res.status(HTTPSTATUS.NOT_FOUND).json({
    success: false,
    message: "Not Found",
    error: {
      code: "NOT_FOUND",
      details: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    },
  })
})

//----------- ERROR HANDLER MIDDLEARE
app.use(errorHandler)

// -----------------------------------------------------------------------------
//                  START THE SERVER
// -----------------------------------------------------------------------------
// ────────────────────────────────────────────────
//              STARTUP SEQUENCE
// ────────────────────────────────────────────────

async function startServer() {
  try {
    const dbConnected = await connectDatabase()

    if (!dbConnected) {
      console.error("Cannot start server: database connection failed")
      process.exit(1) // ← important in production
    }

    app.listen(Number(config.PORT), () => {
      console.log(
        `Server listening on port ${config.PORT} in ${config.NODE_ENV} mode`,
      )
      console.log(`CORS allowed origin: ${config.APP_ORIGIN}`)
    })
  } catch (err) {
    console.error("Fatal startup error:", err)
    process.exit(1)
  }
}

startServer()
