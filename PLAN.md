# Eco-Tracker — Beginner Roadmap

> Personal copy you can open anytime. Last updated 2026-05-22.

## Context

You're building **Eco-Tracker**, a school food-waste app. Right now you have:

- A polished v0.app frontend prototype at `c:\Users\ry1qa\Desktop\eco-tracker-web-app\` (Next.js 16 + React 19, ~1200-line single-page UI in `app/page.tsx`). All data is hardcoded; the "AI scan" is `Math.random()`.
- A near-empty git repo at `c:\Users\ry1qa\Desktop\EcoTracker\Eco-Tracker\` (just a 2-line README).
- A Cloudflare R2 bucket holding tray photos for Label Studio training.
- A custom object-detection model being trained in Label Studio (not yet exported).
- A Raspberry Pi 5 + Camera Module 3 + a second camera + a kitchen scale.

Goal of this plan: get you from "v0 prototype with fake data" to "working app with real students, real credits, real model scoring," in beginner-friendly steps.

---

## The big picture (in plain English)

Four pieces that talk to each other:

1. **The Tracking Station (Raspberry Pi)** — sits on the cafeteria wall. Two cameras + scale. Watches student face, scans tray, runs the AI model, calculates the score.
2. **The Website (Next.js — what v0 built you)** — students/staff log in to see credits, leaderboards, rewards.
3. **The Database (Supabase)** — a hosted spreadsheet-like store. Holds students, credits, meal history. Both the Pi and the website read/write to it.
4. **The File Store (Cloudflare R2)** — holds images: tray photos, student profile pictures.

```
   [Raspberry Pi + Cameras + Scale]
              │  runs the AI model, gets scores
              ▼
   [Supabase database]  ◄────►  [Next.js website]
              │                       ▲
              ▼                       │
   [Cloudflare R2 (images)]  ◄────────┘
```

---

## Step 1 — Restructure your workspace

One git project that holds everything:

```
Eco-Tracker/
├── README.md
├── web/              ← the v0 Next.js app moves here
├── station/          ← Raspberry Pi code (added later)
├── ml/               ← model training/export scripts (added later)
└── docs/             ← your PDF + plans
```

---

## Step 2 — Run the v0 app on your computer (FIRST technical step)

**One-time installs:**
1. **Node.js LTS** — nodejs.org. ✅ already installed (v24).
2. **pnpm** — run `npm install -g pnpm` in PowerShell. ✅ done.
3. **Git** — git-scm.com. ✅ already installed.
4. **VS Code** — already in use.

**In VS Code's terminal, from `eco-tracker-web-app` folder:**
```
pnpm install        # ✅ done — downloaded dependencies
pnpm dev            # starts the website on http://localhost:3000
```

Open `http://localhost:3000` in your browser → dashboard appears. Webcam permission will be requested in the Tracking Station tab. The "AI scoring" is still fake at this stage.

---

## Step 3 — Move the v0 app into the git repo

1. Copy `eco-tracker-web-app/*` → `Eco-Tracker/web/`.
2. Make sure `node_modules/` and `.next/` are in `.gitignore` (huge generated folders, don't belong in git).
3. Commit and push.

---

## Step 4 — Set up Supabase (the database)

1. Sign up at supabase.com (free tier).
2. Create a project. Save the project URL and anon key — these go in `web/.env.local`.
3. Create tables in the Supabase dashboard:
   - **students** — id, name, class, face_embedding, created_at.
   - **meals** — id, student_id, total_score, eco_credits, co2_saved_g, weight_g, photo_url, created_at, per-compartment scores.
   - **rewards** — id, name, cost_credits, image_url, stock.
   - **redemptions** — id, student_id, reward_id, created_at.
4. `pnpm add @supabase/supabase-js` inside `web/`.
5. Create `web/lib/supabase.ts` to connect.
6. Replace each hardcoded array in `app/page.tsx` (`individualLeaderboard`, `mealHistory`, `currentUser`…) with a real Supabase query.

Supabase has built-in login → use it for "students log in."

---

## Step 5 — Connect Cloudflare R2 (images)

- R2 is "S3-compatible" → use `@aws-sdk/client-s3`.
- Pi or website uploads an image, gets back a URL, saves URL in `meals.photo_url`.
- Use short-lived "signed URLs" for private images.

Done after Supabase is working.

---

## Step 6 — Connect the Label Studio model to the UI

**Approach: prototype on the Pi, designed so it can move to the cloud later.**

### 6a. Export the model from Label Studio
Train YOLOv8 / YOLO11 (Ultralytics). Export gives you `best.pt`.

### 6b. Run the model on the Pi (prototype phase)
Python script `station/scan.py`:
1. Watch face cam → identify student → look up `student_id` in Supabase.
2. Read scale weight.
3. Take tray photo with top-down cam.
4. Run YOLO model → bounding boxes + how full each compartment is.
5. Calculate scores (0=empty, 1=bit, 2=some, 3=full waste; large compartment counts twice).
6. Upload photo to R2.
7. Insert row into Supabase `meals`.

The website reads from Supabase, so the dashboard updates automatically.

### 6c. Cloud-ready design
Wrap model call in one function: `score_tray(image) -> compartment_scores`. Today loads local `.pt`. Later swap body to call cloud endpoint (Hugging Face, Roboflow). Nothing else changes.

### 6d. Face recognition
Separate small model (`face_recognition` library or InsightFace). Compute face embedding (~128 numbers), save on `students` row. At scan time, find closest match in DB.

---

## Step 7 — Wire it all together (order)

1. ✅ Run the v0 app locally (Step 2). **← currently here**
2. Restructure into the unified repo (Step 3).
3. Replace one hardcoded array (e.g. `mealHistory`) with a Supabase query — proves DB works.
4. Build out the rest of the tables and queries.
5. Add Supabase login (replace fake `currentUser`).
6. Set up R2 image upload from website.
7. Build Pi script with stub `score_tray` returning random scores — proves Pi → Supabase → website data flow.
8. Plug in real YOLO model.
9. Add face recognition.
10. Polish, deploy website (Vercel — free for Next.js).

---

## Critical files to touch

| File | What we do to it |
|---|---|
| `web/app/page.tsx` | Replace hardcoded arrays with Supabase queries; split into smaller files later |
| `web/package.json` | Add `@supabase/supabase-js`, `@aws-sdk/client-s3` |
| `web/lib/supabase.ts` *(new)* | Connection to Supabase |
| `web/lib/r2.ts` *(new)* | Upload/download helpers for R2 |
| `web/.env.local` *(new, gitignored)* | Secret keys (Supabase URL, R2 keys) — NEVER commit |
| `station/scan.py` *(new, later)* | Pi script: cameras → model → Supabase |
| `ml/train.ipynb` *(new, later)* | Notebook for retraining the YOLO model |

---

## Verification (how you know each step worked)

- **Step 2 done:** `http://localhost:3000` loads the dashboard with all 5 tabs.
- **Step 4 done:** a row inserted in Supabase shows up on the website's Leaderboard.
- **Step 5 done:** uploading a photo from the website lands the image in R2; URL appears in Supabase.
- **Step 6 done:** placing a real tray under the camera produces a row in `meals` within ~5 seconds, and the student's credits update on the website.

---

## Glossary (in plain English)

- **Node.js** — the JavaScript runtime. Lets your computer run JavaScript code outside a browser.
- **pnpm** — package manager. Downloads the helper libraries (~400 of them) the app needs.
- **Next.js** — the framework v0 used. A flavor of React for building websites.
- **Supabase** — a hosted database with a friendly web dashboard.
- **R2** — Cloudflare's file storage (like Google Drive for code).
- **YOLO** — a popular family of object-detection models. What Label Studio will train.
- **Embedding** — a list of numbers that represents a face (or anything) so a computer can compare.
- **`.env.local`** — secret file with passwords/keys. Ignored by git.
- **Vercel** — the company behind Next.js. Free hosting for Next.js sites.
