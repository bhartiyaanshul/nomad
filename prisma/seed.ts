// Demo seed for /pnpm seed.
// Creates an admin, three travellers with different personalities, four
// trips (one public + share slug), a Trip Blend group with candidates and
// votes, two travel-match profiles that overlap, and an AI itinerary
// generation event so the admin dashboard has data to render.

import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { nanoid } from "nanoid";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

let PASSWORD_HASH = "";

async function ensureUser(args: {
  email: string;
  name: string;
  personality: string;
  isAdmin?: boolean;
}) {
  return db.user.upsert({
    where: { email: args.email },
    update: {
      passwordHash: PASSWORD_HASH,
      name: args.name,
      personality: args.personality,
      isAdmin: args.isAdmin ?? false,
    },
    create: {
      email: args.email,
      passwordHash: PASSWORD_HASH,
      name: args.name,
      personality: args.personality,
      isAdmin: args.isAdmin ?? false,
      currency: "USD",
    },
  });
}

async function main() {
  PASSWORD_HASH = await bcrypt.hash("Password1", 10);
  console.log("Seeding…");

  const admin = await ensureUser({
    email: "admin@traveloop.dev",
    name: "Anshul Admin",
    personality: "mixed",
    isAdmin: true,
  });
  const alice = await ensureUser({
    email: "alice@traveloop.dev",
    name: "Alice Martin",
    personality: "foodie",
  });
  const bob = await ensureUser({
    email: "bob@traveloop.dev",
    name: "Bob Park",
    personality: "adventurer",
  });
  const carla = await ensureUser({
    email: "carla@traveloop.dev",
    name: "Carla Diaz",
    personality: "culture",
  });
  const diego = await ensureUser({
    email: "diego@traveloop.dev",
    name: "Diego Alvarez",
    personality: "adventurer",
  });
  const emi = await ensureUser({
    email: "emi@traveloop.dev",
    name: "Emi Tanaka",
    personality: "foodie",
  });
  const farah = await ensureUser({
    email: "farah@traveloop.dev",
    name: "Farah El-Amin",
    personality: "culture",
  });
  const greta = await ensureUser({
    email: "greta@traveloop.dev",
    name: "Greta Lindqvist",
    personality: "chill",
  });
  const hiro = await ensureUser({
    email: "hiro@traveloop.dev",
    name: "Hiro Kobayashi",
    personality: "culture",
  });

  // Wipe demo trips so re-running is idempotent
  const demoUserIds = [
    admin.id,
    alice.id,
    bob.id,
    carla.id,
    diego.id,
    emi.id,
    farah.id,
    greta.id,
    hiro.id,
  ];
  await db.trip.deleteMany({
    where: { ownerId: { in: demoUserIds } },
  });
  await db.travelMatch.deleteMany({
    where: { userId: { in: demoUserIds } },
  });

  // ============ Trip 1 — solo Foodie in Vietnam (Alice) ============
  const vietnam = await db.trip.create({
    data: {
      ownerId: alice.id,
      name: "Vietnam street-food run",
      description: "Ten days, mostly eating. Hanoi → Hoi An → Saigon.",
      startDate: addDays(new Date(), 30),
      endDate: addDays(new Date(), 39),
      totalBudget: 1500,
      currency: "USD",
      personality: "foodie",
    },
  });
  await db.tripMember.create({
    data: { tripId: vietnam.id, userId: alice.id, role: "owner" },
  });
  await seedStops(vietnam.id, [
    {
      city: "Hanoi",
      country: "Vietnam",
      lat: 21.0285,
      lng: 105.8542,
      arrival: 1,
      departure: 4,
      accom: { name: "Old Quarter Heritage", type: "boutique", cost: 60 },
      transport: { mode: "flight", cost: 50, hours: 2 },
      activities: [
        { name: "Bun cha lunch in Old Quarter", day: 1, category: "food", cost: 8 },
        { name: "Hanoi Train Street coffee", day: 1, category: "sightseeing", cost: 4 },
        { name: "Hanoi Cooking Centre class", day: 2, category: "food", cost: 60 },
      ],
    },
    {
      city: "Hoi An",
      country: "Vietnam",
      lat: 15.8801,
      lng: 108.338,
      arrival: 5,
      departure: 7,
      accom: { name: "Riverside Guesthouse", type: "homestay", cost: 50 },
      transport: { mode: "flight", cost: 70, hours: 1.5 },
      activities: [
        { name: "Cao Lau noodle hunt", day: 5, category: "food", cost: 5 },
        { name: "Tra Que Village cooking class", day: 6, category: "food", cost: 40 },
      ],
    },
    {
      city: "Ho Chi Minh City",
      country: "Vietnam",
      lat: 10.7769,
      lng: 106.7009,
      arrival: 8,
      departure: 10,
      accom: { name: "District 1 Boutique", type: "boutique", cost: 70 },
      activities: [
        { name: "Banh Mi Huynh Hoa lunch", day: 8, category: "food", cost: 4 },
        { name: "Vespa night food tour", day: 9, category: "food", cost: 80 },
      ],
    },
  ]);

  // ============ Trip 2 — group Adventurer in Patagonia (Bob, public) ============
  const patagonia = await db.trip.create({
    data: {
      ownerId: bob.id,
      name: "Patagonia trekking",
      description: "Two-week loop through Bariloche, El Chaltén, Torres del Paine.",
      startDate: addDays(new Date(), 60),
      endDate: addDays(new Date(), 73),
      totalBudget: 3000,
      currency: "USD",
      personality: "adventurer",
      isPublic: true,
      shareSlug: nanoid(10),
    },
  });
  await db.tripMember.createMany({
    data: [
      { tripId: patagonia.id, userId: bob.id, role: "owner" },
      { tripId: patagonia.id, userId: alice.id, role: "traveler" },
      { tripId: patagonia.id, userId: carla.id, role: "co-planner" },
    ],
  });
  await seedStops(patagonia.id, [
    {
      city: "Bariloche",
      country: "Argentina",
      lat: -41.1335,
      lng: -71.3103,
      arrival: 1,
      departure: 4,
      accom: { name: "Cerro Otto Lodge", type: "mid_range_hotel", cost: 90 },
      transport: { mode: "bus", cost: 30, hours: 4 },
      activities: [
        { name: "Cerro Catedral hike", day: 1, category: "adventure", cost: 25 },
        { name: "Lake Nahuel Huapi paddle", day: 2, category: "adventure", cost: 35 },
      ],
    },
    {
      city: "El Calafate",
      country: "Argentina",
      lat: -50.337,
      lng: -72.2647,
      arrival: 5,
      departure: 9,
      accom: { name: "Glaciar View B&B", type: "homestay", cost: 80 },
      transport: { mode: "bus", cost: 40, hours: 5 },
      activities: [
        { name: "Perito Moreno trek", day: 5, category: "adventure", cost: 90 },
        { name: "Mount Fitz Roy day hike", day: 7, category: "adventure", cost: 0 },
      ],
    },
    {
      city: "Puerto Natales",
      country: "Chile",
      lat: -51.7308,
      lng: -72.5061,
      arrival: 10,
      departure: 14,
      accom: { name: "Erratic Rock Hostel", type: "hostel", cost: 35 },
      activities: [
        { name: "Torres del Paine W-trek (4d)", day: 11, category: "adventure", cost: 180 },
      ],
    },
  ]);

  // ============ Trip 3 — Carla cultural Italy (also public) ============
  const italy = await db.trip.create({
    data: {
      ownerId: carla.id,
      name: "Northern Italy slow art tour",
      description: "Galleries, gardens, and slow lunches across Florence, Bologna, Venice.",
      startDate: addDays(new Date(), 90),
      endDate: addDays(new Date(), 99),
      totalBudget: 2200,
      currency: "EUR",
      personality: "culture",
      isPublic: true,
      shareSlug: nanoid(10),
    },
  });
  await db.tripMember.create({
    data: { tripId: italy.id, userId: carla.id, role: "owner" },
  });
  await seedStops(italy.id, [
    {
      city: "Florence",
      country: "Italy",
      lat: 43.7696,
      lng: 11.2558,
      arrival: 1,
      departure: 4,
      accom: { name: "Hotel Davanzati", type: "boutique", cost: 140 },
      transport: { mode: "train", cost: 30, hours: 1 },
      activities: [
        { name: "Uffizi morning tour", day: 1, category: "culture", cost: 30 },
        { name: "Mercato Centrale dinner", day: 2, category: "food", cost: 35 },
      ],
    },
    {
      city: "Bologna",
      country: "Italy",
      lat: 44.4949,
      lng: 11.3426,
      arrival: 5,
      departure: 7,
      accom: { name: "Quadrilatero B&B", type: "boutique", cost: 110 },
      transport: { mode: "train", cost: 40, hours: 1.5 },
      activities: [
        { name: "Tortellini cooking class", day: 5, category: "food", cost: 70 },
        { name: "Pinacoteca Nazionale", day: 6, category: "culture", cost: 12 },
      ],
    },
    {
      city: "Venice",
      country: "Italy",
      lat: 45.4408,
      lng: 12.3155,
      arrival: 8,
      departure: 10,
      accom: { name: "Cannaregio Apartment", type: "airbnb", cost: 130 },
      activities: [
        { name: "Punta della Dogana", day: 8, category: "culture", cost: 18 },
      ],
    },
  ]);

  // ============ Trip 4 — admin's draft Bali chill ============
  const bali = await db.trip.create({
    data: {
      ownerId: admin.id,
      name: "Bali slow week",
      description: "Ubud cafes and Canggu sunsets.",
      startDate: addDays(new Date(), 120),
      endDate: addDays(new Date(), 126),
      totalBudget: 900,
      currency: "USD",
      personality: "chill",
    },
  });
  await db.tripMember.create({
    data: { tripId: bali.id, userId: admin.id, role: "owner" },
  });

  // ============ Blend group on Patagonia trip ============
  const blend = await db.blendGroup.create({
    data: { tripId: patagonia.id, status: "voting" },
  });
  const candidate1 = await db.placeCandidate.create({
    data: {
      blendGroupId: blend.id,
      city: "Ushuaia",
      country: "Argentina",
      proposedById: alice.id,
      reason: "Wanted to add an Antarctic-edge day-trip option",
    },
  });
  const candidate2 = await db.placeCandidate.create({
    data: {
      blendGroupId: blend.id,
      city: "Bariloche",
      country: "Argentina",
      proposedById: bob.id,
      reason: "Already in the route — keep the day count high",
    },
  });
  await db.vote.createMany({
    data: [
      { candidateId: candidate1.id, userId: alice.id, weight: 5 },
      { candidateId: candidate1.id, userId: carla.id, weight: 3 },
      { candidateId: candidate2.id, userId: bob.id, weight: 5 },
      { candidateId: candidate2.id, userId: alice.id, weight: 1 },
    ],
  });

  // ============ Travel matches that overlap ============
  await db.travelMatch.create({
    data: {
      userId: alice.id,
      region: "Vietnam",
      startDate: addDays(new Date(), 25),
      endDate: addDays(new Date(), 45),
      personality: "foodie",
      budgetMin: 40,
      budgetMax: 120,
      currency: "USD",
      groupSize: 2,
      preferences: JSON.stringify({
        pace: "balanced",
        interests: ["street food", "coffee", "markets"],
        languages: ["English"],
        experience: "Mid — a few trips a year",
      }),
    },
  });
  await db.travelMatch.create({
    data: {
      userId: carla.id,
      region: "Vietnam",
      startDate: addDays(new Date(), 28),
      endDate: addDays(new Date(), 42),
      personality: "culture",
      budgetMin: 50,
      budgetMax: 140,
      currency: "USD",
      groupSize: 2,
      preferences: JSON.stringify({
        pace: "balanced",
        interests: ["museums", "architecture", "regional crafts"],
        languages: ["English", "Spanish"],
        experience: "Well-travelled",
      }),
    },
  });

  // Wider-ranging traveller profiles so a real user creating a profile in
  // any of these regions gets immediate matches to browse.
  await db.travelMatch.createMany({
    data: [
      {
        userId: diego.id,
        region: "Patagonia",
        startDate: addDays(new Date(), 30),
        endDate: addDays(new Date(), 120),
        personality: "adventurer",
        budgetMin: 60,
        budgetMax: 180,
        currency: "USD",
        groupSize: 2,
        preferences: JSON.stringify({
          pace: "fast",
          interests: ["hiking", "trail running", "climbing"],
          languages: ["English", "Spanish"],
          experience: "Long-haul backpacker",
        }),
      },
      {
        userId: emi.id,
        region: "Japan",
        startDate: addDays(new Date(), 0),
        endDate: addDays(new Date(), 180),
        personality: "foodie",
        budgetMin: 80,
        budgetMax: 220,
        currency: "USD",
        groupSize: 2,
        preferences: JSON.stringify({
          pace: "balanced",
          interests: ["ramen", "izakaya", "kaiseki", "specialty coffee"],
          languages: ["English", "Japanese"],
          experience: "Mid — annual trips",
        }),
      },
      {
        userId: farah.id,
        region: "Morocco",
        startDate: addDays(new Date(), 14),
        endDate: addDays(new Date(), 150),
        personality: "culture",
        budgetMin: 50,
        budgetMax: 140,
        currency: "USD",
        groupSize: 3,
        preferences: JSON.stringify({
          pace: "balanced",
          interests: ["riads", "souks", "desert nights", "ceramics"],
          languages: ["English", "French", "Arabic"],
          experience: "Well-travelled",
        }),
      },
      {
        userId: greta.id,
        region: "Italy",
        startDate: addDays(new Date(), 20),
        endDate: addDays(new Date(), 160),
        personality: "chill",
        budgetMin: 70,
        budgetMax: 200,
        currency: "EUR",
        groupSize: 2,
        preferences: JSON.stringify({
          pace: "slow",
          interests: ["lakes", "cafes", "modernist design"],
          languages: ["English", "Swedish"],
          experience: "Mid",
        }),
      },
      {
        userId: hiro.id,
        region: "Japan",
        startDate: addDays(new Date(), 7),
        endDate: addDays(new Date(), 170),
        personality: "culture",
        budgetMin: 90,
        budgetMax: 240,
        currency: "USD",
        groupSize: 2,
        preferences: JSON.stringify({
          pace: "balanced",
          interests: ["temples", "noh theatre", "traditional crafts"],
          languages: ["English", "Japanese"],
          experience: "Local guide knowledge",
        }),
      },
    ],
  });

  // ============ Admin events for the dashboard charts ============
  for (let i = 0; i < 30; i++) {
    const day = addDays(new Date(), -i);
    if (i % 2 === 0) {
      await db.userEvent.create({
        data: {
          userId: alice.id,
          eventType: "ai_itinerary_generated",
          metadata: JSON.stringify({ tripId: vietnam.id }),
          createdAt: day,
        },
      });
    }
  }

  // ============ A handful of expenses on Patagonia ============
  const exp1 = await db.expense.create({
    data: {
      tripId: patagonia.id,
      payerId: bob.id,
      description: "Cerro Otto Lodge night 1",
      amount: 90,
      currency: "USD",
      category: "accommodation",
      splitMode: "equal",
    },
  });
  await db.expenseShare.createMany({
    data: [
      { expenseId: exp1.id, userId: bob.id, shareAmount: 30 },
      { expenseId: exp1.id, userId: alice.id, shareAmount: 30 },
      { expenseId: exp1.id, userId: carla.id, shareAmount: 30 },
    ],
  });

  console.log("Seed complete:");
  console.log("  admin@traveloop.dev / Password1   (admin)");
  console.log("  alice@traveloop.dev / Password1   (foodie, Vietnam trip)");
  console.log("  bob@traveloop.dev   / Password1   (adventurer, Patagonia public)");
  console.log("  carla@traveloop.dev / Password1   (culture, Italy public)");
  console.log("  diego@traveloop.dev / Password1   (Patagonia match profile)");
  console.log("  emi@traveloop.dev   / Password1   (Japan match profile)");
  console.log("  farah@traveloop.dev / Password1   (Morocco match profile)");
  console.log("  greta@traveloop.dev / Password1   (Italy match profile)");
  console.log("  hiro@traveloop.dev  / Password1   (Japan match profile)");
}

interface SeedStopInput {
  city: string;
  country: string;
  lat: number;
  lng: number;
  arrival: number;
  departure: number;
  accom?: { name: string; type: string; cost: number };
  transport?: { mode: string; cost: number; hours: number };
  activities: Array<{
    name: string;
    day: number;
    category: string;
    cost: number;
    duration?: number;
  }>;
}

async function seedStops(tripId: string, stops: SeedStopInput[]) {
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const stop = await db.stop.create({
      data: {
        tripId,
        city: s.city,
        country: s.country,
        latitude: s.lat,
        longitude: s.lng,
        arrivalDay: s.arrival,
        departureDay: s.departure,
        orderIndex: i,
        summary: null,
        accomName: s.accom?.name ?? null,
        accomType: s.accom?.type ?? null,
        accomCostPerNight: s.accom?.cost ?? null,
        dailyFoodEstimate: 25,
        transportMode: s.transport?.mode ?? null,
        transportCost: s.transport?.cost ?? null,
        transportHours: s.transport?.hours ?? null,
      },
    });
    if (s.activities.length > 0) {
      await db.activity.createMany({
        data: s.activities.map((a) => ({
          stopId: stop.id,
          name: a.name,
          description: "",
          day: a.day,
          category: a.category,
          estimatedCost: a.cost,
          estimatedDurationHours: a.duration ?? null,
        })),
      });
    }
  }
}

main()
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
