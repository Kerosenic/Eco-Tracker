# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Eco-Tracker is a school food-waste tracking app. The owner is a complete beginner — explanations should stay plain-English and step-by-step. Architecture and roadmap are documented in `PLAN.md`; read it before suggesting structural changes. Today's status: web is wired to Supabase + R2 with auth working; the station pipeline runs end-to-end with stubbed scoring; the trained YOLO model has not been dropped into `station/best.pt` yet.

Four pieces, one repo:

- `web/` — Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4, shadcn/Radix UI, pnpm. The student/staff dashboard.
- `station/` — Python tray-scan pipeline that runs on a Raspberry Pi (or laptop in dev mode). Reads scale + cameras, runs YOLO, uploads tray photo to R2, inserts a row into Supabase.
- `ml/` — Ultralytics YOLO training scripts and dataset config (`data.yaml`). Dataset and `*.pt` weights are gitignored.
- `docs/` — design PDFs.

## Commands

```bash
# web (run from web/)
pnpm install
pnpm dev              # http://localhost:3000
pnpm build
pnpm lint             # eslint .
# convenience: double-click start-dev.bat from repo root

# station (run from station/)
pip install -r requirements.txt
python scan.py                                # pick a random seeded student, fake weight, sample-tray.jpg
python scan.py --student "Emily Chen" --photo path/to/tray.jpg

# ml (run from ml/, requires `ultralytics`)
yolo train data=data.yaml model=yolov8n.pt epochs=50    # outputs to ml/runs/, gitignored
```

There is no test suite yet. Don't fabricate one — call out the gap if a change would normally need tests.

## How the pieces connect

1. Browser hits the Next.js app. `web/middleware.ts` redirects to `/login` unless the request is on a public path (`/login`, `/signup`, `/api/auth/*`, static assets) or carries a valid Supabase session cookie. This is the single place auth is enforced for the dashboard.
2. Auth uses `@supabase/ssr` so the session lives in cookies that both server and browser can read. Use `web/lib/supabase.ts` (browser, client components only — has `"use client"`) or `web/lib/supabase-server.ts` (server components, route handlers, middleware). Don't mix them up.
3. Username login works by hitting `/api/auth/username-to-email` first, which looks up the email tied to the username, then signing in normally. Signup goes through `/api/auth/signup` which creates the auth user and the `students` row in one shot (so RLS doesn't block the insert).
4. R2 uploads always go through `/api/upload` (POST multipart, `file` + `kind=tray|student`). The R2 SDK is server-only — never import `web/lib/r2.ts` from a client component, the credential check at module top will throw. Files land under `Tray-Photos/` or `Face-Photos/` prefixes.
5. The Pi station shares secrets with the website by reading `web/.env.local` from `station/db.py`. It uses the Supabase **service role key**, so it bypasses RLS — keep that key out of the browser.
6. `station/scan.py` is the orchestrator. `station/score.py` exposes `score_tray(photo_path) -> (compartment_scores, total)` and falls back to a random stub when `station/best.pt` is missing, so the pipeline runs end-to-end before the model is trained.

## Data model (Supabase)

`web/supabase/schema.sql` is the source of truth. Run it (or re-run, it's idempotent) in the Supabase SQL editor when tables drift. Four tables: `students`, `meals`, `rewards`, `redemptions`. RLS is on for all four with public-read policies; only `students` has an update policy (`auth.uid() = user_id`). When adding a new table, also add the matching `grant` lines for `anon`, `authenticated`, and `service_role` — Supabase's new publishable keys require both RLS *and* GRANTs to pass.

YOLO class layout (must match `ml/data.yaml`): classes 0–3 = small compartment with waste levels 0–3; classes 4–7 = big compartment with waste levels 0–3. The big compartment counts double in `total_score` — preserve that weighting if you touch `score.py`.

## Conventions to match

- Web is TypeScript strict, App Router, server components by default. Add `"use client"` only when needed (forms, interactivity, browser APIs).
- UI uses shadcn-style primitives in `web/components/ui/`. Compose from there before adding new dependencies.
- Server-only modules (`web/lib/r2.ts`, `web/lib/supabase-server.ts`, anything in `web/app/api/`) must not be imported by client components.
- Python uses `from __future__ import annotations` style and small focused modules (`db.py`, `score.py`, `scan.py`). Match it.
- Comments in this repo lean toward "explain *why* for the beginner reader." Keep that tone when editing existing files.

## Things that are easy to get wrong

- `*.pt` and `ml/dataset/` are gitignored. Don't try to commit weights or training data.
- `.env.local` lives in `web/` only and is read by both web and station. Don't duplicate it into `station/`.
- `start-dev.bat` calls `next dev` directly via `node ./node_modules/next/dist/bin/next dev`, not via pnpm. If you change Next's install path, update the bat.
- The "AI scan" in `web/app/page.tsx` is still `Math.random()` placeholder logic in some tabs — don't assume the dashboard is fully wired to real data yet. Cross-check `PLAN.md` Step 7 for the current wiring order.
