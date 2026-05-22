// Server-side Supabase client (for API routes, middleware, server components).
// Reads/writes the session cookie so it stays in sync with the browser client.

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component — middleware refreshes the session,
          // so swallowing here is safe.
        }
      },
    },
  })
}
