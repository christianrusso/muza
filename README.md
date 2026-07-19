# LookLab

AI-powered outfit analysis & community feedback app built with Next.js, Supabase, and OpenAI Vision.

## Quick Start (Demo Mode)

Run the app locally without backend credentials:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. Demo mode includes mock outfit data and mock user responses — all state is stored in localStorage.

## Full Setup

To run with real Supabase and OpenAI integration:

### Requirements

- **Node.js** 20+ and **npm** (with `package-lock.json`)
- **Supabase Cloud account** (free tier works for development) OR **Docker + Supabase CLI** for local
- **OpenAI** API key (for outfit vision analysis)

### Option A: Supabase Cloud (Recommended - No Docker)

1. **Create Supabase project:**
   - Go to https://supabase.com
   - Sign in / create account
   - Click "New Project"
   - Fill: Organization (create "Muza Development"), Project name ("Muza"), Region (your closest)
   - Wait for provisioning (~1-2 min) → Status will say "Healthy"

2. **Get API credentials:**
   - Click "API Keys" in the dashboard
   - Copy these three values:
     - `NEXT_PUBLIC_SUPABASE_URL` = Project URL (e.g., `https://xxx.supabase.co`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = "anon public" key
     - `SUPABASE_SERVICE_ROLE_KEY` = "service_role" key

3. **Create `.env.local`** in project root with above values (see table below)

### Option B: Supabase Local (Requires Docker Desktop)

```bash
# Start local Supabase (Docker required)
supabase start

# Follow on-screen instructions to get LOCAL credentials

# Reset database & run all migrations (0001–0021)
supabase db reset

# View database UI at http://localhost:54323
```

### Environment Variables

Create a `.env.local` file in the project root with:

| Variable | Source | Required | Purpose |
|----------|--------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings (API Keys) | ✅ | Public Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings (API Keys) | ✅ | Public Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings (API Keys) | ✅ | Server-side Supabase key (for migrations) |
| `OPENAI_API_KEY` | OpenAI dashboard | ✅ | GPT-4 Vision API key |
| `POSTHOG_API_KEY` | PostHog (optional) | ❌ | Analytics |
| `ADMIN_EMAIL` | Create for yourself (e.g., you@example.com) | ✅ | For seeding test data |
| `ADMIN_PASSWORD` | Create for yourself | ✅ | For seeding test data |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog (optional) | ❌ | Client-side analytics |

**Example `.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
OPENAI_API_KEY=sk-...
ADMIN_EMAIL=test@example.com
ADMIN_PASSWORD=password123
```

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on :3000 (full mode with Supabase) |
| `npm run dev:demo` | Start dev server on :3007 (demo mode, no Supabase needed) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite (Node.js test runner) |
| `npm run eval:ai` | Run AI evaluation harness |
| `npm run eval:serve` | Start evaluation server |
| `npm run eval:import` | Import eval dataset |
| `npm run seed:community` | Populate community feed demo data |
| `npm run migrate` | Alias for `supabase db push` |
| `npm run posthog:dashboard` | Open PostHog dashboard |
| `supabase start` | Start local Supabase stack |
| `supabase db reset` | Reset local database & run migrations |

## Project Structure

```
F:/Desarrollo/muza/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/              # Authenticated routes (tabs, analysis, community)
│   │   ├── (auth)/             # Auth flows (login, signup, welcome)
│   │   ├── globals.css         # Global styles + CSS imports manifest
│   │   └── styles/             # CSS partials (tokens, layout, buttons, etc.)
│   ├── components/             # Reusable React components
│   │   ├── analysis/           # Analysis/result UI
│   │   ├── community/          # Community feed & voting
│   │   ├── dailyChallenge/     # Daily challenge prototype
│   │   ├── navigation/         # Bottom tab bar
│   │   ├── brand/              # Icons, brand elements
│   │   └── ui/                 # Modals, portals, utilities
│   ├── lib/                    # Server/shared utilities
│   │   ├── supabase/           # Supabase client, auth
│   │   ├── ai/                 # AI validation & scoring logic
│   │   ├── scoring/            # Score categories & aggregation
│   │   ├── occasions.ts        # Occasion labels & enums
│   │   ├── demo.ts             # Demo data & stubs
│   │   ├── demoStore.ts        # In-memory demo state
│   │   └── ...
│   └── types/                  # TypeScript domain types
├── research-development/       # Architecture & design docs
│   ├── adaptive-scoring/       # Feedback loop architecture
│   ├── ux-growth/              # Retention & UI evolution
│   ├── design-system/          # Color, typography, components
│   ├── engineering-guidelines/ # Code patterns & best practices
│   └── ...
├── tests/                      # Test files (Node.js format)
├── scripts/                    # Seed, migration, eval scripts
├── .env.local                  # Environment variables (git-ignored)
├── AGENTS.md                   # Next.js version notes & breaking changes
└── package.json
```

## Key Conventions

- **Proxy Middleware** (`src/proxy.ts`): Custom middleware for auth. Do NOT use Next.js `middleware.ts` (per `AGENTS.md`).
- **CSS Structure** (`src/app/styles/`): All styles are partials imported in `globals.css`. Add new partials, never edit globals.css directly.
- **Demo Mode** (`src/lib/demo.ts`): Active only when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. **Never runs in production** (guard in `isDemoMode()` throws error if misconfigured).
- **No Human Reviews**: AI scoring pipeline does NOT include human feedback loops—only community voting for future improvement signals.
- **Responsive**: Mobile-first design (375×812 baseline for iPhone SE). Tailwind v4 with custom `@theme inline` setup.

## Resources

- **[AGENTS.md](AGENTS.md)** — Next.js 16.2.9 breaking changes & differences from training data
- **[research-development/](research-development/)** — Feature proposals, architecture decisions, UX research, adaptive-scoring phases
- **Deploy**: Vercel (region gru1, São Paulo)

## Troubleshooting

**Demo mode not working?**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are NOT set in `.env.local`
- Check console for `isDemoMode()` debug logs

**Database connection errors?**
- Run `supabase start` and check Docker is running
- Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

**Tests failing?**
- Run `npm test` (uses Node.js built-in test runner, not Jest/Vitest)
- Check `tests/` for test syntax (ESM modules, no CommonJS)

## License

Internal project. Do not share externally.
