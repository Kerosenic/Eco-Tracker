"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Leaf } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: "", username: "", password: "", name: "", class: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? "signup failed")

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInErr) throw new Error(signInErr.message)

      router.replace("/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "signup failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="text-green-600" size={28} />
          <h1 className="text-2xl font-semibold text-gray-900">Eco-Tracker</h1>
        </div>
        <h2 className="text-xl font-medium text-gray-800 mb-1">Create account</h2>
        <p className="text-sm text-gray-500 mb-6">All fields are required. Face registration comes after signup.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} autoComplete="name" />
          <Field
            label="Class"
            value={form.class}
            onChange={(v) => update("class", v)}
            placeholder="e.g. 10A"
            autoComplete="off"
          />
          <Field
            label="Username"
            value={form.username}
            onChange={(v) => update("username", v)}
            autoComplete="username"
            placeholder="3-32 chars: letters, digits, _ . -"
          />
          <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} autoComplete="email" />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => update("password", v)}
            autoComplete="new-password"
            placeholder="at least 8 characters"
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-green-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}
