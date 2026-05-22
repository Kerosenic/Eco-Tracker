// Browser Supabase client. Uses the SSR helper so the auth session is stored in
// cookies that the server can also read (instead of localStorage, which is
// browser-only). Use this everywhere in client components.

"use client"

import { createBrowserClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(url, anonKey)
