import { NextRequest, NextResponse } from "next/server"

const publicRoutes = [
  "/login",
  "/signup",
  "/reset-password",
  "/forgot-password",
  "/confirm-account",
  "/verify-mfa",
]

const privateRoutes = ["/", "/sessions"] // add more private pages here

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  const hasToken = !!req.cookies.get("accessToken")?.value

  // 1. Logged-in user trying to access public auth pages → send to home
  const isPublic = publicRoutes.includes(path)
  if (isPublic && hasToken) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // 2. Not-logged-in user trying to access protected pages → send to login
  const isPrivate = privateRoutes.includes(path)
  if (isPrivate && !hasToken) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 3. Everything else → continue normally
  return NextResponse.next()
}

// Optional but recommended: tell Next.js which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (/api/*)
     * - static files (/_next/*, /static/*, etc.)
     * - public assets (/favicon.ico, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
