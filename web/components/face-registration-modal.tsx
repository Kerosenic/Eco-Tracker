"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X, RefreshCw, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Props = {
  studentId: string
  studentName: string
  open: boolean
  onClose: () => void
  onRegistered: (photoUrl: string) => void
}

export function FaceRegistrationModal({ studentId, studentName, open, onClose, onRegistered }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        setStatus(err instanceof Error ? `Camera error: ${err.message}` : "Could not access camera")
      }
    }
    start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setCapturedDataUrl(null)
      setStatus(null)
    }
  }, [open])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.9))
  }

  function retake() {
    setCapturedDataUrl(null)
    setStatus(null)
  }

  async function save() {
    if (!capturedDataUrl) return
    setSubmitting(true)
    setStatus("Uploading...")
    try {
      const blob = await (await fetch(capturedDataUrl)).blob()
      const formData = new FormData()
      formData.append("file", new File([blob], `${studentId}.jpg`, { type: "image/jpeg" }))
      formData.append("kind", "student")

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = (await uploadRes.json()) as { key?: string; url?: string; error?: string }
      if (!uploadRes.ok || !uploadJson.key) throw new Error(uploadJson.error ?? "upload failed")

      const { error: updateErr } = await supabase
        .from("students")
        .update({ photo_url: uploadJson.key })
        .eq("id", studentId)
      if (updateErr) throw new Error(updateErr.message)

      setStatus("Saved.")
      onRegistered(uploadJson.url ?? uploadJson.key)
      setTimeout(onClose, 800)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "save failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Register face scan</h2>
            <p className="text-sm text-gray-500">For {studentName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="captured" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
          </div>

          {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}

          <div className="mt-4 flex gap-3">
            {!capturedDataUrl ? (
              <button
                type="button"
                onClick={capture}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700"
              >
                <Camera size={18} /> Capture
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retake}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw size={18} /> Retake
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check size={18} /> {submitting ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
