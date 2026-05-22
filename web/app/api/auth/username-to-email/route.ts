// POST /api/auth/username-to-email — looks up a student's auth email by username.
// Used by the login page so the user can sign in with either email OR username.
// We never expose all student emails publicly — this only resolves one at a time
// and only echoes back the email if the username exists.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  let body: { username?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const username = typeof body.username === "string" ? body.username.trim() : ""
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: student, error } = await admin
    .from("students")
    .select("user_id")
    .ilike("username", username)
    .maybeSingle()

  if (error) {
    console.error("username-to-email lookup failed:", error.message)
    return NextResponse.json({ error: "lookup failed" }, { status: 500 })
  }
  if (!student?.user_id) {
    return NextResponse.json({ error: "no such user" }, { status: 404 })
  }

  const { data: userResp, error: userErr } = await admin.auth.admin.getUserById(student.user_id)
  if (userErr || !userResp?.user?.email) {
    return NextResponse.json({ error: "no such user" }, { status: 404 })
  }

  return NextResponse.json({ email: userResp.user.email })
}
