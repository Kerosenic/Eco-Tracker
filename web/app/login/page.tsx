"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Leaf, ScanFace } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resolveEmail(input: string): Promise<string> {
    if (input.includes("@")) return input
    const res = await fetch("/api/auth/username-to-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: input }),
    })
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(error ?? "no account found for that username")
    }
    const { email } = (await res.json()) as { email: string }
    return email
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const email = await resolveEmail(identifier.trim())
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) throw new Error(signInErr.message)
      router.replace("/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "login failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="text-green-600" size={28} />
          <h1 className="text-2xl font-semibold text-gray-900">Eco-Tracker</h1>
        </div>
        <h2 className="text-xl font-medium text-gray-800 mb-1">Sign in</h2>
        <p className="text-sm text-gray-500 mb-6">Use your email or username.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email or username</label>
            <input
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs uppercase tracking-wide text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          disabled
          title="Face login is coming soon"
          className="w-full py-2 flex items-center justify-center gap-2 border border-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed bg-gray-50"
        >
          <ScanFace size={18} />
          Login with face <span className="text-xs text-gray-400">(not implemented yet)</span>
        </button>

        <p className="text-sm text-gray-600 text-center mt-6">
          New here?{" "}
          <Link href="/signup" className="text-green-700 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
