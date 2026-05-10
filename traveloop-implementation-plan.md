# Traveloop — Complete Implementation Plan

Personalized, intelligent, and collaborative travel planning platform. All 14 base features + 7 advanced features.

---

## 1. Project Overview

Traveloop is a multi-city travel planning application that combines structured itinerary building with AI-powered personalization, group collaboration, and intelligent re-planning. Travelers can plan solo or in groups, split expenses, get AI-generated itineraries based on personality, and adapt their plans dynamically when locations become unavailable.

**Core Value Pillars**

1. **Plan** — manual or AI-assisted multi-city itineraries
2. **Personalize** — itineraries shaped by traveler personality
3. **Collaborate** — group trips with shared expenses, voting, and live AI planning
4. **Adapt** — dynamic re-planning when destinations are compromised
5. **Share** — public itineraries that others can copy or remix

---

## 2. Architecture & Tech Stack

### Frontend
- **Next.js 15** (App Router) — pages, API routes, server actions
- **React 19 + TypeScript**
- **Tailwind CSS + shadcn/ui** — component library
- **Leaflet + react-leaflet** — maps (free, no API key)
- **Recharts** — budget visualizations
- **Framer Motion** — micro-interactions
- **TanStack Query** — server state
- **Zustand** — light client state

### Backend
- **Next.js API Routes + Server Actions**
- **Prisma ORM**
- **PostgreSQL** (production) / **SQLite** (hackathon dev)
- **NextAuth.js** — authentication (credentials + Google OAuth)

### AI Layer
- **Ollama** running locally — `qwen3.5` (primary)
- Schema-constrained JSON output via Ollama's `format` field
- **Nominatim** (OpenStreetMap) — free geocoding for stop coordinates

### Real-time (for Trip Blend)
- **Server-Sent Events** (SSE) — simplest, no extra infra
- Upgrade path: Pusher or Ably for production

### Background Jobs (for AI reminders)
- **node-cron** in dev, BullMQ + Redis for production
- **Resend** for email reminders, Web Push API for browser notifications

### File Storage
- **UploadThing** or local `/public/uploads` (hackathon)
- **S3 / Cloudflare R2** for production

### Deployment
- **Vercel** (frontend + API routes)
- **Railway** or **Neon** (Postgres)
- Ollama on a local machine during demo, or Together AI / Groq as cloud fallback if Ollama unavailable

---

## 3. Database Schema

```prisma
// schema.prisma

generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

// ===== USERS =====
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?
  name            String
  avatarUrl       String?
  language        String    @default("en")
  personality     String?   // "foodie" | "adventurer" | "culture" | "chill" | "mixed"
  createdAt       DateTime  @default(now())
  isAdmin         Boolean   @default(false)

  trips           Trip[]
  tripMemberships TripMember[]
  expensesPaid    Expense[]      @relation("ExpensePayer")
  expenseShares   ExpenseShare[]
  todos           Todo[]
  notes           Note[]
  travelMatches   TravelMatch[]
  votesGiven      Vote[]
  savedDestinations SavedDestination[]
  events          UserEvent[]
}

model SavedDestination {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  city      String
  country   String
  notes     String?
  createdAt DateTime @default(now())
}

// ===== TRIPS =====
model Trip {
  id              String      @id @default(cuid())
  ownerId         String
  owner           User        @relation(fields: [ownerId], references: [id])
  name            String
  description     String?
  coverImageUrl   String?
  startDate       DateTime
  endDate         DateTime
  totalBudget     Float?
  currency        String      @default("USD")
  personality     String?
  isPublic        Boolean     @default(false)
  shareSlug       String?     @unique
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  stops           Stop[]
  expenses        Expense[]
  packingItems    PackingItem[]
  notes           Note[]
  members         TripMember[]
  todos           Todo[]
  blendGroup      BlendGroup?
}

model Stop {
  id              String    @id @default(cuid())
  tripId          String
  trip            Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  city            String
  country         String
  latitude        Float?
  longitude       Float?
  arrivalDay      Int       // 1-indexed across the trip
  departureDay    Int
  orderIndex      Int       // for reordering
  summary         String?
  isCompromised   Boolean   @default(false)

  // Accommodation (denormalized for simplicity)
  accomName       String?
  accomType       String?   // "hostel" | "hotel" | "airbnb" | etc.
  accomCostPerNight Float?

  // Transport to next stop
  transportMode   String?   // "flight" | "train" | "bus" | "car" | "ferry"
  transportCost   Float?
  transportHours  Float?

  dailyFoodEstimate Float?

  activities      Activity[]
  notes           Note[]
}

model Activity {
  id              String    @id @default(cuid())
  stopId          String
  stop            Stop      @relation(fields: [stopId], references: [id], onDelete: Cascade)
  name            String
  description     String
  day             Int
  category        String    // "food" | "sightseeing" | "adventure" | "culture" | "relaxation" | "shopping" | "nightlife"
  estimatedDurationHours Float?
  estimatedCost   Float
  personalityFit  String?
  imageUrl        String?
  bookingUrl      String?
  archived        Boolean   @default(false)
}

// ===== TRIP MEMBERS & SPLITWISE =====
model TripMember {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   @default("traveler") // "owner" | "co-planner" | "traveler"
  joinedAt  DateTime @default(now())

  expenseShares ExpenseShare[]
  votes         Vote[]

  @@unique([tripId, userId])
}

model Expense {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  payerId     String
  payer       User     @relation("ExpensePayer", fields: [payerId], references: [id])
  description String
  amount      Float
  currency    String
  category    String   // "transport" | "accommodation" | "food" | "activity" | "misc"
  paidAt      DateTime @default(now())
  stopId      String?
  activityId  String?

  shares      ExpenseShare[]
}

model ExpenseShare {
  id           String   @id @default(cuid())
  expenseId    String
  expense      Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  tripMemberId String?
  tripMember   TripMember? @relation(fields: [tripMemberId], references: [id])
  shareAmount  Float
  settled      Boolean  @default(false)
  settledAt    DateTime?
}

// ===== PACKING & NOTES =====
model PackingItem {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  item      String
  category  String   // "clothing" | "documents" | "electronics" | "toiletries" | "misc"
  packed    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Note {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  stopId    String?
  stop      Stop?    @relation(fields: [stopId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  day       Int?
  title     String?
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ===== AI TODOS & REMINDERS =====
model Todo {
  id              String    @id @default(cuid())
  tripId          String
  trip            Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  content         String
  dueAt           DateTime
  priority        String    @default("normal") // "low" | "normal" | "high"
  status          String    @default("pending") // "pending" | "done" | "missed"
  aiGenerated     Boolean   @default(false)
  aiSuggestedReason String?

  reminders       Reminder[]
}

model Reminder {
  id            String   @id @default(cuid())
  todoId        String
  todo          Todo     @relation(fields: [todoId], references: [id], onDelete: Cascade)
  scheduledAt   DateTime
  channel       String   // "email" | "push" | "in-app"
  sent          Boolean  @default(false)
  sentAt        DateTime?
}

// ===== TRAVEL COMPANION MATCHING =====
model TravelMatch {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  region        String
  startDate     DateTime
  endDate       DateTime
  personality   String
  budgetMin     Float
  budgetMax     Float
  groupSize     Int       @default(2)
  preferences   Json?     // free-form { ageRange, gender, interests, languages }
  status        String    @default("open") // "open" | "matched" | "closed"
  createdAt     DateTime  @default(now())
}

// ===== TRIP BLEND (Group Voting + Live AI) =====
model BlendGroup {
  id            String    @id @default(cuid())
  tripId        String    @unique
  trip          Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  status        String    @default("voting") // "voting" | "generating" | "finalized"
  votingDeadline DateTime?
  createdAt     DateTime  @default(now())

  candidates    PlaceCandidate[]
  itineraryVersions BlendItineraryVersion[]
}

model PlaceCandidate {
  id            String    @id @default(cuid())
  blendGroupId  String
  blendGroup    BlendGroup @relation(fields: [blendGroupId], references: [id], onDelete: Cascade)
  city          String
  country       String
  proposedById  String
  reason        String?
  createdAt     DateTime  @default(now())

  votes         Vote[]
}

model Vote {
  id            String    @id @default(cuid())
  candidateId   String
  candidate     PlaceCandidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  tripMemberId  String?
  tripMember    TripMember? @relation(fields: [tripMemberId], references: [id])
  weight        Int       @default(1) // 1-5 ranked vote
  createdAt     DateTime  @default(now())

  @@unique([candidateId, userId])
}

model BlendItineraryVersion {
  id              String    @id @default(cuid())
  blendGroupId    String
  blendGroup      BlendGroup @relation(fields: [blendGroupId], references: [id], onDelete: Cascade)
  versionNumber   Int
  generatedAt     DateTime  @default(now())
  itineraryJson   Json      // full itinerary snapshot
  triggerEvent    String    // "vote_added" | "candidate_added" | "manual"
}

// ===== ANALYTICS =====
model UserEvent {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  eventType   String   // "trip_created" | "ai_itinerary_generated" | "city_searched" | etc.
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([eventType, createdAt])
}

// ===== INFRASTRUCTURE =====
model GeocodeCache {
  id          String   @id @default(cuid())
  query       String   @unique
  latitude    Float
  longitude   Float
  fetchedAt   DateTime @default(now())
}

model CurrencyRate {
  id          String   @id @default(cuid())
  base        String
  target      String
  rate        Float
  fetchedAt   DateTime @default(now())

  @@unique([base, target])
}

model Notification {
  id          String   @id @default(cuid())
  userId      String
  title       String
  body        String?
  link        String?
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model MatchScore {
  id          String   @id @default(cuid())
  userAId     String
  userBId     String
  score       Int
  dimensions  Json
  computedAt  DateTime @default(now())

  @@unique([userAId, userBId])
}
```

---

## 4. Feature Specifications

### 4.1 Authentication

**Feature 1 — Login / Signup Screen**

- Routes: `/login`, `/signup`, `/forgot-password`
- Email + password (NextAuth credentials provider) + Google OAuth
- Form validation with Zod
- Password reset flow via Resend email + signed token
- Session: JWT in HTTP-only cookie

```typescript
// Zod validation
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(2),
});
```

### 4.2 Dashboard / Home

**Feature 2 — Dashboard**

- Route: `/dashboard`
- Sections:
  - Welcome banner with user name + avatar
  - Upcoming trips carousel (next 3 trips by `startDate`)
  - Plan New Trip primary CTA → opens trip creation modal
  - Recommended destinations — grid of 6 curated cities with images
  - Budget snapshot — total planned spend across active trips
  - Recent activity — last 5 user events (trip created, itinerary generated, etc.)
- Data fetched server-side with parallel `Promise.all`

### 4.3 Create Trip

**Feature 3 — Create Trip Screen**

- Route: `/trips/new` (or modal from dashboard)
- Fields: `name`, `startDate`, `endDate`, `description`, `coverImage` (optional), `totalBudget`, `currency`, `personality` (dropdown)
- Two-mode toggle:
  - Manual mode → empty trip, user adds stops next
  - AI mode → after save, redirects to itinerary generator (Feature 16)
- Server action validates dates (end > start), creates trip, redirects to itinerary builder

### 4.4 My Trips List

**Feature 4 — Trip List Screen**

- Route: `/trips`
- Filters: `status` (upcoming/past/draft), `personality`, search by name
- Sort: by date (default), by name, by budget
- Trip card shows: cover image, name, date range, destination count, total budget, member count, action menu (view / edit / duplicate / delete / share)
- Pagination (10 per page) or infinite scroll

### 4.5 Itinerary Builder

**Feature 5 — Itinerary Builder Screen**

- Route: `/trips/[id]/build`
- Layout: left panel (stops list, drag-to-reorder) + right panel (selected stop editor)
- Add Stop flow:
  1. Open city search modal (Feature 7)
  2. Set arrival/departure days within trip duration
  3. Add accommodation
  4. Add activities (Feature 8)
  5. Set transport to next stop
- Drag-and-drop reordering with `@dnd-kit/sortable`
- Day allocation validator (no overlaps, total ≤ trip duration)
- "Generate with AI" button that fills empty stops via Feature 16

### 4.6 Itinerary View

**Feature 6 — Itinerary View Screen**

- Route: `/trips/[id]`
- Three view modes (toggle):
  - **Timeline** — vertical day-by-day, color-coded by city
  - **Calendar** — month grid with activity blocks
  - **Map** — Leaflet map with numbered pins + connecting polyline
- Each activity block shows: name, time, cost, category icon
- Print/export to PDF button (`react-to-print` or `puppeteer`)
- Public preview link if trip is shared

### 4.7 City Search

**Feature 7 — City Search**

- Component: modal triggered from itinerary builder
- Data source options:
  - GeoNames API (free tier, 1000 req/day) — city + country + population
  - OpenStreetMap Nominatim — free, no key needed
  - Pre-seeded `cities.json` (top 1000 cities) for offline-safe demo
- City card shows: name, country flag, country, cost-of-living index, popularity score, image (Unsplash API)
- Filter: by country, by region, by cost tier (low/mid/high)
- "Add to Trip" button creates a `Stop` with default day allocation

### 4.8 Activity Search

**Feature 8 — Activity Search**

- Component: modal within itinerary builder, scoped to a stop
- Data sources:
  - Foursquare Places API (free tier) — venue search by city
  - OpenStreetMap Overpass API — POIs by category
  - Static seed data per top city as fallback
- Filters: category (sightseeing, food, adventure, culture, nightlife, shopping), max cost, duration
- Activity card: name, image, description, average cost, duration, rating
- Add/remove buttons; selecting auto-assigns to stop's available days

### 4.9 Budget & Cost Breakdown

**Feature 9 — Trip Budget & Cost Breakdown Screen**

- Route: `/trips/[id]/budget`
- Computed from: stop accommodations + activities + transport + meals
- Visualizations (Recharts):
  - Pie chart — breakdown by category (transport / stay / activities / meals / misc)
  - Bar chart — cost per day across the trip
  - Per-stop bar — cost per city
- KPIs: total estimated cost, average per day, % of budget used, days over budget
- Over-budget alert banner if any day or category exceeds threshold
- Editable budget targets per category

### 4.10 Packing Checklist

**Feature 10 — Packing Checklist Screen**

- Route: `/trips/[id]/packing`
- Pre-seeded category templates: clothing, documents, electronics, toiletries, misc
- AI suggestion button — generates a packing list based on destinations + dates + activities (uses prompt 5.7)
- Checkbox per item; progress bar shows packed %
- Reset all button
- Reuse from previous trip dropdown

### 4.11 Shared / Public Itinerary

**Feature 11 — Shared/Public Itinerary View Screen**

- Route: `/share/[slug]`
- Read-only Itinerary View
- Buttons: Copy Trip (clones trip to viewer's account, requires login) + Share on Social (Open Graph meta tags for Twitter/Facebook/WhatsApp/LinkedIn previews)
- Trip owner toggles `isPublic` and gets a unique `shareSlug` (nanoid 10 chars)
- View counter increments on each visit (debounced by IP)

### 4.12 User Profile / Settings

**Feature 12 — User Profile / Settings Screen**

- Route: `/settings`
- Tabs:
  - **Profile** — name, email, avatar upload, bio
  - **Preferences** — language, currency, default personality, notification settings
  - **Saved destinations** — list of bookmarked cities
  - **Security** — change password, active sessions, 2FA toggle
  - **Danger zone** — delete account (requires password confirmation)

### 4.13 Trip Notes / Journal

**Feature 13 — Trip Notes / Journal Screen**

- Route: `/trips/[id]/notes`
- Three scopes: trip-level, stop-level, day-level
- Markdown editor (`@uiw/react-md-editor`)
- Notes list sorted by `createdAt` desc with timestamps
- Search across notes within a trip
- Pin important notes to top

### 4.14 Admin / Analytics Dashboard

**Feature 14 — Admin / Analytics Dashboard**

- Route: `/admin` (gated by `user.isAdmin`)
- Sections:
  - **Overview KPIs** — total users, active trips, AI generations today, top growth metric
  - **Trip stats** — trips created over time (line chart), most popular destinations (bar chart), avg trip duration
  - **User engagement** — DAU/MAU, retention cohort grid, top users by trip count
  - **Activity heatmap** — top cities and activities by frequency
  - **User management** — table of all users with search, role toggle, ban/unban, account export
- Backed by `UserEvent` table aggregations + cached views

---

## 4.B Advanced (Addon) Features

### 4.B.1 Splitwise — Trip Expense Splitting

**Addon 1 — Group Expense Tracking**

- Route: `/trips/[id]/expenses`
- Add expense form: amount, currency, payer, category, description, split mode
- Split modes:
  - **Equal** — split evenly across all trip members
  - **By share** — assign weights to each member
  - **By exact amount** — manually enter each share
  - **By percentage**
- Settlement view:
  - Balance sheet — net amount each member owes/is owed
  - Settle up suggestions — minimum number of transactions to clear all debts (greedy algorithm)
- Multi-currency support (convert via `exchangerate-api.com`)
- Mark expense shares as settled

**Algorithm — minimum transactions to settle:**

```typescript
function settleBalances(balances: Map<string, number>) {
  // sort: max debtor (most negative) and max creditor (most positive)
  // pay min(|debt|, credit) between them
  // repeat until all balances ≈ 0
  const transactions = [];
  const arr = [...balances.entries()];
  while (true) {
    arr.sort((a, b) => a[1] - b[1]);
    const [debtor, debtAmount] = arr[0];
    const [creditor, creditAmount] = arr[arr.length - 1];
    if (Math.abs(debtAmount) < 0.01) break;
    const settled = Math.min(-debtAmount, creditAmount);
    transactions.push({ from: debtor, to: creditor, amount: settled });
    arr[0][1] += settled;
    arr[arr.length - 1][1] -= settled;
  }
  return transactions;
}
```

### 4.B.2 Random Pinpoints — Region-Based AI Discovery

**Addon 2 — AI Pinpoint Itinerary Generator**

- Route: `/trips/new/ai-pinpoint` or button on dashboard
- User inputs: region (country/state/city radius), duration, budget, personality, num cities
- AI generates: hidden gems + popular spots, geographically clustered
- Output rendered on map with numbered pins; user can accept/edit/regenerate individual stops
- Uses Prompt 5.1 with `discovery_mode: "explore"` flag for offbeat suggestions

### 4.B.3 Travel Companion Matching

**Addon 3 — Trip With Random People**

- Route: `/match`
- User creates a `TravelMatch` profile (region, dates, personality, budget range, group size, preferences like age/gender/languages)
- Matching algorithm scores compatibility on:
  - Date overlap (must overlap ≥ 80% of requested dates)
  - Budget overlap
  - Personality compatibility (Prompt 5.4 generates compatibility score 0-100)
  - Region match (exact or expandable radius)
- Matched users see each other's profiles in a swipeable card view
- Mutual match → opens chat thread + auto-creates a shared trip with both as members
- Safety features: identity verification badge, report/block, optional video intro

### 4.B.4 Dynamic Re-planning — Compromised Locations

**Addon 4 — Adaptive Trip Replanner**

- Each Stop has an `isCompromised` flag and a "Mark unavailable" button
- Reasons: travel advisory, weather, closed, personal preference
- Triggering compromise opens a side panel: AI suggests 3 alternative stops within constraints:
  - Same price band (±15%)
  - Within X km of original (configurable)
  - Same or compatible personality fit
  - Preserves trip duration and connection to neighboring stops
- User picks one → activities are re-generated for the new stop
- Activities of removed stop are archived (not deleted) for "undo"
- Background job: optional travel advisory monitor (uses public APIs like the U.S. State Dept advisories) auto-flags compromised stops

### 4.B.5 AI Personality Matching

**Addon 5 — Personality-Driven Itineraries**

- Onboarding quiz: 6-8 questions to determine personality
  - "Ideal Saturday: hiking trail / cooking class / art gallery / hammock?"
  - "Travel pace: 5 things a day / 2 things a day?"
  - etc.
- Personality types: `foodie`, `adventurer`, `culture`, `chill`, `social`, `budget`, `luxury`, `mixed`
- Stored on User and per-Trip (lets users plan in different modes)
- Influences:
  - AI itinerary generation weights
  - City recommendations on dashboard
  - Activity search default sort
  - Companion matching score

### 4.B.6 AI Reminders & Smart Todos

**Addon 6 — Intelligent Trip Todos**

- Per-trip and per-stop todo list
- User adds a todo with content + due date
- AI computes optimal reminder schedule:
  - High priority items: T-7d, T-3d, T-1d, T-2h
  - Normal priority: T-3d, T-1d
  - Low priority: T-1d
- AI suggests todos based on trip context:
  - Visa requirements (if international)
  - Vaccinations (based on destination CDC data)
  - Travel insurance reminder
  - Currency exchange
  - Luggage check 24h before flights
  - Hotel check-in confirmation
- Reminder channels: in-app toast, browser push, email
- Background job runs every 5 min, checks `Reminder.scheduledAt <= now`, sends, marks `sent: true`

### 4.B.7 Trip Blend — Group Voting + Live AI Itinerary

**Addon 7 — Collaborative Real-Time Trip Builder**

- Route: `/trips/[id]/blend`
- Trip owner enables blend mode → creates a `BlendGroup`
- All trip members can:
  - Propose place candidates (city + reason)
  - Vote on candidates (1-5 weighted, rank choice)
  - Leave comments on candidates
- Live AI itinerary regenerates whenever:
  - A new candidate is added
  - Vote weights cross thresholds
  - A member is added/removed
- Top-N voted candidates feed into the itinerary generator (Prompt 5.1)
- New version stored as `BlendItineraryVersion` (full history)
- Real-time updates via SSE — all connected clients see new candidates, vote tallies, and new itinerary versions stream in
- Voting deadline → auto-finalize → group cannot vote further; itinerary becomes the trip's official one

**Real-time architecture (SSE):**

```typescript
// /api/blend/[groupId]/stream/route.ts
export async function GET(req: NextRequest, { params }) {
  const stream = new ReadableStream({
    start(controller) {
      const sub = blendBus.subscribe(params.groupId, (event) => {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      });
      req.signal.addEventListener('abort', () => sub.unsubscribe());
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 5. AI Prompts

All prompts are designed for Ollama with `qwen3.5` using schema-constrained JSON output (`format` field). Temperatures and rules are tuned to small open-source models — strict, explicit, low ambiguity.

### 5.1 Itinerary Generator (Hero Prompt)

**System Prompt:**

```
You are an expert travel planner with deep knowledge of destinations worldwide. You generate detailed, realistic, day-wise multi-city itineraries as JSON only.

STRICT RULES:
- Output ONLY a JSON object matching the schema. No markdown fences, no preamble, no commentary.
- Total estimated cost must be within ±10% of the user's stated budget.
- Day numbering is 1-indexed and continuous across all stops (stop 1 = days 1-3, stop 2 = days 4-6, etc.).
- 2-4 activities per day. Mix categories sensibly (don't stack 4 museums in one day).
- Use real, well-known place names. Prefer "Tsukiji Outer Market" over "Local Fish Market".
- Accommodations: real chains (Marriott, Hyatt, Hilton, Hostelling International) or descriptive names ("Riverside Boutique Hotel", "Old Town Hostel").
- transport_to_next must be null only for the final stop.
- cost_breakdown subtotals must sum to total_estimated_cost (±2% rounding tolerance).
- Geographic clustering: stops should follow a logical travel route, not zigzag across the region.

PERSONALITY RULES:
- foodie: prioritize food markets, cooking classes, street food tours, regional specialties, michelin spots, food walks. 60%+ of activities are food/culinary.
- adventurer: hiking, water sports, off-beat trails, nature reserves, climbing, cycling. Physical/outdoor activities dominate.
- culture: museums, heritage sites, historical tours, local arts, traditional performances, architecture walks.
- chill: relaxed pace (max 2 activities/day), scenic cafes, beaches, parks, sunset spots, spa, slow travel.
- social: nightlife, group tours, festivals, bars, social experiences, hostels.
- budget: free attractions, public transport, hostels, street food, walking tours.
- luxury: 5-star hotels, fine dining, private tours, premium experiences.
- mixed: balanced spread across categories.

DISCOVERY MODE:
- "popular" (default): well-known, top-rated spots tourists recognize.
- "explore": offbeat, hidden gems, local-favorite spots, less touristy alternatives.
```

**User Prompt Template:**

```
Region: {region}
Duration: {days} days
Budget: {budget} {currency}
Traveler Personality: {personality}
Number of cities to visit: {numStops}
Discovery mode: {discoveryMode}
Travel start date: {startDate}
{groupContext}

Generate the complete itinerary as JSON.
```

`{groupContext}` is empty string for solo trips, or:

```
This is a group trip with {n} travelers. Voted-preferred cities: [city1, city2, city3]. Average personality: {avgPersonality}. Group size considerations: family-friendly portions, group-bookable activities.
```

**JSON Schema** (passed in Ollama `format` field):

```json
{
  "type": "object",
  "required": ["trip_summary", "personality", "currency", "total_days", "total_estimated_cost", "cost_breakdown", "stops"],
  "properties": {
    "trip_summary": { "type": "string" },
    "personality": { "type": "string" },
    "currency": { "type": "string" },
    "total_days": { "type": "integer" },
    "total_estimated_cost": { "type": "number" },
    "cost_breakdown": {
      "type": "object",
      "required": ["accommodation", "food", "activities", "transport", "miscellaneous"],
      "properties": {
        "accommodation": { "type": "number" },
        "food": { "type": "number" },
        "activities": { "type": "number" },
        "transport": { "type": "number" },
        "miscellaneous": { "type": "number" }
      }
    },
    "stops": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["city", "country", "arrival_day", "departure_day", "summary", "accommodation", "activities", "daily_food_estimate"],
        "properties": {
          "city": { "type": "string" },
          "country": { "type": "string" },
          "summary": { "type": "string" },
          "arrival_day": { "type": "integer" },
          "departure_day": { "type": "integer" },
          "accommodation": {
            "type": "object",
            "required": ["name", "type", "cost_per_night"],
            "properties": {
              "name": { "type": "string" },
              "type": { "type": "string", "enum": ["hostel", "budget_hotel", "mid_range_hotel", "boutique", "luxury", "homestay", "airbnb"] },
              "cost_per_night": { "type": "number" }
            }
          },
          "transport_to_next": {
            "type": ["object", "null"],
            "properties": {
              "mode": { "type": "string", "enum": ["flight", "train", "bus", "car", "ferry"] },
              "cost": { "type": "number" },
              "duration_hours": { "type": "number" }
            }
          },
          "daily_food_estimate": { "type": "number" },
          "activities": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "day", "category", "estimated_cost", "description"],
              "properties": {
                "name": { "type": "string" },
                "day": { "type": "integer" },
                "category": { "type": "string", "enum": ["food", "sightseeing", "adventure", "culture", "relaxation", "shopping", "nightlife"] },
                "estimated_duration_hours": { "type": "number" },
                "estimated_cost": { "type": "number" },
                "description": { "type": "string" },
                "personality_fit": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### 5.2 Dynamic Alternative Suggester

**System Prompt:**

```
You are a travel re-planning specialist. When a destination becomes unavailable, you suggest alternative destinations that preserve the traveler's experience as closely as possible.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Suggest exactly 3 alternatives, ranked best to worst.
- Each alternative must be:
  * Within ±15% of the original stop's accommodation + activities cost
  * Within {maxDistanceKm} km of the original city (geographic proximity)
  * Compatible with the traveler's personality
  * Practically reachable from the previous and next stops in the itinerary
- For each alternative, provide a brief comparison highlighting what is preserved and what differs.
- Do not suggest the original city itself or cities already in the itinerary.
```

**User Prompt Template:**

```
Original compromised stop:
- City: {originalCity}, {originalCountry}
- Accommodation cost per night: {accomCost} {currency}
- Total activities cost: {activitiesCost} {currency}
- Activity categories present: {categories}

Trip context:
- Personality: {personality}
- Previous stop: {prevCity}, {prevCountry}
- Next stop: {nextCity}, {nextCountry}
- Days available at this stop: {numDays}
- Reason for compromise: {reason}

Suggest 3 alternative destinations.
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["alternatives"],
  "properties": {
    "alternatives": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["rank", "city", "country", "estimated_cost_match", "distance_km_estimate", "personality_match_score", "preserved", "differs", "transport_from_previous", "summary"],
        "properties": {
          "rank": { "type": "integer", "enum": [1, 2, 3] },
          "city": { "type": "string" },
          "country": { "type": "string" },
          "estimated_cost_match": { "type": "string", "enum": ["lower", "similar", "higher"] },
          "distance_km_estimate": { "type": "number" },
          "personality_match_score": { "type": "integer", "minimum": 0, "maximum": 100 },
          "preserved": { "type": "string" },
          "differs": { "type": "string" },
          "transport_from_previous": {
            "type": "object",
            "required": ["mode", "estimated_hours"],
            "properties": {
              "mode": { "type": "string" },
              "estimated_hours": { "type": "number" }
            }
          },
          "summary": { "type": "string" }
        }
      }
    }
  }
}
```

### 5.3 Companion Compatibility Scorer

**System Prompt:**

```
You evaluate how compatible two travelers are for a shared trip. Score on a 0-100 scale based on personality match, travel style alignment, budget compatibility, and stated preferences.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Be honest — do not inflate scores. A 50 means moderate compatibility.
- Compatibility dimensions and weights:
  * Personality alignment: 35%
  * Budget overlap: 25%
  * Pace preference: 20%
  * Interests overlap: 15%
  * Communication style: 5%
- Provide one strength and one potential friction point.
```

**User Prompt Template:**

```
Traveler A:
- Personality: {a.personality}
- Budget range: {a.budgetMin}-{a.budgetMax} {a.currency}/day
- Pace: {a.pace}
- Interests: {a.interests}
- Languages: {a.languages}
- Travel experience: {a.experience}

Traveler B:
- Personality: {b.personality}
- Budget range: {b.budgetMin}-{b.budgetMax} {b.currency}/day
- Pace: {b.pace}
- Interests: {b.interests}
- Languages: {b.languages}
- Travel experience: {b.experience}

Score their compatibility for a shared trip.
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["overall_score", "dimensions", "strength", "friction_point", "recommendation"],
  "properties": {
    "overall_score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "dimensions": {
      "type": "object",
      "required": ["personality", "budget", "pace", "interests", "communication"],
      "properties": {
        "personality": { "type": "integer", "minimum": 0, "maximum": 100 },
        "budget": { "type": "integer", "minimum": 0, "maximum": 100 },
        "pace": { "type": "integer", "minimum": 0, "maximum": 100 },
        "interests": { "type": "integer", "minimum": 0, "maximum": 100 },
        "communication": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    },
    "strength": { "type": "string" },
    "friction_point": { "type": "string" },
    "recommendation": { "type": "string", "enum": ["strong_match", "good_match", "moderate_match", "weak_match", "not_recommended"] }
  }
}
```

### 5.4 Smart Todo Suggester

**System Prompt:**

```
You generate actionable, time-sensitive trip preparation todos based on a traveler's itinerary. Each todo has a clear action and an optimal due date relative to the trip start.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Suggest 6-12 todos depending on trip complexity (international > domestic, longer > shorter).
- Each todo's due date is expressed as days before {tripStartDate}, not absolute.
- Categorize each todo: documents, health, finance, packing, booking, logistics, communication.
- Include reminder schedule (offsets in days/hours before due date) appropriate to priority.
- Prioritize: high (visa, vaccinations, flight check-in) / normal (currency, insurance) / low (download offline maps).
- Skip todos already irrelevant (e.g., no visa todo for domestic travel).
```

**User Prompt Template:**

```
Trip details:
- Origin country: {originCountry}
- Destinations: {destinations}
- Start date: {tripStartDate}
- End date: {tripEndDate}
- Trip duration: {days} days
- International: {isInternational}
- Personality: {personality}
- Activity categories: {activityCategories}
- Group size: {groupSize}

Generate trip preparation todos with optimal reminder schedules.
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["todos"],
  "properties": {
    "todos": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["content", "category", "priority", "days_before_trip", "reason", "reminder_offsets"],
        "properties": {
          "content": { "type": "string" },
          "category": { "type": "string", "enum": ["documents", "health", "finance", "packing", "booking", "logistics", "communication"] },
          "priority": { "type": "string", "enum": ["high", "normal", "low"] },
          "days_before_trip": { "type": "integer" },
          "reason": { "type": "string" },
          "reminder_offsets": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["amount", "unit"],
              "properties": {
                "amount": { "type": "integer" },
                "unit": { "type": "string", "enum": ["hours", "days"] }
              }
            }
          }
        }
      }
    }
  }
}
```

### 5.5 Trip Blend Live Itinerary Generator

**System Prompt:**

```
You generate group itineraries from a list of voted-on candidate cities. The itinerary must reflect the group's collective preferences, balancing each city's vote weight.

STRICT RULES:
- Output ONLY a JSON object matching the same schema as the standard itinerary generator (5.1).
- Top-voted cities receive more days proportional to vote weight, capped sensibly.
- If group personalities are mixed, balance activities across personality types.
- Include 1 "compromise activity" per stop — something appealing across multiple personalities.
- If voting changed since last generation, briefly note in trip_summary what shifted.
```

**User Prompt Template:**

```
Group trip details:
- Total duration: {days} days
- Total budget: {budget} {currency}
- Group size: {groupSize}
- Group personalities: {personalitiesList}

Voted candidates (city, country, vote weight, votes):
{candidatesTable}

Constraints:
- Top {maxStops} cities by total weight should be included.
- Personality balance: foodie {foodieWeight}%, adventurer {advWeight}%, culture {cultureWeight}%, chill {chillWeight}%.
- Previous itinerary version: {previousSummary} (use for diffing in trip_summary).

Generate the group itinerary.
```

**JSON Schema**: same as 5.1.

### 5.6 Random Pinpoints Discovery

**System Prompt:**

```
You are a local expert recommender. Given a region, you suggest geographically-clustered points of interest that match a traveler's personality, with emphasis on lesser-known spots alongside must-sees.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Suggest {n} pinpoints, geographically clustered (no zigzags across the region).
- Mix: 60% locally-loved/offbeat, 40% well-known landmarks.
- Each pinpoint includes approximate lat/lng (you can give rounded values; backend will geocode precisely).
- For each pinpoint, give a one-line "why this matches" tied to the personality.
- Group pinpoints into 2-5 day clusters by proximity.
```

**User Prompt Template:**

```
Region: {region}
Personality: {personality}
Number of pinpoints: {n}
Travel pace: {pace}
Avoid (already visited or disliked): {avoidList}

Suggest pinpoints organized into day-clusters.
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["region", "clusters"],
  "properties": {
    "region": { "type": "string" },
    "clusters": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["cluster_day", "cluster_name", "pinpoints"],
        "properties": {
          "cluster_day": { "type": "integer" },
          "cluster_name": { "type": "string" },
          "pinpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "type", "approx_lat", "approx_lng", "why_matches", "is_offbeat", "estimated_cost", "estimated_duration_hours"],
              "properties": {
                "name": { "type": "string" },
                "type": { "type": "string" },
                "approx_lat": { "type": "number" },
                "approx_lng": { "type": "number" },
                "why_matches": { "type": "string" },
                "is_offbeat": { "type": "boolean" },
                "estimated_cost": { "type": "number" },
                "estimated_duration_hours": { "type": "number" }
              }
            }
          }
        }
      }
    }
  }
}
```

### 5.7 Smart Packing List Generator

**System Prompt:**

```
You generate context-aware packing lists for trips. The list adapts to destinations (climate, culture), activities (gear needed), trip duration, and personality.

STRICT RULES:
- Output ONLY a JSON object matching the schema.
- Categorize every item: clothing, documents, electronics, toiletries, gear, misc.
- Include quantities where relevant (e.g., "T-shirts (5)" for a 7-day trip).
- Mark items as essential or optional.
- Include destination-specific items (e.g., "modest clothing for temple visits", "swimwear for beaches", "hiking boots for trail activities").
- Total list size: 25-50 items depending on trip complexity.
```

**User Prompt Template:**

```
Trip details:
- Destinations + climates: {destClimateList}
- Duration: {days} days
- Activity categories: {activityCategories}
- Personality: {personality}
- Time of year / season: {season}
- Special considerations: {special} (e.g., "religious sites", "high altitude", "rainy season")

Generate a smart packing list.
```

**JSON Schema:**

```json
{
  "type": "object",
  "required": ["items"],
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["item", "category", "essential", "quantity"],
        "properties": {
          "item": { "type": "string" },
          "category": { "type": "string", "enum": ["clothing", "documents", "electronics", "toiletries", "gear", "misc"] },
          "essential": { "type": "boolean" },
          "quantity": { "type": "integer", "minimum": 1 },
          "notes": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 6. API Routes Map

```
# Auth
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/session

# User
GET    /api/users/me
PATCH  /api/users/me
DELETE /api/users/me
GET    /api/users/me/saved-destinations
POST   /api/users/me/saved-destinations
DELETE /api/users/me/saved-destinations/:id

# Trips (CRUD)
GET    /api/trips                       # list user's trips
POST   /api/trips                       # create
GET    /api/trips/:id                   # full trip detail
PATCH  /api/trips/:id
DELETE /api/trips/:id
POST   /api/trips/:id/duplicate

# Stops
POST   /api/trips/:id/stops
PATCH  /api/trips/:id/stops/:stopId
DELETE /api/trips/:id/stops/:stopId
PATCH  /api/trips/:id/stops/reorder
POST   /api/trips/:id/stops/:stopId/compromise   # mark compromised + get alternatives

# Activities
POST   /api/stops/:stopId/activities
PATCH  /api/activities/:id
DELETE /api/activities/:id

# Search
GET    /api/cities/search?q=&country=
GET    /api/activities/search?stopId=&category=&maxCost=

# AI
POST   /api/ai/itinerary                # Prompt 5.1
POST   /api/ai/alternatives             # Prompt 5.2
POST   /api/ai/compatibility            # Prompt 5.3
POST   /api/ai/todos/suggest            # Prompt 5.4
POST   /api/ai/blend/itinerary          # Prompt 5.5
POST   /api/ai/pinpoints                # Prompt 5.6
POST   /api/ai/packing                  # Prompt 5.7

# Budget & Expenses (Splitwise)
GET    /api/trips/:id/budget
GET    /api/trips/:id/expenses
POST   /api/trips/:id/expenses
PATCH  /api/expenses/:id
DELETE /api/expenses/:id
GET    /api/trips/:id/balances
POST   /api/trips/:id/settle

# Trip Members
POST   /api/trips/:id/members
DELETE /api/trips/:id/members/:userId
PATCH  /api/trips/:id/members/:userId   # role change

# Notes
GET    /api/trips/:id/notes
POST   /api/trips/:id/notes
PATCH  /api/notes/:id
DELETE /api/notes/:id

# Packing
GET    /api/trips/:id/packing
POST   /api/trips/:id/packing
PATCH  /api/packing/:id
DELETE /api/packing/:id
POST   /api/trips/:id/packing/reset

# Todos & Reminders
GET    /api/trips/:id/todos
POST   /api/trips/:id/todos
PATCH  /api/todos/:id
DELETE /api/todos/:id

# Public Sharing
GET    /api/share/:slug
POST   /api/trips/:id/share             # toggle public + return slug
POST   /api/share/:slug/copy            # copy public trip to viewer

# Travel Match
GET    /api/match                       # find compatible matches
POST   /api/match                       # create my profile
DELETE /api/match/:id
POST   /api/match/:id/connect           # request to connect

# Trip Blend
POST   /api/trips/:id/blend             # create blend group
GET    /api/blend/:groupId
POST   /api/blend/:groupId/candidates
POST   /api/blend/:groupId/candidates/:cId/vote
POST   /api/blend/:groupId/finalize
GET    /api/blend/:groupId/stream       # SSE

# Admin
GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:id
GET    /api/admin/events?type=&from=&to=
```

---

## 7. Implementation Phases

Even with all features in scope, you have to build in an order that maximizes demo value at every checkpoint. Each phase ends with a deployable, demo-able state — never leave a half-built feature blocking the next.

### Phase 0 — Foundation (setup, ~30 min)
Project scaffold, Prisma + DB, NextAuth, Tailwind, shadcn/ui base layout, deployed hello-world on Vercel. Commit early, push often.

### Phase 1 — Core Trip CRUD (90 min)
Auth + Trip create/list/view/edit/delete + Stop CRUD + Activity CRUD. No AI yet. Manual itinerary works end-to-end.

### Phase 2 — Hero AI Feature (60-90 min)
Implement Prompt 5.1 + Ollama integration + Nominatim geocoding. "Generate with AI" button on Create Trip. Render generated itinerary in Itinerary View (timeline mode). This is your demo moment — make it sing.

### Phase 3 — Visualization Layer (60 min)
Map view (Leaflet) + Calendar view + Budget pie chart (Recharts). Toggle between views. Cost breakdown screen.

### Phase 4 — Discovery & Search (45 min)
City search modal + Activity search modal. Static seed data fallback for offline-safe demo.

### Phase 5 — Sharing & Export (45 min)
Public share URL + read-only view + Copy Trip + Open Graph tags. PDF export via `puppeteer` or `react-to-print`.

### Phase 6 — Personality & Discovery AI (45 min)
Onboarding personality quiz. Pinpoint discovery (Prompt 5.6) integrated into a "Discover" tab on the dashboard.

### Phase 7 — Splitwise (60 min)
Trip Members + Expense entry + Settlement algorithm + Balance view. Multi-currency optional.

### Phase 8 — Dynamic Replanning (45 min)
Mark stop as compromised → call Prompt 5.2 → render 3 alternatives → swap on selection. Second strong demo moment.

### Phase 9 — Smart Todos & Reminders (60 min)
Todo CRUD + Prompt 5.4 for AI suggestions + reminder scheduler (cron) + in-app toasts. Email reminders if Resend set up.

### Phase 10 — Notes, Packing, Profile (45 min)
Trip notes editor + Packing checklist with AI generation (Prompt 5.7) + User profile/settings.

### Phase 11 — Trip Blend (90 min — the heavyweight)
BlendGroup creation + candidate proposals + voting UI + SSE stream + Live AI itinerary regeneration on vote events (Prompt 5.5). Test with 2 browser windows.

### Phase 12 — Travel Companion Matching (60 min)
Match profile creation + compatibility scorer (Prompt 5.3) + swipeable card UI + match request flow + auto-create shared trip on mutual match.

### Phase 13 — Admin Dashboard (45 min)
Event tracking middleware (log to `UserEvent`) + admin route + KPI cards + charts + user table.

### Phase 14 — Polish & Demo Prep (60 min)
Seed data (3-4 polished example trips), loading states, empty states, error boundaries, mobile responsiveness check, demo script, pitch deck.

---

## 8. Demo Strategy

The pitch order for judges, optimized for "wow" sequencing:

1. **Open with the AI generator** (Feature 5.1). Type "Vietnam, 10 days, $1500, Foodie" → wait 5s → full itinerary appears with map. This is the hook.
2. **Show the map + budget breakdown** to demonstrate end-to-end planning.
3. **Mark Hanoi as compromised** → AI suggests 3 alternatives → swap. Adaptive intelligence.
4. **Switch to Trip Blend mode**, open a second browser window as "friend", propose Bali → vote together → live itinerary regenerates. Real-time collaboration.
5. **Splitwise flash**: add an expense, show settlement view. Practical depth.
6. **Personality quiz + matchmaking**: take quiz, find a match. Social layer.
7. **Public share URL**: paste in another browser → "Copy Trip". Network effect.
8. **Close on the admin dashboard** showing the analytics if the audience is technical.

### Pitch Framing

> "Most travel apps are forms. Traveloop is a planning intelligence: it generates itineraries that match who you are, adapts when reality changes, and brings your group together to plan in real time — with AI re-blending the trip every time someone votes."

---

## 9. Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@host:5432/traveloop"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen3.5"

NOMINATIM_USER_AGENT="Traveloop-Hackathon/1.0"
FOURSQUARE_API_KEY=""
GEONAMES_USERNAME=""
UNSPLASH_ACCESS_KEY=""

RESEND_API_KEY=""
EXCHANGE_RATE_API_KEY=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 10. Reference Library Versions

```json
{
  "next": "15.0.0",
  "react": "19.0.0",
  "@prisma/client": "^5.22.0",
  "next-auth": "^4.24.10",
  "tailwindcss": "^3.4.14",
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "recharts": "^2.13.3",
  "framer-motion": "^11.11.0",
  "@tanstack/react-query": "^5.59.0",
  "zustand": "^5.0.0",
  "zod": "^3.23.8",
  "@dnd-kit/sortable": "^8.0.0",
  "@uiw/react-md-editor": "^4.0.4",
  "nanoid": "^5.0.0",
  "node-cron": "^3.0.3",
  "resend": "^4.0.0"
}
```

---

*End of plan. Build in phases. Demo the AI moments. Ship something that makes judges remember the name.*
