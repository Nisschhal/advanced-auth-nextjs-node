## Dependencies

    -

## Implementation Details

1. `npm init -y`
2. install:

```js
  npm install \
  bcrypt \
  cookie-parser \
  cors \
  date-fns-tz \
  dotenv \
  express \
  jsonwebtoken \
  @prisma/client @prisma/adapter-pg pg \
  passport \
  passport-jwt \
  qrcode \
  resend \
  speakeasy \
  zod
```

```js
    npm install -D \
  @types/bcrypt \
  @types/cookie-parser \
  @types/cors \
  @types/dotenv \
  @types/express \
  @types/jsonwebtoken \
  @types/passport \
  @types/passport-jwt \
  @types/qrcode \
  @types/speakeasy \
  prisma \
  ts-node-dev \
  typescript \
  tsx
```

3. Initalize TS: `npx tsc --init`
   - create `tsconfig.json` file to control TS behaviours
   - add

   ```json
         "compilerOptions": {
        //..others
        // File Layout
        "rootDir": "./src",
        "outDir": "./dist",
         },
        // .. others
        "include": ["src/**/*.ts", "@types"],
        "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
   ```

   - update package.json file

     ```json

     "scripts": {
         "dev": "tsx watch src/index.ts",
         "build": "tsc && cp ./package.json ./dist",
         "start": "node dist/index.js"
     },
     ```

## github

Before Adding to github make sure you have `gitignore` file.
If not then run: `npx gitignore node`, this will create the file.

## Db connection

1. init prisma: `npx prisma init`
   - creates prisma/schema.prisma, prisma.config.ts and .env with DATABASE_URL
   - replace the DATABASE_URL with your desired url: either cloud or local

2. create `/src/common/lib/prisma.ts` for prisma client
   - copy paste the code this create only one prisma client
   - to get prisma client you need to run `npx primsa generate`
     - this creates `/src/generated` files which contains all the prisma schemas TS and clients
     - use that or import for `/src/common/lib/prisma.ts` to get prismaClient

## Middleware `src/middleware`

- create errorhandler middleware
- also create asyncHandler to drill down the error to the errorhandlerMiddleware if any error occurs in any route.
  - asynchandler warps the controller and if error occurs it passes error to next part

## Tokens: Access/Refresh with Session in DB

```text
Incoming request
  ↓
Is access token valid & not expired?
  ├─ Yes ──► Proceed (authenticated)
  └─ No ──► Do we have a valid refresh token?
               ├─ Yes ──► Does the linked session still exist & not expired & not revoked?
               │             ├─ Yes ──► Issue new access token → Proceed
               │             └─ No ──► 401 Unauthorized (refresh useless here)
               └─ No ──► 401 Unauthorized (must login)
```

## Passport with JWT Strategies

1. install required deps:

- passport: engine
- password-jwt: stragegy others: google-auth
- @types/passport, @types/passport-jwt for TS

## Implemntation JWT

Here’s a clean, minimal JWT implementation from scratch — exactly in **your style** (cookies + Prisma session + refresh + your existing utils pattern).

No Passport, no extra libraries beyond `jsonwebtoken`.  
Just pure Express + JWT + your cookie helpers + Prisma.

### 1. Utils / JWT (keep or replace your current)

`src/utils/jwt.utils.ts`

```ts
import jwt from "jsonwebtoken"
import { config } from "@/config/app.config.js"

// Payloads
export interface AccessPayload {
  userId: string
  sessionId: string
}

export interface RefreshPayload {
  sessionId: string
}

// Sign access token (short-lived)
export const signAccessToken = (payload: AccessPayload): string => {
  return jwt.sign(payload, config.JWT.SECRET, {
    expiresIn: config.JWT.EXPIRES_IN ?? "15m",
    audience: ["user"],
  })
}

// Sign refresh token (long-lived)
export const signRefreshToken = (payload: RefreshPayload): string => {
  return jwt.sign(payload, config.JWT.REFRESH_SECRET, {
    expiresIn: config.JWT.REFRESH_EXPIRES_IN ?? "7d",
    audience: ["user"],
  })
}

// Verify any token (used in middleware & refresh)
export const verifyToken = <T = any>(
  token: string,
  secret: string,
): T | null => {
  try {
    return jwt.verify(token, secret) as T
  } catch {
    return null
  }
}
```

### 2. Cookie Helpers (your existing — just for reference)

`src/utils/cookie.utils.ts`

```ts
import type { Response, CookieOptions } from "express"
import { getExpirationDate } from "./date-time.js"
import { config } from "@/config/app.config.js"

const defaults: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
}

export const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
): Response => {
  const accessExpires = getExpirationDate(config.JWT.EXPIRES_IN ?? "15m")
  const refreshExpires = getExpirationDate(
    config.JWT.REFRESH_EXPIRES_IN ?? "7d",
  )

  res.cookie("accessToken", accessToken, {
    ...defaults,
    expires: accessExpires,
    path: "/",
  })
  res.cookie("refreshToken", refreshToken, {
    ...defaults,
    expires: refreshExpires,
    path: REFRESH_PATH,
  })

  return res
}

export const clearAuthCookies = (res: Response): Response => {
  res.clearCookie("accessToken", { path: "/" })
  res.clearCookie("refreshToken", { path: REFRESH_PATH })
  return res
}
```

### 3. Auth Service (your style — only login & refresh)

`src/services/auth.service.ts`

```ts
import prisma from "@/commons/lib/prisma.js"
import { compareHashValue, hashValue } from "@/commons/utils/bcrypt-hash.js"
import {
  BadRequestException,
  UnauthorizedException,
} from "@/commons/utils/catch-errors.js"
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "@/utils/jwt.utils.js"
import { XDaysFromNow } from "@/utils/date-time.js"
import { safeUser } from "./user.utils" // your safeUser function

export class AuthService {
  async login({
    email,
    password,
    userAgent,
  }: {
    email: string
    password: string
    userAgent?: string
  }) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { preferences: true },
    })

    if (!user || !(await compareHashValue(password, user.password))) {
      throw new BadRequestException(
        "Invalid email or password",
        "AUTH_INVALID_CREDENTIALS",
      )
    }

    // Create session (long-lived)
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: userAgent ?? null,
        expiredAt: XDaysFromNow(14), // match refresh lifetime
      },
    })

    const accessToken = signAccessToken({
      userId: user.id,
      sessionId: session.id,
    })

    const refreshToken = signRefreshToken({
      sessionId: session.id,
    })

    return {
      success: true,
      message: "Login successful",
      data: {
        user: safeUser(user),
      },
    }
  }

  async refresh(refreshToken: string) {
    // Verify refresh token
    const payload = verifyToken<RefreshPayload>(
      refreshToken,
      config.JWT.REFRESH_SECRET,
    )
    if (!payload) {
      throw new UnauthorizedException("Invalid or expired refresh token")
    }

    // Check session
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    })

    if (!session || session.expiredAt < new Date()) {
      throw new UnauthorizedException("Session expired or invalid")
    }

    // Issue new access token
    const accessToken = signAccessToken({
      userId: session.userId,
      sessionId: session.id,
    })

    // Optional: rotate refresh token
    const newRefreshToken = signRefreshToken({ sessionId: session.id })

    // Extend session life
    await prisma.session.update({
      where: { id: session.id },
      data: { expiredAt: XDaysFromNow(14) },
    })

    return {
      success: true,
      message: "Tokens refreshed",
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    }
  }
}
```

### 4. Auth Controller (minimal)

`src/controllers/auth.controller.ts`

```ts
import { Request, Response } from "express"
import { AuthService } from "../services/auth.service"
import { asyncHandler } from "../middlewares/asyncHandler.middleware"
import { setAuthCookies, clearAuthCookies } from "../utils/cookie.utils"
import { HTTPSTATUS } from "@/config/http.config"

const authService = new AuthService()

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body
    const userAgent = req.headers["user-agent"] || ""

    const result = await authService.login({ email, password, userAgent })

    if (result.success) {
      // Assume tokens are returned from service if needed
      // In practice: generate here or adjust service
      const { accessToken, refreshToken } = result.data // adjust if needed
      setAuthCookies(res, accessToken, refreshToken)
    }

    res.status(HTTPSTATUS.OK).json(result)
  })

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token")
    }

    const result = await authService.refresh(refreshToken)

    if (result.success) {
      setAuthCookies(res, result.data.accessToken, result.data.refreshToken)
    }

    res.status(HTTPSTATUS.OK).json(result)
  })
}
```

### 5. Protected Route Example

`src/middlewares/auth.middleware.ts`

```ts
import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../utils/jwt.utils"
import { config } from "@/config/app.config"

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" })
  }

  const payload = verifyToken(token, config.JWT.SECRET)

  if (!payload) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" })
  }

  req.user = payload // attach payload
  next()
}
```

Use in routes:

```ts
router.get("/profile", protect, (req, res) => {
  res.json({ user: req.user })
})
```

### Summary — your way, from scratch

- **Login**: verify credentials → create session → sign tokens → set cookies
- **Refresh**: verify refresh token → check session → new access (optional new refresh) → set cookies
- **Protected routes**: extract token from cookie → verify → attach payload → proceed
- No external libs beyond `jsonwebtoken` + `cookie-parser`

This is **your style**: simple, explicit, cookie-based, Prisma session-backed.

If you want to add:

- Logout (clear cookies + delete session)
- Role check in middleware
- Or Swagger Bearer support

Just say — I’ll give the exact code. 😊

# How Passport + JWT Authentication Works in Your App

### Simple Diagram: Request → Authentication → Success / Failure

```mermaid
flowchart TD
    A[1. User sends request<br>e.g. GET /profile] --> B[2. Route has authJWT middleware<br>passport.authenticate('jwt', {session: false})]

    B --> C{3. Passport runs JwtStrategy}
    C --> D[4. Extract token from cookie<br>req.cookies.accessToken]
    D --> E[5. Verify token automatically<br>signature + expiry + audience + algorithm]
    E -->|Fail| F[Passport auto sends 401 Unauthorized<br>No code needed from you]
    E -->|Pass| G[6. Call your verify callback<br>async (req, payload, done)]

    G --> H[7. Your code checks DB<br>find user by payload.userId<br>check session if needed]
    H -->|User exists + session valid| I[done(null, user)<br>Passport sets req.user = user]
    H -->|User missing / session bad| J[done(null, false)<br>Passport sends 401]

    I --> K[8. Route handler runs<br>req.user is available<br>Business logic executes]
    K --> L[9. Response sent to user<br>e.g. res.json({ user: req.user })]

    J --> F
```
