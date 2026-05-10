# Traveloop

> Personalized, intelligent, and collaborative travel planning powered by AI.

Traveloop is a multi-city travel planning application that combines structured itinerary building with AI-powered personalization, group collaboration, and adaptive re-planning. Plan solo or with friends, split expenses, get itineraries shaped by your travel personality, and re-route dynamically when destinations become unavailable.

---

## Highlights

- **AI-generated itineraries** — describe a region, duration, budget, and personality; get a complete day-by-day multi-city trip with stops, activities, transport, and accommodation.
- **Personality-driven planning** — Foodie, Adventurer, Culture, Chill, Social, Budget, Luxury. Every recommendation is shaped by who you are as a traveler.
- **Trip Blend (live group planning)** — invite friends, propose cities, vote, and watch the AI re-blend the itinerary in real time as votes come in.
- **Splitwise-style expenses** — track group spend across multiple currencies and settle up with the minimum number of transactions.
- **Adaptive re-planning** — mark a destination as compromised (advisory, weather, closed) and the AI suggests three alternatives that preserve cost, distance, and personality fit.
- **Travel companion matching** — find compatible travelers for shared trips with AI-scored compatibility.
- **Smart todos & reminders** — AI generates trip-prep todos (visa, vaccinations, insurance, check-in) with optimal reminder schedules.
- **Public sharing** — share itineraries with a public link; viewers can copy them to their own account.
- **Map, calendar, and timeline views** — visualize trips three ways with cost breakdowns by category, day, and stop.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| UI | React 19, Tailwind CSS, shadcn/ui |
| ORM | Prisma 5 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth.js (credentials + Google OAuth) |
| Validation | Zod |
| State | TanStack Query, Zustand |
| Maps | react-leaflet + Leaflet |
| Charts | Recharts |
| AI | Ollama running `qwen3.5` locally |
| Geocoding | Nominatim (OpenStreetMap) |
| Real-time | Server-Sent Events |
| Background jobs | node-cron |
| Email | Resend (optional) |
| Deployment | Vercel |

---

## Features (21 total)

### Base Features
1. Authentication — signup, login, password reset, Google OAuth
2. Dashboard — upcoming trips, recommendations, budget snapshot, recent activity
3. Create Trip — manual or AI-assisted
4. Trip List — filter, sort, search across all your trips
5. Itinerary Builder — drag-and-drop stops, day allocation, activity assignment
6. Itinerary View — timeline / calendar / map modes
7. City Search — global city database with cost-of-living, population, region filters
8. Activity Search — POIs by category, cost, and duration
9. Budget & Cost Breakdown — pie, bar, and per-stop charts with overspend alerts
10. Packing Checklist — AI-generated, category-grouped, reusable across trips
11. Public Sharing — share URL with copy-to-account flow and Open Graph previews
12. Profile & Settings — preferences, saved destinations, security, account management
13. Notes & Journal — markdown notes scoped to trip, stop, or day
14. Admin Dashboard — user management, KPIs, retention cohorts, top destinations

### Advanced Features
1. Splitwise — multi-currency group expenses with minimum-transaction settlement
2. Random Pinpoints — region-based AI discovery of clustered offbeat + popular spots
3. Travel Companion Matching — AI-scored compatibility for shared trips
4. Dynamic Re-planning — AI alternatives for compromised destinations
5. AI Personality Matching — itineraries shaped by an onboarding personality quiz
6. Smart Todos & Reminders — AI-generated trip prep with optimal reminder schedules
7. Trip Blend — real-time group voting with live AI itinerary regeneration via SSE

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Ollama](https://ollama.ai) installed and running locally
- The `qwen3.5` model pulled: `ollama pull qwen3.5`

### Setup

```bash
# clone
git clone <your-repo-url> traveloop
cd traveloop

# install
pnpm install

# configure environment
cp .env.example .env.local
# edit .env.local — at minimum set NEXTAUTH_SECRET and DATABASE_URL

# database
pnpm prisma migrate dev
pnpm seed

# run
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Generate your secret

```bash
openssl rand -base64 32
```

Paste the output as the value of `NEXTAUTH_SECRET` in `.env.local`.

### Ollama setup

Traveloop talks to Ollama at `http://localhost:11434` by default. Make sure Ollama is running and the model is available:

```bash
ollama serve            # in a separate terminal, if not already running
ollama pull qwen3.5
ollama list             # confirm qwen3.5 is present
```

If you want to use a different model, set `OLLAMA_MODEL` in `.env.local`.

---

## Environment Variables

See `.env.example` for the full list. Required for local development:

- `DATABASE_URL` — Prisma connection string (defaults to SQLite at `file:./dev.db`)
- `NEXTAUTH_SECRET` — random 32-byte string
- `NEXTAUTH_URL` — `http://localhost:3000` for dev
- `OLLAMA_BASE_URL` — `http://localhost:11434`
- `OLLAMA_MODEL` — `qwen3.5`

Optional integrations are gated by env presence — the app degrades gracefully when keys are missing:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `RESEND_API_KEY` — email reminders and password reset emails
- `FOURSQUARE_API_KEY` — live activity search (falls back to seed data)
- `UNSPLASH_ACCESS_KEY` — destination cover images
- `EXCHANGE_RATE_API_KEY` — multi-currency expense conversion

---

## Project Structure

```
traveloop/
├── prisma/                    # schema, migrations, seed
├── public/seed/               # static city + activity seed data
├── src/
│   ├── app/                   # Next.js App Router routes
│   │   ├── (auth)/            # login, signup, password reset
│   │   ├── (app)/             # authenticated pages
│   │   ├── (public)/          # share/[slug]
│   │   └── api/               # API routes
│   ├── components/            # UI components (shadcn primitives + features)
│   ├── lib/
│   │   ├── ai/                # Ollama client, prompts, schemas
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma singleton
│   │   ├── geocode.ts         # Nominatim wrapper
│   │   ├── blend-bus.ts       # SSE event bus
│   │   ├── splitwise.ts       # settlement algorithm
│   │   └── reminders/         # cron-based reminder scheduler
│   ├── server/actions/        # Next.js server actions
│   └── types/                 # shared TypeScript types
└── tests/                     # Vitest unit/integration + Playwright e2e
```

---

## Scripts

```bash
pnpm dev              # start dev server (Turbopack)
pnpm build            # production build
pnpm start            # run production build
pnpm lint             # ESLint
pnpm test             # Vitest
pnpm test:e2e         # Playwright smoke tests
pnpm prisma:studio    # open Prisma Studio
pnpm seed             # seed the database with demo data
pnpm admin:promote    # promote a user to admin by email
```

---

## Architecture Notes

- **Server-first.** Most routes are React Server Components. Client components are reserved for interactive surfaces (forms, drag-and-drop, real-time streams).
- **AI calls live server-side.** The Ollama URL never reaches the browser. All AI interactions go through `/api/ai/*` routes that validate input with Zod, call Ollama with schema-constrained JSON output, validate the response, and persist results.
- **Real-time without external infra.** Trip Blend uses an in-process Node `EventEmitter` plus SSE. No Redis, no Pusher. Trade-off: single-instance only — for production-scale collaboration, swap the bus for Redis pub/sub.
- **Geocoding is rate-limited.** Nominatim allows 1 req/sec. The geocoding wrapper queues requests sequentially and caches results in a `GeocodeCache` table for 30 days.
- **Reminders are in-process.** node-cron runs every 5 minutes inside the Next.js server process. For a multi-instance deployment, switch to a worker queue (BullMQ + Redis).

---

## Demo Flow

1. Signup → take the personality quiz
2. From the dashboard, click **Plan with AI** → enter `Vietnam, 10 days, $1500, Foodie`
3. Watch the AI generate a full multi-city itinerary with map, activities, and budget
4. Open **Budget** to see cost breakdowns
5. Mark Hanoi as compromised → review three AI-suggested alternatives → swap
6. Open the trip in two browser windows as different users → enable **Trip Blend** → propose and vote on cities → watch the itinerary re-blend live
7. Add an expense in **Expenses** → settle up with minimum transactions
8. Toggle **Public** on the trip → open the share link in incognito → copy the trip to a new account

---

## Contributing

This is currently a personal project. Issues and discussion are welcome.

---

## License

MIT — see [LICENSE](./LICENSE).
