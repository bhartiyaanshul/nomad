# Build Traveloop — Execution Contract

> This document is the playbook for building Traveloop. The full specification lives in `traveloop-implementation-plan.md`. **Read that file first and refer to it continuously.**

---

## 0. Mission

Build **Traveloop**, a production-quality travel planning web application, using **Next.js 15 (App Router)**.

Deliver a working application that implements **all 14 base features and all 7 advanced (addon) features** described in the plan. The app must be deployable to Vercel and demoable end-to-end.

---

## 1. Read First (mandatory)

Before writing any code, read these files in this order:

1. `traveloop-implementation-plan.md` — full specification (sections 3–10)
2. This file (`CLAUDE.md`) — execution contract

Then build a TODO list using the phase breakdown in §4 below. Mark phases as `in_progress` and `completed` as you go. Never have more than one phase `in_progress` at a time.

If anything in the plan is ambiguous, default to the most production-grade interpretation. Do not invent features that aren't in the plan; do not skip features that are.

---

## 2. Locked Tech Stack

Do not substitute libraries unless one is broken on install. If you must substitute, pick the closest equivalent and note it at the top of the README.

```
Runtime:        Node.js 20+
Framework:      Next.js 15 (App Router, TypeScript, Turbopack dev)
UI:             React 19, Tailwind CSS 3.4, shadcn/ui
ORM:            Prisma 5
Database:       SQLite (dev), Postgres (prod via DATABASE_URL switch)
Auth:           NextAuth.js v4 (credentials + Google)
Validation:     Zod
State:          TanStack Query 5 (server state), Zustand 5 (UI state)
Forms:          React Hook Form + Zod resolver
Maps:           react-leaflet 4 + leaflet 1.9
Charts:         Recharts 2
Drag/Drop:      @dnd-kit/sortable 8
Markdown:       @uiw/react-md-editor 4
Dates:          date-fns 4
Icons:          lucide-react
LLM:            Ollama (local, qwen3.5)
Geocoding:      Nominatim (OpenStreetMap, free)
Real-time:      Server-Sent Events (Node EventEmitter, no external service)
Email:          Resend (optional; gate with env flag)
Background:     node-cron (in-process scheduler)
Tests:          Vitest + Testing Library + Playwright (smoke only)
Lint/Format:    ESLint (next/core-web-vitals) + Prettier
```

**Use `pnpm`** as the package manager. Initialize with:

```bash
pnpm dlx create-next-app@latest traveloop --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

---

## 3. Project Structure

Establish this layout in Phase 0 and adhere to it throughout:

```
traveloop/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   ├── seed/                   # static seed data (cities.json, activities.json)
│   └── uploads/                # user uploads (gitignored)
├── src/
│   ├── app/
│   │   ├── (auth)/             # /login, /signup, /forgot-password
│   │   ├── (app)/              # authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── trips/
│   │   │   │   ├── page.tsx                 # list
│   │   │   │   ├── new/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx             # itinerary view
│   │   │   │   │   ├── build/               # itinerary builder
│   │   │   │   │   ├── budget/
│   │   │   │   │   ├── packing/
│   │   │   │   │   ├── notes/
│   │   │   │   │   ├── expenses/
│   │   │   │   │   ├── todos/
│   │   │   │   │   └── blend/
│   │   │   ├── match/
│   │   │   ├── settings/
│   │   │   └── admin/
│   │   ├── (public)/
│   │   │   └── share/[slug]/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── trips/
│   │   │   ├── ai/
│   │   │   ├── blend/
│   │   │   └── ...             # see plan §6
│   │   ├── layout.tsx
│   │   └── page.tsx            # landing
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── trip/               # TripCard, ItineraryTimeline, etc.
│   │   ├── ai/                 # AIGenerateModal, AlternativeSuggestions
│   │   ├── budget/             # CostPieChart, ExpenseForm
│   │   ├── blend/              # VoteCard, LiveItineraryStream
│   │   └── shared/             # Header, Sidebar, EmptyState
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── ollama.ts       # client wrapper
│   │   │   ├── prompts/        # one file per prompt (5.1–5.7)
│   │   │   └── schemas/        # JSON schemas + zod
│   │   ├── auth.ts             # NextAuth config
│   │   ├── db.ts               # prisma client singleton
│   │   ├── geocode.ts          # Nominatim
│   │   ├── blend-bus.ts        # SSE event bus singleton
│   │   ├── splitwise.ts        # settlement algorithm
│   │   ├── reminders/
│   │   │   └── scheduler.ts    # cron job
│   │   └── utils/
│   ├── hooks/
│   ├── types/
│   ├── server/
│   │   └── actions/            # server actions per feature
│   └── middleware.ts           # auth gate + analytics events
├── tests/
│   ├── unit/
│   └── e2e/
├── instrumentation.ts          # Next.js init hook (starts cron)
├── .env.example
├── .env.local                  # gitignored
├── CLAUDE.md                   # this file
├── traveloop-implementation-plan.md
├── README.md
└── package.json
```

---

## 4. Build Phases

Execute phases sequentially. **At the end of every phase, run `pnpm build` and `pnpm lint`. If either fails, fix before moving on.** Commit at the end of each phase with the message format `feat(phase-N): <summary>`. **Never include `Co-Authored-By` lines.**

For each phase below, the plan section to consult is in parentheses.

### Phase 0 — Foundation (plan §2)

- [ ] Initialize Next.js project with the command in §2
- [ ] Install all dependencies from the locked stack
- [ ] Configure Tailwind, install shadcn/ui (`pnpm dlx shadcn@latest init`)
- [ ] Add the shadcn components you'll need: button, card, dialog, dropdown-menu, form, input, label, select, sheet, tabs, toast, calendar, popover, command, avatar, badge, separator, skeleton, table, textarea, tooltip
- [ ] Set up Prisma with SQLite for dev, write the **complete schema from plan §3** (all models)
- [ ] Run initial migration and generate client
- [ ] Configure NextAuth.js with credentials + Google providers
- [ ] Set up `src/lib/db.ts` (Prisma singleton), `src/lib/auth.ts`
- [ ] Create base layouts: root layout, `(auth)` layout, `(app)` layout with header + sidebar
- [ ] Build a landing page at `/` with hero + CTA to `/signup`
- [ ] Add `.env.example` with all variables from plan §9
- [ ] Initialize git, write README with setup instructions, commit

**Done when:** `pnpm dev` runs, landing page renders, you can navigate to `/login` and `/signup` (forms can be non-functional), Prisma migrations apply cleanly.

### Phase 1 — Auth & User Management (plan §4.1, §4.12, Features 1, 12)

- [ ] Implement signup server action with bcrypt password hashing + Zod validation (8+ chars, mixed case, number)
- [ ] Implement login flow via NextAuth credentials
- [ ] Implement Google OAuth flow (gate with env presence — skip if no client ID)
- [ ] Forgot password: signed token via crypto, stored on User as `resetToken` + `resetTokenExpiresAt`. Send via Resend if `RESEND_API_KEY` set, otherwise log to console with the reset URL
- [ ] Reset password page that accepts token and updates hash
- [ ] Settings page (`/settings`) with all tabs: Profile (editable name, avatar upload to `/public/uploads`, bio), Preferences (language, currency, default personality), Saved destinations (CRUD), Security (change password, list sessions), Danger zone (delete account with password confirmation)
- [ ] Auth middleware that redirects unauthenticated users from `(app)` routes to `/login`
- [ ] Session provider in root layout

**Done when:** signup → login → settings → logout works end-to-end. Account deletion cascades correctly.

### Phase 2 — Trip CRUD + Stop CRUD + Activity CRUD (plan §4.3, §4.4, Features 3, 4)

- [ ] Dashboard page (`/dashboard`) with Welcome banner, Upcoming trips carousel, Plan New Trip CTA, Recommended destinations grid (use static seed for now), Recent activity (empty state for new users)
- [ ] Trip list page (`/trips`) with filters (status: upcoming/past/draft, personality, search), sort (date/name/budget), trip cards
- [ ] Create trip flow (`/trips/new`) with all fields per plan §4.3, server action validates and creates
- [ ] Trip detail layout at `/trips/[id]` with sub-nav for: View, Build, Budget, Packing, Notes, Expenses, Todos, Blend
- [ ] Trip view route is the itinerary view (keep simple list view for now; visualizations come Phase 3)
- [ ] Stop CRUD: add stop dialog (city + dates + accommodation), edit, delete, drag-to-reorder via `@dnd-kit/sortable`
- [ ] Activity CRUD nested under stops
- [ ] Edit trip modal (name, dates, budget, etc.)
- [ ] Duplicate trip action (deep copy with new IDs)
- [ ] Delete trip with confirmation

**Done when:** A user can manually plan a 3-stop trip with activities entirely through the UI, no AI needed. Refresh persists everything.

### Phase 3 — Hero AI Feature: Itinerary Generator (plan §4.B.5, §5.1)

This is the most important phase. It is the demo moment.

- [ ] Build `src/lib/ai/ollama.ts` — wrapper that calls `http://localhost:11434/api/chat` with `format: <schema>`, `stream: false`, model from `OLLAMA_MODEL` env. Add a 60s timeout and a single retry on JSON parse failure.
- [ ] Place the system prompt from plan §5.1 in `src/lib/ai/prompts/itinerary.ts` as a constant
- [ ] Place the JSON schema from plan §5.1 in `src/lib/ai/schemas/itinerary.ts` (export both raw JSON for Ollama and a Zod equivalent for runtime validation)
- [ ] Build `src/lib/geocode.ts` — Nominatim wrapper with User-Agent header, 1s delay between calls (sequential, not parallel — respect their rate limit), result caching keyed by `city|country`
- [ ] Build API route `POST /api/ai/itinerary` that: accepts region/days/budget/personality/numStops/discoveryMode/startDate/groupContext, calls Ollama, validates response with Zod, geocodes each stop, persists Trip + Stops + Activities to DB, returns the trip ID
- [ ] Build `AIGenerateModal` component with form fields and a streaming progress indicator (poll endpoint or just show stages: "Asking AI…" → "Mapping stops…" → "Saving trip…")
- [ ] Add "Generate with AI" button on dashboard and on Create Trip page
- [ ] On success, redirect to `/trips/[id]` to view the generated itinerary
- [ ] Personality quiz at `/settings` and as a one-time onboarding modal after signup; persist on User
- [ ] Add a re-generate stop button that re-runs AI for a single stop only (uses same prompt with `numStops: 1`)

**Done when:** Type "Vietnam, 10 days, $1500, Foodie", wait, see a fully populated trip with map-ready stops. The result is reproducible across runs (test with 3 different inputs).

### Phase 4 — Visualization: Map, Calendar, Budget Charts (plan §4.6, §4.9)

- [ ] Itinerary View: build three view-mode toggles
  - **Timeline** — vertical day-by-day grouped by city, color-coded city headers, activity blocks with time/cost/category icon
  - **Calendar** — monthly grid using shadcn calendar as base, activity blocks as overlay
  - **Map** — `react-leaflet` with numbered markers per stop, polyline connecting them, popup on click showing stop summary
- [ ] Budget page (`/trips/[id]/budget`):
  - Pie chart for category breakdown (Recharts `PieChart`)
  - Bar chart for cost-per-day
  - Per-stop bar chart
  - KPI cards: total estimated cost, avg per day, % of budget used, days over budget
  - Editable budget targets per category (server action)
  - Over-budget alert banner
- [ ] PDF export: `react-to-print` for client-side. Button on Itinerary View → generates PDF of timeline mode.

**Done when:** All three views render the same trip correctly. Budget charts update when you edit costs.

### Phase 5 — City & Activity Search (plan §4.7, §4.8)

- [ ] Pre-seed `public/seed/cities.json` with 1000+ top cities (use a public list from GeoNames or similar; commit with attribution). Each entry: `{ name, country, lat, lng, population, costIndex (1-10), region }`
- [ ] Pre-seed `public/seed/activities.json` with 50+ generic activities per category as a fallback when no city is matched
- [ ] City search modal: server-side fuzzy search via Prisma full-text or a simple `contains`/`startsWith` filter, returns top 20. Filter by country/region/cost-tier.
- [ ] Activity search modal scoped to a stop: query Foursquare API if `FOURSQUARE_API_KEY` set, otherwise fall back to seed data filtered by the stop's city. Filter by category/cost/duration.
- [ ] "Add to Trip" / "Add to Stop" buttons that auto-assign defaults (mid-day for activities, sensible day allocation for cities)

**Done when:** A user can build an entire trip manually using city + activity search, with sensible results in offline-safe demo mode.

### Phase 6 — Public Sharing & Copy Trip (plan §4.11)

- [ ] Add `isPublic: boolean` and `shareSlug: string?` toggle on the trip edit form (already in schema)
- [ ] Generate `shareSlug` via `nanoid(10)` when made public; null it out when made private
- [ ] Public route `/share/[slug]` with read-only Itinerary View (no edit affordances, no nav sidebar)
- [ ] Open Graph meta tags on the public route: title, description (trip summary), og:image (use `next/og` to generate a dynamic image with trip name + cover)
- [ ] "Copy Trip" button on public view: requires login, deep-clones the trip (new IDs, current user as owner, removes share slug, marks as private). Server action.
- [ ] Social share buttons: Twitter/X, Facebook, WhatsApp, LinkedIn (just URL-encoded share URLs, no SDKs)
- [ ] View counter: counter column on Trip; debounce by IP (24h cookie)

**Done when:** Toggle a trip public, open `/share/<slug>` in incognito, see the read-only view with proper meta tags. Login → "Copy Trip" → it appears in your `/trips` list.

### Phase 7 — Splitwise (Trip Members + Expenses + Settlement) (plan §4.B.1)

- [ ] Trip Members tab inside the trip: invite by email (creates pending member; if email matches an existing user, auto-accept; otherwise send a magic-link join URL via Resend or display the URL inline if Resend not configured)
- [ ] Member roles: owner, co-planner, traveler. Only owner can delete the trip; co-planners can edit; travelers can view + add expenses
- [ ] Expenses page (`/trips/[id]/expenses`): add expense form with payer, amount, currency, category, description, split mode (equal / by share / by exact / by percentage)
- [ ] Multi-currency: if expense currency != trip currency, convert via `exchangerate-api.com` (cache rates for 24h in a `CurrencyRate` table)
- [ ] Implement settlement algorithm in `src/lib/splitwise.ts` per plan §4.B.1 (greedy min-transactions)
- [ ] Balances view: shows what each member owes/is owed, with avatars
- [ ] Settle Up: shows minimum-transaction list, marks shares as `settled` when confirmed
- [ ] Unit tests for the settlement algorithm: at least 5 test cases including (a) all settled, (b) chain debt A→B→C→A, (c) one creditor, multiple debtors

**Done when:** 3-member trip with 4 expenses across split modes shows correct balances. Settle Up suggests valid minimum transactions. Tests pass.

### Phase 8 — Dynamic Re-planning (plan §4.B.4, §5.2)

- [ ] Add "Mark Compromised" button on each Stop in the builder + view
- [ ] When clicked, open a side sheet with: reason selector, current stop summary, "Find Alternatives" button
- [ ] `POST /api/ai/alternatives` route uses Prompt 5.2; takes the original stop's data, prev/next stops, personality, and `maxDistanceKm` (default 500)
- [ ] Render 3 alternative cards with: city name, cost match indicator, distance, personality match score, preserved/differs blurbs, transport from previous, "Choose This" button
- [ ] On selection, archive the original stop's activities (mark as `archived: true` instead of deleting — add this column), update Stop fields with the new city, geocode, then call Prompt 5.1 with `numStops: 1` and the new city to generate fresh activities
- [ ] Add an "Undo" button visible for 30 seconds after the swap that restores the original stop

**Done when:** Mark a stop compromised, get 3 reasonable alternatives, swap, see new activities, undo restores original.

### Phase 9 — Smart Todos & Reminders (plan §4.B.6, §5.4)

- [ ] Todos page (`/trips/[id]/todos`) with grouped lists by category, priority badges, due-date display
- [ ] Add Todo form (content, dueAt, priority)
- [ ] "Suggest with AI" button — calls `POST /api/ai/todos/suggest` (Prompt 5.4) with trip context, displays suggested todos as cards with "Add" / "Skip" buttons
- [ ] When a todo is created, auto-generate Reminder rows based on `priority`:
  - high: T-7d, T-3d, T-1d, T-2h
  - normal: T-3d, T-1d
  - low: T-1d
- [ ] Background scheduler in `src/lib/reminders/scheduler.ts` using `node-cron`, runs every 5 minutes:
  - Query `Reminder` where `scheduledAt <= now() AND sent = false`
  - Send via channel (in-app: persist to a `Notification` table; email: Resend if configured; push: defer for now)
  - Mark `sent: true`, `sentAt: now()`
- [ ] Start the cron job in a singleton in `src/lib/reminders/init.ts` and import it from `instrumentation.ts` (Next.js init hook)
- [ ] In-app notifications dropdown in the header showing unread reminders; mark as read on click
- [ ] Toast notifications via shadcn `useToast` for any reminders triggered while user is online (poll `/api/notifications/unread` every 60s with TanStack Query)

**Done when:** Create an international trip → AI suggests 8+ relevant todos including visa/vaccinations → reminders schedule correctly → manually advancing system time triggers them. (For demo, expose a debug endpoint to backdate `scheduledAt` so you can force trigger.)

### Phase 10 — Notes, Packing, Personality Discovery (plan §4.10, §4.13, §5.6, §5.7)

- [ ] Notes page (`/trips/[id]/notes`) with markdown editor, scope selector (trip/stop/day), pin, search, sort by date
- [ ] Packing page (`/trips/[id]/packing`) with category groups, checkbox per item, progress bar, reset, "Reuse from previous trip" dropdown
- [ ] "Generate with AI" button on Packing page → Prompt 5.7 → adds suggested items to the list
- [ ] Random Pinpoint Discovery feature (plan §4.B.2): a "Discover" tab on the Itinerary Builder. User inputs region + n + pace + avoid list → calls `POST /api/ai/pinpoints` (Prompt 5.6) → renders cluster cards on a map with day-grouped pins. "Add cluster as stop" button on each cluster.

**Done when:** All three features functional and persistent. Markdown notes render correctly with images/links.

### Phase 11 — Trip Blend: Real-Time Group Voting + Live AI (plan §4.B.7, §5.5)

This is the second-most-impressive demo. Test with two browser windows side by side.

- [ ] Build `src/lib/blend-bus.ts` — module-level singleton wrapping a Node `EventEmitter`. Methods: `subscribe(groupId, callback)`, `publish(groupId, event)`, `unsubscribe(handle)`. Events: `candidate_added`, `vote_cast`, `itinerary_updated`, `member_joined`, `finalized`.
- [ ] `POST /api/trips/[id]/blend` — creates a `BlendGroup` (status: voting, votingDeadline optional)
- [ ] Blend page (`/trips/[id]/blend`):
  - Left: candidates list with vote tallies, "Propose Place" button (city search → reason → submit)
  - Right: live itinerary preview (streams in as it regenerates)
  - Top: voting deadline countdown, member avatars, "Finalize Now" (owner only)
- [ ] Voting: each member can rank their top 3 candidates with weights 5/3/1, or give a single thumbs-up (weight 1). Update via `POST /api/blend/[groupId]/candidates/[cId]/vote`. One vote per user per candidate; updating replaces.
- [ ] SSE endpoint: `GET /api/blend/[groupId]/stream` per plan §4.B.7 sample. On the client, use `EventSource`. On any `candidate_added` or `vote_cast`, the client revalidates queries; on `itinerary_updated`, it animates the new itinerary in.
- [ ] Itinerary regeneration trigger: debounce 5 seconds after the last vote/candidate event. On trigger, call Prompt 5.5 with current top-N candidates and group personality mix, save `BlendItineraryVersion`, publish `itinerary_updated`.
- [ ] Finalize: when owner clicks finalize (or `votingDeadline` passes via the cron job), set status to `finalized`, copy the latest itinerary version into actual `Stop`/`Activity` rows on the Trip, redirect everyone to the Itinerary View.

**Done when:** Two windows, two users, propose a city in window A → window B sees it instantly → both vote → 5s later both windows show new itinerary streaming in → finalize converts to real trip.

### Phase 12 — Travel Companion Matching (plan §4.B.3, §5.3)

- [ ] `/match` page with onboarding: create your match profile (region, dates, personality, budget range, group size, preferences: ageRange/gender/interests/languages)
- [ ] Browse matches: server queries `TravelMatch` records where region overlaps and dates overlap ≥ 80% and budgets overlap. Computes compatibility via Prompt 5.3 in batch (cache results for 24h on a `MatchScore` table). Sort by score desc.
- [ ] Swipeable card UI (use `react-tinder-card` or just left/right arrow buttons): show profile + score + dimensions breakdown + strength + friction
- [ ] "Connect" button sends a match request. Mutual requests = match. On match: create a Trip with both as members, role traveler each, redirect to the new trip.
- [ ] Safety: report/block user actions, link to a static "Safety Tips" page

**Done when:** Two seeded users with overlapping match profiles see each other; mutual connect creates a shared trip.

### Phase 13 — Admin / Analytics Dashboard (plan §4.14)

- [ ] Add an event-tracking helper `src/lib/analytics.ts` with `trackEvent(userId, type, metadata)` that inserts into `UserEvent`
- [ ] Wire it into key actions: `trip_created`, `ai_itinerary_generated`, `city_searched`, `expense_added`, `vote_cast`, `match_made`
- [ ] `/admin` route gated by `user.isAdmin`. Make the first signed-up user admin via a one-time env flag check, or expose a CLI script `pnpm admin:promote <email>`.
- [ ] Sections:
  - KPI cards: total users, total trips, AI generations (24h), trips created (7d)
  - Trips-over-time line chart
  - Top destinations bar chart (top 10)
  - User retention cohort grid (signup week → return weeks)
  - User table (search, filter, sort, role toggle, ban toggle, export to CSV)
- [ ] All queries use Prisma aggregations; cache results for 60s in memory

**Done when:** Admin sees real numbers across all charts after seeded events. Non-admins get 403.

### Phase 14 — Polish, Seed, Deploy (final phase)

- [ ] Seed script (`prisma/seed.ts`) creates: 1 admin user, 3 regular users with personality set, 4 polished sample trips (varied: solo Foodie in Vietnam, group Adventurer in Patagonia, Couple Culture in Italy, Chill Bali), 2 public trips with share slugs, 2 travel matches with overlap, 1 active blend group with candidates and votes
- [ ] `pnpm seed` command in package.json scripts
- [ ] Empty states everywhere (no trips, no expenses, no notes, etc.) with friendly illustrations or shadcn placeholders
- [ ] Loading skeletons on every async page
- [ ] Error boundaries at the route level (`error.tsx` per route group)
- [ ] Toast notifications for all mutations (success + error)
- [ ] Mobile responsiveness check on every page (≤ 640px)
- [ ] Dark mode (use shadcn theme provider)
- [ ] README with: project description, screenshots placeholder, setup steps, env var docs, deployment guide for Vercel
- [ ] `vercel.json` if needed
- [ ] Smoke test with Playwright: signup → create trip → generate AI itinerary → view → logout
- [ ] Final commit, tag `v1.0.0`

**Done when:** Fresh clone → `pnpm install && pnpm prisma migrate dev && pnpm seed && pnpm dev` → everything works.

---

## 5. Code Quality Standards

These apply to every file, every phase. Do not relax them.

### TypeScript
- `"strict": true` in tsconfig (default in Next.js)
- No `any` unless commented with reason. Use `unknown` and narrow.
- All API routes have typed request and response (Zod-parsed input, typed output)
- Shared types live in `src/types/`

### Validation
- Every API route validates input with Zod at the entry. Reject with 400 + error details.
- Every server action validates input with Zod.
- Reuse Zod schemas between API and forms (single source of truth).

### Error Handling
- Try/catch around every external call (Ollama, Nominatim, Resend, Foursquare). Log the error, return a typed error response.
- User-facing errors are friendly strings; technical details only in server logs.
- Use `next/error` and route-level `error.tsx` for UI errors.

### Database
- Always use the Prisma singleton from `src/lib/db.ts` (avoid hot-reload connection leaks)
- Use transactions for multi-table writes (trip duplication, blend finalize, settle expenses)
- Add indexes for: `Trip.ownerId`, `Stop.tripId`, `Activity.stopId`, `Expense.tripId`, `UserEvent(eventType, createdAt)` — most are already implied by foreign keys but verify in `schema.prisma`

### Components
- Server components by default; mark `"use client"` only when needed (state, effects, listeners)
- Co-locate small components with their feature; promote to `src/components/shared/` when used in 3+ places
- Use shadcn primitives — do not hand-roll a button or input

### Forms
- React Hook Form + Zod resolver for every multi-field form
- Disable submit while pending; show loading spinner
- Show field-level errors inline

### Styling
- Tailwind utilities only. No CSS modules, no styled-components.
- Use CSS variables defined by shadcn theme. Don't hardcode colors.
- Spacing scale: stick to Tailwind defaults (`p-2`, `p-4`, `p-6`, `p-8`, etc.)

### Security
- Never log passwords, tokens, or session data
- Hash passwords with bcrypt (cost 10)
- Validate that authenticated users can only modify their own resources (every server action checks `trip.ownerId === session.user.id` or membership)
- CSRF: NextAuth handles it for credentials; for server actions, Next.js 15 has built-in CSRF tokens
- SQL injection: Prisma parameterizes — do not use `$queryRawUnsafe`

### Accessibility
- All interactive elements keyboard-reachable
- Form labels associated with inputs
- Color contrast ≥ AA
- `aria-label` on icon-only buttons

---

## 6. AI Integration Rules

### Ollama Client (`src/lib/ai/ollama.ts`)
- One function: `generate<T>(prompt: { system: string; user: string; schema: object }): Promise<T>`
- Always pass `format: schema` (Ollama-native structured output)
- Always set `stream: false` for these prompts (we want full JSON in one shot)
- Set `temperature: 0.7` for itinerary, `0.4` for alternatives, `0.3` for compatibility/todos (deterministic), `0.6` for blend
- 60-second timeout via `AbortController`
- One retry on JSON.parse failure (some 7B models occasionally emit a stray token); on second failure, return a structured error
- The model is `qwen3.5` (set via `OLLAMA_MODEL` env var)

### Prompts (`src/lib/ai/prompts/`)
- One file per prompt: `itinerary.ts`, `alternatives.ts`, `compatibility.ts`, `todos.ts`, `blend.ts`, `pinpoints.ts`, `packing.ts`
- Export `{ system: string; userTemplate: (vars) => string; schema: JsonSchema; ZodSchema }`
- The plan §5 contains the exact text — copy verbatim, do not paraphrase

### Schemas (`src/lib/ai/schemas/`)
- For each prompt, define both the JSON Schema (for Ollama `format`) and a Zod equivalent
- Validate Ollama output with Zod before returning to the client. If validation fails, log the malformed response and return a 502 with retry hint.

### Caching
- Geocoding: cache in DB on a `GeocodeCache(query, lat, lng, fetchedAt)` table, TTL 30 days
- Match compatibility scores: cache 24h
- AI itinerary generation: do NOT cache (the variance is part of the value)

---

## 7. Testing Strategy

Hackathon-realistic — focus tests on the highest-risk logic, not coverage chasing.

### Unit tests (Vitest)
- `lib/splitwise.ts` settlement algorithm — 5+ cases
- `lib/ai/schemas/*` Zod parsers against fixtures
- `lib/blend-bus.ts` pub/sub semantics

### Integration tests (Vitest + test DB)
- Trip creation flow (auth + ownership check)
- Expense settlement persistence
- Public share read-only enforcement (no edit affordances render for unauth user)

### E2E (Playwright)
- One smoke test: signup → create trip → generate AI itinerary (mock Ollama with a fixture in test mode) → view itinerary

### Manual demo checklist
At the end of Phase 14, walk through plan §8 demo strategy in order. Every step must work.

---

## 8. Git Workflow

- Branch: `main` for now (single dev). If multiple parallel sessions, branch per phase.
- Commit per phase minimum, more often if a phase is large
- Commit message format: `feat(phase-N): <summary>` for phases, `fix(scope): <issue>` for fixes, `chore(scope): <task>` for tooling
- **Never include `Co-Authored-By` lines in any commit message.**
- Tag `v0.<phase>` at the end of each phase, `v1.0.0` at the end of Phase 14
- Push after every commit if a remote is configured

---

## 9. Definition of Done (Whole Project)

The build is complete when **all** of the following are true:

- [ ] All 14 base features functional per plan §4
- [ ] All 7 advanced features functional per plan §4.B
- [ ] All 7 AI prompts implemented and producing valid output
- [ ] `pnpm build` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm test` passes
- [ ] Seed data renders the full demo flow from plan §8
- [ ] README explains setup, env vars, and deployment
- [ ] App is deployed to Vercel and the URL is in the README
- [ ] No `Co-Authored-By` lines anywhere in `git log`

---

## 10. Anti-Patterns — Do NOT Do These

- **Do not** invent features beyond the plan. Stick to the 21.
- **Do not** swap libraries from the locked stack without a stated reason.
- **Do not** use `any`, `as unknown as T`, or `// @ts-ignore` to silence type errors. Fix the type.
- **Do not** call Ollama from the client — always go through an API route or server action so the model URL stays server-side.
- **Do not** commit secrets. Verify `.env.local` is in `.gitignore`.
- **Do not** leave a phase half-done. If you hit a blocker, document it in `BLOCKERS.md` and skip to the next phase only if the blocker is in a non-foundational feature.
- **Do not** over-engineer for scale you won't have. SQLite + in-process EventEmitter + node-cron is correct for this scope. Don't reach for Redis/BullMQ/Pusher.
- **Do not** mock data in production code paths. Seed data goes in `prisma/seed.ts` only.
- **Do not** ship without dark mode if shadcn supports it out of the box (it does).
- **Do not** generate large lorem-ipsum content. UI copy should be specific and useful.
- **Do not** include `Co-Authored-By` lines in commit messages.

---

## 11. When You Get Stuck

1. **Re-read** the relevant section of `traveloop-implementation-plan.md` — the answer is usually there
2. **Inspect** existing code patterns from earlier phases — be consistent with what's already built
3. **Search** the official docs for Next.js 15 / Prisma / NextAuth — these change rapidly; don't rely on training
4. **Constrain** the problem: build the smallest version of the feature that compiles, then add depth
5. **Document** unresolved decisions in `DECISIONS.md` with rationale
6. **Never** silently skip a feature. If you must defer, write it explicitly in `BLOCKERS.md`.

---

## 12. First Action

First action when starting work: read `traveloop-implementation-plan.md` in full, then create a TODO list mirroring §4 of this prompt, then begin Phase 0.

---

*End of execution contract. The plan document is the spec; this document is the playbook. Build well.*
