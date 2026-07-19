# Setup Guide for New Team Members

Welcome to LookLab! This guide will get you up and running in ~15 minutes.

## Prerequisites

Install these first:

- **Node.js 20+** — https://nodejs.org (includes npm)
- **Git** — https://git-scm.com (for version control)
- **Supabase CLI** — `npm install -g supabase` (optional, for local DB)
- **Docker Desktop** — https://docker.com (only if using local Supabase)

Verify installation:
```bash
node --version    # Should be v20.x or higher
npm --version     # Should be 10.x or higher
git --version     # Should be 2.x or higher
```

## Clone & Install

```bash
# Clone the repo
git clone https://github.com/christianrusso/muza.git
cd muza

# Install dependencies
npm install

# Create environment file
touch .env.local
```

Then follow **Step 1** or **Step 2** below.

---

## Step 1: Quick Start (Demo Mode - No Backend)

**Fastest way to see the app running locally.**

Demo mode uses mock data stored in your browser's localStorage. Perfect for UI testing.

```bash
npm run dev:demo
```

Open http://localhost:3007 in your browser.

**Limitations:**
- No real database (data resets on browser clear)
- No AI analysis (uses mock scores)
- Good for: UI/UX testing, local development, learning the codebase

---

## Step 2: Full Mode (With Real Supabase)

### Option A: Supabase Cloud (Recommended)

No Docker needed, runs in the cloud.

1. **Create Supabase project:**
   - Go to https://supabase.com
   - Sign in or create account
   - Click "New Project"
   - Fill in:
     - Organization: Create "Muza" (or your company name)
     - Project name: "muza-dev" (or your name)
     - Region: Choose closest to you
   - Click "Create new project" and wait ~1-2 minutes for provisioning

2. **Get API credentials:**
   - In Supabase dashboard, go to Settings → API
   - Copy these values:
     ```
     NEXT_PUBLIC_SUPABASE_URL      (Project URL)
     NEXT_PUBLIC_SUPABASE_ANON_KEY (anon public key)
     SUPABASE_SERVICE_ROLE_KEY     (service_role key)
     ```

3. **Add to `.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   OPENAI_API_KEY=sk-...                    # Optional: for AI analysis
   ADMIN_EMAIL=your.email@example.com       # Optional: for seeding
   ADMIN_PASSWORD=password123               # Optional: for seeding
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

Open http://localhost:3000 and sign up with your own credentials.

### Option B: Supabase Local (Advanced)

Runs Supabase in Docker on your machine. Full control, but slower startup.

**Requirements:**
- Docker Desktop running
- Supabase CLI installed globally: `npm install -g supabase`

**Steps:**
```bash
# Start local Supabase stack
supabase start

# It will print credentials like:
# NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY: ...

# Add those to .env.local

# Then start dev server
npm run dev
```

View database UI at http://localhost:54323

---

## Using the App

### Sign Up
- Click "Sign Up" on welcome screen
- Use any email (no verification needed in dev)
- Create a password
- You're in!

### Take a Photo
- Go to "Análisis" tab
- Click "Sacar foto" (or upload one)
- Choose occasion (e.g., "Casual", "Trabajo")
- Wait for AI analysis (~10-15 sec)
- See your outfit score + feedback

### Daily Challenge (Demo Only)
- Go to "Reto Diario" card
- Rate 3 community outfits
- Get streak badges for consistency

---

## Common Commands

| Command | What it does | Notes |
|---------|---|---|
| `npm run dev` | Start dev server on :3000 (full mode) | Requires .env.local with Supabase |
| `npm run dev:demo` | Start dev server on :3007 (demo mode) | No backend needed |
| `npm run build` | Build for production | Runs Next.js build |
| `npm start` | Start production server | Requires `npm run build` first |
| `npm run lint` | Check code quality | ESLint only |
| `npm test` | Run test suite | Uses Node.js test runner |
| `supabase start` | Start local Supabase | Requires Docker |
| `supabase stop --project-id Muza` | Stop local Supabase | Only if using local option |

---

## Folder Structure

```
muza/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/              # Authenticated routes (home, analysis, community)
│   │   ├── (auth)/             # Login/signup flows
│   │   └── styles/             # CSS partials (split into modular files)
│   ├── components/             # Reusable React components
│   │   ├── analysis/           # Score rings, result cards
│   │   ├── community/          # Feed, voting, comments
│   │   ├── dailyChallenge/     # Daily challenge UI
│   │   ├── navigation/         # Bottom tab bar
│   │   └── ui/                 # Modals, portals, utilities
│   ├── lib/                    # Server & shared logic
│   │   ├── supabase/           # Database client, auth
│   │   ├── ai/                 # Vision API, scoring logic
│   │   ├── demo.ts             # Mock data & demo mode flag
│   │   └── occasions.ts        # Occasion labels & types
│   └── types/                  # TypeScript domain types
├── research-development/       # Architecture & design docs
│   ├── adaptive-scoring/       # Feedback loop, clustering, personalization
│   ├── ux-growth/              # Retention, UI evolution
│   └── architecture-evolution/ # Infrastructure, payments, scaling
├── README.md                   # Project overview
├── SETUP.md                    # This file
├── AGENTS.md                   # Next.js version notes
└── .env.local                  # Environment variables (git-ignored)
```

---

## Key Concepts

### Demo Mode vs Full Mode

| Feature | Demo Mode | Full Mode |
|---------|-----------|-----------|
| Database | localStorage | Supabase (cloud or local) |
| Auth | Fake user | Real Supabase Auth |
| AI Analysis | Mock scores | Real OpenAI Vision API |
| Data Persistence | Browser only | Persists across devices |
| Users | Single (hardcoded) | Multiple users |
| Community Voting | Simulated | Real data from DB |

Your code automatically detects which mode via `isDemoMode()` in `src/lib/demo.ts`.

### CSS Architecture

All styles are **modular partials** in `src/app/styles/`:
- Global imports happen in `globals.css`
- Never edit `globals.css` directly
- Add new features as new `.css` files and import them in `globals.css`
- Tailwind v4 with `@theme inline` setup

### Authentication

Uses Supabase Auth (email/password). After signup, user is automatically logged in.
- Proxy-based middleware at `src/proxy.ts` (NOT Next.js middleware.ts per AGENTS.md)
- Guest mode available — see `/welcome` page

---

## Troubleshooting

### "Port 3000 already in use"
```bash
# Find process using port 3000 and kill it
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then retry: npm run dev
```

### "Supabase credentials missing" in full mode
- Make sure `.env.local` has all 3 Supabase vars
- Check spelling: `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
- Restart dev server after changing .env.local

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- Check system tray icon (should say "Docker is running")

### "AI analysis times out"
- Make sure `OPENAI_API_KEY` is in `.env.local`
- Check your OpenAI quota at https://platform.openai.com/account/billing/overview
- Vision API requests are slower (~10-15 sec) — this is expected

---

## Next Steps

1. **Read the codebase** — Start in `src/components/` to understand the UI flow
2. **Check AGENTS.md** — Important Next.js 16 differences from training data
3. **Explore research-development/** — Architecture decisions, feature proposals
4. **Find your task** — Check GitHub issues or ask your lead

---

## Questions?

- Check README.md for quick command reference
- Check AGENTS.md for Next.js version-specific notes
- Ask your team lead or open a GitHub issue

Happy coding! 🚀
