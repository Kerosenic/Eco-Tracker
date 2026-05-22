// POST /api/auth/signup — creates an auth user + a linked students row.
// Body: { email, username, password, name, class }
// Returns 200 on success. The browser then signs in with the same email/password
// to get a session.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Body = {
  email?: string
  username?: string
  password?: string
  name?: string
  class?: string
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const email = body.email?.trim()
  const username = body.username?.trim()
  const password = body.password
  const name = body.name?.trim()
  const studentClass = body.class?.trim()

  if (!email || !username || !password || !name || !studentClass) {
    return NextResponse.json(
      { error: "email, username, password, name, and class are all required" },
      { status: 400 },
    )
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 })
  }
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "username must be 3-32 chars: letters, digits, _ . -" },
      { status: 400 },
    )
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: existing } = await admin
    .from("students")
    .select("id")
    .ilike("username", username)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: "username already taken" }, { status: 409 })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created?.user) {
    const message = createErr?.message ?? "could not create auth user"
    const status = message.toLowerCase().includes("already") ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }

  const { error: insertErr } = await admin.from("students").insert({
    name,
    class: studentClass,
    username,
    user_id: created.user.id,
  })
  if (insertErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
