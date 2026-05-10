# Traveloop

> Personalized, intelligent, and collaborative travel planning powered by AI.

Traveloop turns a region, duration, budget, and personality into a complete multi-city itinerary; lets a group shape it together with real-time voting; adapts when reality changes; and quietly handles the expense-splitting at the end of the day.

---

## Highlights

- **AI-generated itineraries** — describe a region, duration, budget, and personality; get a day-by-day plan with stops, activities, transport, and accommodation, costed within ten percent.
- **Personality-driven planning** — Foodie, Adventurer, Culture, Chill, Social, Budget, Luxury. Every recommendation is weighted around the way you actually travel.
- **Trip Blend** — invite a group, propose places, vote, and watch the AI re-blend the itinerary in real time as preferences shift. The deadline is the decision.
- **Splitwise-style expenses** — track group spend across multiple currencies and settle up with the minimum number of transactions.
- **Adaptive re-planning** — mark a destination compromised; the model suggests three alternatives that preserve cost, distance, and personality fit.
- **Travel companion matching** — find compatible travellers for shared trips with AI-scored compatibility across personality, budget, pace, interests, and communication.
- **Smart todos & reminders** — AI generates trip-prep todos (visa, vaccinations, insurance, check-in) with optimal reminder schedules; in-app notifications drop into a topbar bell.
- **Region pinpoint discovery** — give a region and your pace, get geographically-clustered points of interest with a 60/40 mix of offbeat and famous.
- **Public sharing** — toggle a trip public for a copy-able link with rich Open Graph previews and view counts.
- **Map / calendar / timeline views** — one trip, three lenses; full budget breakdowns by category, day, and stop; PDF export through the browser print pipeline.
- **Markdown notes & smart packing** — journal entries scoped to trip / stop / day, plus an AI-generated packing list that adapts to climate and activities.
- **Admin dashboard** — KPIs, retention cohorts, top destinations, trips over time, user management with CSV export.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (zinc + custom oklch palette) |
| Type system | strict TypeScript, no `any` |
| ORM | Prisma 6 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | Auth.js (NextAuth v5), credentials + Google OAuth, bcrypt |
| Validation | Zod (shared between forms and server actions) |
| State | TanStack Query, Zustand, SWR (light polling) |
| Maps | react-leaflet + Leaflet + OpenStreetMap tiles |
| Charts | Recharts |
| Drag and drop | @dnd-kit/sortable |
| Markdown | @uiw/react-md-editor |
| AI | Ollama running `qwen3.5` locally |
| Geocoding | Nominatim (rate-limited, 30-day DB cache) |
| Real-time | Server-Sent Events with an in-process Node EventEmitter |
| Background | node-cron sweeper for reminders |
| Email | Resend (optional, env-gated) |
| Tests | Vitest |
| Deployment | Vercel |

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Ollama](https://ollama.ai) (for AI features)

### Setup

```bash
git clone https://github.com/bhartiyaanshul/nomad.git traveloop
cd traveloop

pnpm install

cp .env.example .env.local
# at minimum: NEXTAUTH_SECRET (openssl rand -base64 32), DATABASE_URL

pnpm prisma migrate dev
pnpm seed              # demo accounts + trips + match profiles + admin events

pnpm dev
```

Open http://localhost:3000.

### Demo accounts (created by `pnpm seed`)

All four accounts share the password `Password1`.

| Email | Personality | Notes |
|---|---|---|
| `admin@traveloop.dev` | mixed | admin user, sees `/admin` |
| `alice@traveloop.dev` | foodie | owns a Vietnam trip; has a match profile |
| `bob@traveloop.dev` | adventurer | owns a public Patagonia trip with a Trip Blend in progress |
| `carla@traveloop.dev` | culture | owns a public Italy trip; overlapping match profile with Alice |

### Ollama setup

```bash
ollama serve
ollama pull qwen3.5
```

If Ollama isn't running, the app shows a calm offline banner and the AI surfaces become no-ops; everything else (manual planning, expenses, notes, admin) keeps working.

---

## Environment variables

See `.env.example` for the full list. Required for local dev:

- `DATABASE_URL` — defaults to SQLite at `file:./dev.db`
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000`
- `OLLAMA_BASE_URL` — `http://localhost:11434`
- `OLLAMA_MODEL` — `qwen3.5`

Optional (degrade gracefully when missing):

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth on signup / login
- `RESEND_API_KEY` / `RESEND_FROM` — password-reset and reminder emails (otherwise logged to console)
- `EXCHANGE_RATE_API_KEY` — multi-currency expense conversion (otherwise pass-through)
- `FOURSQUARE_API_KEY` — live activity search (falls back to seed data)
- `UNSPLASH_ACCESS_KEY` — destination cover images

---

## Project structure

```
traveloop/
├── prisma/                  schema, migrations, seed
├── public/seed/             cities + activities + featured-cities JSON
├── src/
│   ├── app/
│   │   ├── (auth)/          /login, /signup, /forgot-password, /reset-password
│   │   ├── (app)/           authenticated pages — dashboard, trips, match, settings, admin, discover
│   │   ├── (public)/share/  /share/[slug] read-only itineraries with OG image
│   │   └── api/             auth, ai, blend SSE, cities/activities search, notifications
│   ├── components/
│   │   ├── ui/              shadcn primitives
│   │   ├── trip/            TripCard, ItineraryTimeline / Calendar / Map, builder
│   │   ├── ai/              AIGenerateDialog, AIStatusBanner
│   │   ├── budget/          chart components
│   │   ├── expenses/        members, balances, settle-up
│   │   ├── todos/           todo CRUD + AI suggester
│   │   ├── notes/           markdown editor + render
│   │   ├── packing/         list + AI suggester
│   │   ├── blend/           live SSE-driven Trip Blend room
│   │   ├── match/           profile + compatibility cards
│   │   ├── admin/           charts + user table
│   │   └── shared/          empty state, notifications dropdown
│   ├── lib/
│   │   ├── ai/              Ollama client, prompts (5.1–5.7), schemas
│   │   ├── auth.ts          NextAuth v5 config
│   │   ├── db.ts            Prisma singleton
│   │   ├── geocode.ts       Nominatim wrapper, rate-limited, cached
│   │   ├── blend-bus.ts     SSE event emitter singleton
│   │   ├── splitwise.ts     settlement algorithm
│   │   ├── currency.ts      exchange-rate-api wrapper, cached
│   │   ├── budget.ts        per-trip budget computation
│   │   └── reminders/       cron sweeper + init
│   ├── server/
│   │   ├── actions/         server actions per feature
│   │   └── admin.ts         cached admin aggregations
│   └── proxy.ts             Next 16 auth-gating middleware
├── tests/unit/              vitest tests (splitwise)
├── instrumentation.ts       starts the cron singleton on server boot
├── scripts/promote-admin.ts pnpm admin:promote <email>
└── package.json
```

---

## Scripts

```bash
pnpm dev               # start dev server (Turbopack)
pnpm build             # production build
pnpm start             # run production build
pnpm lint              # ESLint
pnpm test              # Vitest
pnpm prisma:generate   # regenerate the Prisma client
pnpm prisma:migrate    # run a migration
pnpm prisma:studio     # open Prisma Studio
pnpm seed              # seed demo accounts and trips
pnpm admin:promote     # pnpm admin:promote <email> — flip a user to admin
```

---

## Architecture notes

- **Server-first.** Most routes are React Server Components. Client components are reserved for interactive surfaces (forms, drag-and-drop, real-time streams, charts).
- **AI calls live server-side.** The Ollama URL never reaches the browser. All AI interactions go through `/api/ai/*` routes that validate input with Zod, call Ollama with schema-constrained JSON output, validate the response, and persist results.
- **Real-time without external infra.** Trip Blend uses an in-process Node `EventEmitter` plus SSE (`/api/blend/[groupId]/stream`). For multi-instance production, swap `src/lib/blend-bus.ts` for Redis pub/sub.
- **Geocoding is rate-limited.** Nominatim allows 1 req/sec. The wrapper queues requests sequentially and caches results in a `GeocodeCache` table for 30 days.
- **Reminders are in-process.** node-cron runs every 5 minutes inside the Next.js server and sweeps due `Reminder` rows into in-app `Notification` rows. For multi-instance deployments, switch to a worker queue (BullMQ + Redis).
- **Currency conversion is opt-in.** With `EXCHANGE_RATE_API_KEY` set, expenses in non-trip currencies are converted at the latest rate (cached 24h). Without it, amounts are stored as-is and the UI flags that conversion is off.
- **Compatibility scores are cached symmetrically.** When two travellers see each other on `/match`, the score is computed once per pair and stored in `MatchScore` keyed by sorted user-id.

---

## Demo flow (3 minutes)

1. Sign in as `alice@traveloop.dev` / `Password1`.
2. Open the **Vietnam street-food run** trip — switch between Timeline, Calendar, Map (real Nominatim coordinates).
3. Open **Budget** — pie / per-day / per-stop breakdown.
4. Visit the **Patagonia** trip as `bob@traveloop.dev` — open **Blend**: candidates and votes are pre-seeded; if Ollama is running, watch the live itinerary regenerate when you cast a new vote.
5. Open **Expenses** on Patagonia — three members, an unsettled accommodation expense, suggested transfers.
6. Toggle **Italy** public from `carla@traveloop.dev` (already public in the seed) — paste the share URL into an incognito window for the read-only view.
7. Sign in as `admin@traveloop.dev` — open `/admin` for KPI strip, trips-over-time, top destinations, retention cohort, user table with promote / ban / CSV export.

---

## Deployment to Vercel

1. Push this repo to GitHub.
2. **New Project** in Vercel → import the repo.
3. Set environment variables in Vercel:
   - `DATABASE_URL` — point at managed Postgres (Vercel Postgres / Neon / Supabase). Update `prisma/schema.prisma` `provider = "postgresql"` and re-run `pnpm prisma migrate deploy` against the prod URL.
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (the Vercel deployment URL), `OLLAMA_BASE_URL` (point at a remote Ollama endpoint or a hosted equivalent), `OLLAMA_MODEL=qwen3.5`.
   - Optional integrations as listed above.
4. Deploy. The build output supports the Node runtime; `instrumentation.ts` starts the in-process reminder cron on server boot.
5. **Limitation**: Trip Blend's SSE event bus is in-process. On Vercel's multi-instance deployment, two members on different instances won't see each other's events. Swap `src/lib/blend-bus.ts` for a Redis pub/sub implementation before scaling out.

---

## License

MIT — see [LICENSE](./LICENSE).
