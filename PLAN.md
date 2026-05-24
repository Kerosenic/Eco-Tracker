# Eco-Tracker — Beginner Roadmap

> Personal copy you can open anytime. Last updated 2026-05-24.

## Don't move on to the next to-do until you're 95% confident the current one is complete and correct.


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
| 8. Face login (separate from registration) | ✅ | yes — station-only, --face-photo flag |
| 9. Deploy web to Vercel | ✅ | yes — eco-tracker-plum-ten.vercel.app |
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
│   ├── middleware.ts → proxy.ts     ← auth gate (Next.js 16 renamed)
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
| `web/proxy.ts` | Redirects unauthenticated users to `/login`. (Next.js 16 renamed `middleware.ts` → `proxy.ts`.) |
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

### Already in the project
- **Node.js** — the JavaScript runtime. Lets your computer run JS code outside a browser.
- **pnpm** — package manager for the website. Like an app store for code libraries; downloads everything `web/` needs.
- **Next.js** — React framework for building the website. Handles routing, pages, server-side rendering.
- **React** — JavaScript library for building UI as reusable components.
- **TypeScript** — JavaScript with type checking. Catches typos and wrong-type bugs before you run the code.
- **Supabase** — hosted Postgres + auth + storage. Your backend-in-a-box.
- **Postgres** — the actual database engine Supabase runs.
- **SQL** — language to ask the database questions ("give me all students with credits > 50").
- **RLS** — Row-Level Security: the policy "who can read which row" in Supabase.
- **GRANT** — Postgres-level "this role is allowed to touch the table at all". RLS + GRANT both must pass.
- **R2** — Cloudflare's S3-compatible file storage. Bucket of files reachable by URL.
- **S3-compatible** — speaks the same API as Amazon S3, so any S3 tool works with R2.
- **YOLO** — object-detection model family ("You Only Look Once"). We use Ultralytics' YOLOv8.
- **mAP50** — Mean Average Precision at IoU 50%. How good the model is at detecting + classifying. 0.5 is OK, 0.7+ is good.
- **IoU** — Intersection over Union. How much the predicted box overlaps the real box (0–1).
- **Embedding** — list of numbers representing a face/dish/anything. Two similar faces = two close vectors. Used for face recognition.
- **`.env.local`** — secret-key file. Gitignored, never commit it.
- **Vercel** — Next.js host (free tier).
- **pyenv-win** — manages multiple Python versions on Windows. Pinned to 3.12.8 here.
- **Label Studio** — web tool to draw boxes on images for training data.

### Web/JS terms you'll keep hearing
- **Bootstrap** — *two unrelated meanings*:
  1. **Bootstrap (CSS framework)** — old library of pre-styled buttons/grids/forms. We do **not** use it; we use Tailwind. Mentioning so you don't confuse the two.
  2. **"to bootstrap"** (verb) — to start something from nothing. "Bootstrap the project" = scaffold the initial files. From "pull yourself up by your bootstraps".
- **Tailwind CSS** — utility-class styling system (`class="p-4 bg-blue-500"`). What `web/` actually uses.
- **shadcn/ui** — the component library v0 generated. Pre-built buttons/dialogs you copy into your repo.
- **API** — Application Programming Interface. A contract: "send this request, get this response". `web/app/api/...` files are your APIs.
- **REST** — common API style using HTTP verbs (GET/POST/PUT/DELETE).
- **JSON** — text format for data: `{"name": "Rebecca", "credits": 12}`. How APIs talk.
- **HTTP / HTTPS** — protocol the browser uses to talk to servers. HTTPS is the encrypted version.
- **Endpoint** — one specific URL of an API, e.g. `/api/auth/signup`.
- **Route** — a URL the website responds to. `web/app/login/page.tsx` becomes the `/login` route.
- **Middleware** — code that runs **between** the request and the page. `web/proxy.ts` (formerly `web/middleware.ts`; Next.js 16 renamed the file convention to `proxy`) checks "are you logged in?" before letting you through.
- **Client-side** — runs in the user's browser.
- **Server-side** — runs on Vercel's servers. Secret keys live here only.
- **Component** — a reusable UI block (a button, a modal, a card). React is built from components.
- **Hook (React)** — function starting with `use*` (`useState`, `useEffect`). Lets a component remember things or react to events.
- **State** — data a component is currently holding (e.g. "modal is open" or "input value is X").
- **Props** — inputs you pass into a component, like function arguments.
- **JSX/TSX** — HTML-looking syntax inside JS/TS files. `<Button>Click</Button>` in code.
- **npm** — original Node package manager. `pnpm` is a faster drop-in replacement.
- **`package.json`** — lists which libraries the project uses + scripts you can run.
- **`node_modules/`** — folder where downloaded libraries live. Huge, gitignored.
- **`pnpm dev`** — starts the local dev server (usually `localhost:3000`).
- **`pnpm build`** — compiles for production. Vercel runs this on deploy.

### Auth / security terms
- **OAuth** — "log in with Google/GitHub" protocol. We don't use it yet but you'll see it.
- **JWT** — JSON Web Token. A signed string proving "this user is logged in". Supabase issues these.
- **Cookie** — small piece of data the browser stores per site. Used to remember your login.
- **Session** — server's record of "this user is logged in right now".
- **Hashing** — one-way scramble of a password (`"hunter2"` → gibberish). Database stores the hash, never the plain password.
- **Salt** — random data added to a password before hashing so two users with the same password get different hashes.
- **CORS** — Cross-Origin Resource Sharing. Browser rule that blocks site A from calling site B's API unless B explicitly allows it.
- **CSRF** — Cross-Site Request Forgery. Attack where evil-site tricks your browser into using your cookie to act on good-site. Frameworks usually handle it.
- **XSS** — Cross-Site Scripting. Attack where attacker's JS runs on your page (e.g. injected via a comment field). React escapes by default but `dangerouslySetInnerHTML` undoes that.
- **SQL injection** — attacker stuffs SQL into a text input. Avoided by using parameterized queries (Supabase does this for you).

### Git / GitHub
- **Git** — version control. Tracks every change, lets you undo.
- **GitHub** — hosted Git + collaboration features (PRs, issues).
- **Repo** — a project tracked by Git.
- **Commit** — snapshot of changes with a message.
- **Branch** — parallel version of the code. `main` is the live one.
- **PR / Pull Request** — proposal to merge a branch into `main`. Where review happens.
- **Merge** — combine two branches.
- **Rebase** — alternative to merge, replays commits on a new base. Cleaner history, easier to mess up.
- **Push** — send local commits up to GitHub.
- **Pull** — fetch latest from GitHub into your local repo.
- **Clone** — download a repo for the first time.
- **Stash** — temporary shelf for in-progress changes you don't want to commit yet.
- **`.gitignore`** — list of files Git should never track (e.g. `.env.local`, `node_modules/`).
- **HEAD** — Git's pointer to your current commit.

### Python / ML
- **venv / virtualenv** — isolated Python environment per project (so `ml/` libraries don't fight `station/` libraries). `ml/.venv/` is yours.
- **`pip`** — Python's package manager.
- **`requirements.txt`** — list of Python libraries the project needs.
- **PyTorch** — deep-learning framework. YOLOv8 runs on top of it.
- **Ultralytics** — company that makes YOLOv8.
- **Inference** — running a trained model to get predictions.
- **Training** — teaching the model from labeled examples.
- **Epoch** — one full pass through the training data.
- **Batch** — a chunk of training images processed together.
- **Overfitting** — model memorized training images, fails on new ones. Combat with more data.
- **Validation set** — held-out images used to score the model fairly.
- **Confidence** — model's "I'm 0.87 sure this is a tray" number (0–1).
- **`.pt` file** — PyTorch saved model weights. `best.pt` is your trained YOLO.
- **GPU / CUDA** — graphics card / NVIDIA's framework for running ML on it. Faster than CPU for training.

### General CS terms
- **Frontend** — the part the user sees (the website).
- **Backend** — servers, databases, anything behind the scenes.
- **Full-stack** — both.
- **CRUD** — Create / Read / Update / Delete. The four basic data operations.
- **CLI** — Command-Line Interface. Programs you run by typing.
- **GUI** — Graphical User Interface. Buttons and windows.
- **IDE** — Integrated Dev Environment. VS Code is yours.
- **Linter** — tool that flags style/bug issues without running the code (ESLint, Ruff).
- **Formatter** — auto-rewrites code to a consistent style (Prettier, Black).
- **Build** — turn source code into the final shippable bundle.
- **Bundle** — packaged JS/CSS file the browser downloads.
- **Deploy** — push the build to a server users can reach.
- **Environment variable** — config value passed to a program at start. Keeps secrets out of code.
- **Localhost** — your own computer, address `127.0.0.1`. `localhost:3000` = the dev server.
- **Port** — number on an address (the `:3000` part). Different ports = different programs.
- **DNS** — phonebook turning `eco-tracker.com` into an IP address.
- **CDN** — Content Delivery Network. Cached copies of your site spread worldwide for speed. Vercel + R2 both use one.
- **Cache** — saved copy to skip recomputing. "Bust the cache" = force a refresh.
- **Race condition** — bug where the order two things finish in matters and isn't guaranteed.
- **Async / await** — JS keywords for "this takes time, don't freeze while waiting".
- **Promise** — JS object representing "a value that'll exist later".
- **Callback** — function you pass in to be called later. Older style; promises mostly replaced them.
- **Recursion** — function that calls itself.
- **Big O** — rough cost of an algorithm as inputs grow. `O(n)` = linear, `O(n²)` = quadratic (slow).
