// POST /api/upload — accepts a multipart form with field "file" (required) and
// "kind" (optional, "tray" | "student", defaults to "tray"). Uploads the file to
// R2 under the matching prefix and returns the storage key + a 1-hour signed URL.
//
// This runs on the server, so the R2 secret credentials never reach the browser.

import { NextResponse } from "next/server"
import { uploadToR2, getSignedDownloadUrl } from "@/lib/r2"

export const runtime = "nodejs"

const PREFIXES = {
  tray: "Tray-Photos",
  student: "Face-Photos",
} as const

type Kind = keyof typeof PREFIXES

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get("file")
    const kindRaw = (form.get("kind") ?? "tray") as string
    const kind: Kind = kindRaw === "student" ? "student" : "tray"

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing 'file' field" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file too large (max 10MB)" }, { status: 413 })
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin"
    const key = `${PREFIXES[kind]}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const bytes = new Uint8Array(await file.arrayBuffer())
    await uploadToR2(key, bytes, file.type || "application/octet-stream")
    const url = await getSignedDownloadUrl(key)

    return NextResponse.json({ key, url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed"
    console.error("R2 upload failed:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
