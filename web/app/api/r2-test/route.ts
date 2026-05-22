// GET /api/r2-test — verifies the R2 credentials work by listing the first
// few objects in the bucket. Used during setup; safe to delete later.

import { NextResponse } from "next/server"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { r2, R2_BUCKET } from "@/lib/r2"

export const runtime = "nodejs"

export async function GET() {
  try {
    const result = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 }))
    return NextResponse.json({
      ok: true,
      bucket: R2_BUCKET,
      sampleObjectCount: result.Contents?.length ?? 0,
      keys: result.Contents?.map((o) => o.Key) ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "r2 connection failed"
    console.error("R2 test failed:", err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
