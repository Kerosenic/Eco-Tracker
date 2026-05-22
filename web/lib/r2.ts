// Cloudflare R2 client — used only on the server (API routes).
// R2 is S3-compatible, so we reuse the standard AWS S3 SDK and just point it
// at Cloudflare's endpoint. Credentials live in env vars and must never be
// imported into a browser bundle.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET
const endpoint = process.env.R2_ENDPOINT

if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
  throw new Error(
    "Missing R2 env vars. Check web/.env.local — needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT.",
  )
}

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
})

export const R2_BUCKET = bucket

export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return key
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  })
}
