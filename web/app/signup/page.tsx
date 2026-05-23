"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Leaf, ScanFace, ArrowRight } from "lucide-react"
import { FaceRegistrationModal } from "@/components/face-registration-modal"

type Step = "form" | "choose" | "scanning"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("form")
  const [form, setForm] = useState({ email: "", username: "", password: "", name: "", class: "" })
  const [studentId, setStudentId] = useState<string | null>(null)
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
      const json = (await res.json().catch(() => ({}))) as { error?: string; studentId?: string }
      if (!res.ok || !json.studentId) throw new Error(json.error ?? "signup failed")

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInErr) throw new Error(signInErr.message)

      setStudentId(json.studentId)
      setStep("choose")
    } catch (err) {
      setError(err instanceof Error ? err.message : "signup failed")
    } finally {
      setSubmitting(false)
    }
  }

  function finish() {
    router.replace("/")
    router.refresh()
  }

  if (step === "form") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Leaf className="text-green-600" size={28} />
            <h1 className="text-2xl font-semibold text-gray-900">Eco-Tracker</h1>
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">
            All fields are required. You can register your face after this step.
          </p>

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
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              autoComplete="email"
            />
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="text-green-600" size={28} />
          <h1 className="text-2xl font-semibold text-gray-900">Eco-Tracker</h1>
        </div>
        <h2 className="text-xl font-medium text-gray-800 mb-2">Account created</h2>
        <p className="text-sm text-gray-600 mb-6">
          Want to register your face now? It lets the cafeteria station recognise you when you scan a tray. You can
          always do this later from User Management.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStep("scanning")}
            className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
          >
            <ScanFace size={18} /> Register my face
          </button>
          <button
            type="button"
            onClick={finish}
            className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg"
          >
            Skip for now <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {studentId && (
        <FaceRegistrationModal
          open={step === "scanning"}
          studentId={studentId}
          studentName={form.name}
          onClose={finish}
          onRegistered={finish}
        />
      )}
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
