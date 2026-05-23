# Eco-Tracker — Beginner Roadmap

> Personal copy you can open anytime. Last updated 2026-05-24.

## Context

You're building **Eco-Tracker**, a school food-waste app. Architecture:

- **Website** (Next.js + Supabase + R2) at `web/` — students sign in, see credits, leaderboards, redeem rewards.
- **Tracking Station** (Python + YOLO) at `station/` — runs on a Raspberry Pi (laptop today). Scans a tray, scores waste, writes to Supabase + R2.
- **ML pipeline** at `ml/` — converts Label Studio exports → YOLO format → trained `best.pt`.

Hardware on hand: Raspberry Pi 5 + Camera Module 3 + second camera + kitchen scale (not connected yet — laptop dev mode for now).

---

## The big picture (in plain English)

Four pieces talk to each other:

1. **Tracking Station (Pi or laptop)** — watches student's face, scans tray, runs YOLO, calculates score.
2. **Website (Next.js)** — students/staff log in to see credits, leaderboards, rewards.
3. **Database (Supabase)** — students, credits, meal history. Pi and website both read/write.
4. **File Store (Cloudflare R2)** — images: tray photos, student face photos.

```
   [Raspberry Pi + Cameras + Scale]
              │  runs YOLO model, gets scores
              ▼
   [Supabase database]  ◄────►  [Next.js website]
              │                       ▲
              ▼                       │
   [Cloudflare R2 (images)]  ◄────────┘
```

---

## Progress

| Step | Status | Done? |
|---|---|---|
| 1. Restructure workspace into one repo | ✅ | yes |
| 2. Run v0 app locally | ✅ | yes |
| 3. Move v0 into `web/` + commit | ✅ | yes |
| 4. Supabase: tables, RLS, GRANTs, replace hardcoded data | ✅ | yes |
| 5. Cloudflare R2: image upload from web + station | ✅ | yes |
| 6a. Train YOLO model from Label Studio export | ✅ | yes — mAP50 0.59 on 90 imgs |
| 6b. Pi script with stub scoring | ✅ | yes — laptop dev mode |
| 6c. Wire trained `best.pt` into station | ✅ | yes |
| 6d. Face registration (capture + upload + save photo_url) | ✅ | yes |
| 7. Auth: email/username + password sign in | ✅ | yes |
| 8. Face login (separate from registration) | ⏳ | not started |
| 9. Deploy web to Vercel | ⏳ | not started |
| 10. Replace station hardware stubs (Pi cameras, scale) | ⏳ | when Pi arrives |
| 11. Improve YOLO accuracy (more labeled images) | ⏳ | when time permits |

---

## What's next (in order)

### A. Capture optional face photo at signup *(small)*
Today, signup creates an account but face registration happens separately later in User Management. Make signup optionally let the student snap their face photo on the spot. Reuse `FaceRegistrationModal`.

### B. Improve YOLO model when time allows *(medium)*
First model has these weaknesses (from the val set):
- `compartment_bit_waste` mAP50 = 0.24 (only 7 examples in val)
- `big_compartment_bit_waste` mAP50 = 0.09 (only 1 example)
- Strong classes: `compartment_no_waste` 0.93, `big_compartment_no_waste` 0.99

To improve: label 50–100 more trays in Label Studio, especially "bit of waste" cases. Then re-run:
```bash
cd ml && source .venv/Scripts/activate
python json_to_yolo.py /path/to/new-export.json
python split_dataset.py
yolo detect train data=data.yaml model=yolov8n.pt epochs=50 imgsz=640
cp runs/detect/train/weights/best.pt ../station/best.pt
```

### C. Face login on the Tracking Station only *(medium, security-sensitive)*
**NOT** in the browser — too easy to spoof with a photo of the student. Instead: on the Pi/station screen, run face recognition locally (compute embedding from camera frame, find nearest student in Supabase). Use `face_recognition` Python lib or InsightFace.

### D. Deploy `web/` to Vercel *(medium)*
- Push to GitHub already (`Kerosenic/Eco-Tracker`).
- Vercel imports the repo, picks the `web/` subfolder, reads `web/.env.local` keys (paste them into Vercel's env var UI — never commit).
- Re-enable Supabase email confirmation before going live.
- Rotate any keys that were shared in chat.

### E. Hardware integration when Pi arrives *(big)*
- Top-down camera → replaces `Path("sample-tray.jpg")` in `scan.py`.
- Face camera → triggers a scan when a face appears.
- Scale → replaces `random.uniform(0, 350)` in `fake_weight_g()`.
- Tested deployment: Pi runs `scan.py` on boot via systemd.

---

## Project structure

```
Eco-Tracker/
├── README.md
├── PLAN.md                          ← this file
├── CLAUDE.md
├── .gitignore
├── web/                             ← Next.js app
│   ├── app/                         (page.tsx, login/, signup/, api/)
│   ├── components/face-registration-modal.tsx
│   ├── lib/supabase.ts, supabase-server.ts, r2.ts
│   ├── middleware.ts                ← auth gate
│   └── supabase/schema.sql
├── station/                         ← Python — tray scanning
│   ├── scan.py                      ← end-to-end scan loop
│   ├── score.py                     ← YOLO inference (falls back to stub if no weights)
│   ├── db.py                        ← Supabase + R2 clients
│   ├── best.pt                      ← trained YOLO weights (committed, 6.3 MB)
│   ├── requirements.txt
│   └── .python-version              ← pinned to 3.12.8 via pyenv-win
└── ml/                              ← model training
    ├── data.yaml                    ← Ultralytics config (8 classes)
    ├── download_images.py           ← R2 → ml/dataset/images/
    ├── json_to_yolo.py              ← JSON-MIN → YOLO labels (with waste levels)
    ├── split_dataset.py             ← 80/20 train/val split
    └── dataset/                     ← gitignored: images + labels
```

---

## Class layout (YOLO)

8 classes total — combination of compartment type + waste level:

| Class ID | Name |
|---|---|
| 0 | compartment_no_waste |
| 1 | compartment_bit_waste |
| 2 | compartment_some_waste |
| 3 | compartment_full_waste |
| 4 | big_compartment_no_waste |
| 5 | big_compartment_bit_waste |
| 6 | big_compartment_some_waste |
| 7 | big_compartment_full_waste |

Score formula: small compartments count once, big compartments count twice. Max possible = 3×4 + 3×2 = 18.

---

## Key files to know

| File | What it does |
|---|---|
| `web/app/page.tsx` | Main dashboard (5 tabs). Reads everything from Supabase. |
| `web/middleware.ts` | Redirects unauthenticated users to `/login`. |
| `web/app/api/auth/signup/route.ts` | Creates auth user + students row, links them. |
| `web/app/api/upload/route.ts` | Server-side R2 uploader (kind: tray or student). |
| `web/lib/supabase.ts` | Browser Supabase client. |
| `web/lib/supabase-server.ts` | Server-side client with cookie sync. |
| `web/lib/r2.ts` | R2 (S3-compat) client + signed URL helpers. |
| `station/scan.py` | One scan: pick student → score → upload → DB write. |
| `station/score.py` | `score_tray(photo) → (compartment_scores, total)`. Real YOLO if `best.pt` present, stub otherwise. |
| `ml/data.yaml` | Ultralytics dataset config (path, train/val splits, class names). |

---

## Verification (each milestone)

- ✅ **v0 app locally:** `http://localhost:3000` loads the dashboard.
- ✅ **Supabase:** a row inserted in DB shows on the leaderboard.
- ✅ **R2:** photo uploaded from website ends up in R2 and the URL is saved to Supabase.
- ✅ **Stub Pi script:** `python scan.py` writes a `meals` row and updates credits.
- ✅ **Real YOLO:** `python scan.py` with `best.pt` present detects compartments + waste levels.
- ⏳ **Face login on Pi:** scan a face → Supabase finds match → student logged in.
- ⏳ **Vercel deploy:** real URL works for someone else (not localhost).
- ⏳ **Pi hardware:** real cameras + scale wired in, scanning a real tray works end-to-end.

---

## Operational notes (don't forget these before production)

- `.env.local` is gitignored — never commit it.
- Secret keys (`sb_secret_*`, `R2_SECRET_ACCESS_KEY`) must NOT have a `NEXT_PUBLIC_` prefix.
- R2 keys + Supabase secret key were shared in chat earlier — rotate before real deployment.
- Supabase email confirmation is currently OFF (dev convenience). Re-enable in Supabase → Auth → Providers → Email before launch.
- Face login from a regular browser is a child-safety risk (photo spoof). Restrict to the kiosk device only.

---

## Glossary

- **Node.js** — the JavaScript runtime.
- **pnpm** — package manager for the website.
- **Next.js** — React framework for building the website.
- **Supabase** — hosted Postgres + auth + storage.
- **RLS** — Row-Level Security: the policy "who can read which row" in Supabase.
- **GRANT** — Postgres-level "this role is allowed to touch the table at all". RLS + GRANT both must pass.
- **R2** — Cloudflare's S3-compatible file storage.
- **YOLO** — object-detection model family. We use Ultralytics' YOLOv8.
- **mAP50** — Mean Average Precision at IoU 50% — how good the model is at detecting + classifying. 0.5 is OK, 0.7+ is good.
- **Embedding** — list of numbers representing a face/dish/anything. Used for face recognition.
- **`.env.local`** — secret-key file. Gitignored.
- **Vercel** — Next.js host (free tier).
- **pyenv-win** — manages multiple Python versions on Windows. Pinned to 3.12.8 here.
