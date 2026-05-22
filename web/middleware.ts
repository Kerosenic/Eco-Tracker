// Auth gate: any request that isn't on /login, /signup, or /api/auth/* and
// doesn't have a Supabase session is redirected to /login. This is the single
// place auth is enforced for the dashboard.

import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = ["/login", "/signup"]
const PUBLIC_PREFIXES = ["/api/auth/", "/_next/", "/favicon", "/icon", "/apple-icon", "/placeholder"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icon|apple-icon|placeholder).*)"],
}
