// Eight-question personality quiz. Each option contributes weighted points
// toward one or more personality types; the highest-scoring type wins, with
// "mixed" as a fallback when scores are tied within a small margin.

export type Personality =
  | "foodie"
  | "adventurer"
  | "culture"
  | "chill"
  | "social"
  | "budget"
  | "luxury"
  | "mixed";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: Array<{
    id: string;
    label: string;
    weights: Partial<Record<Personality, number>>;
  }>;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: "saturday",
    prompt: "Your ideal Saturday on a trip looks like…",
    options: [
      {
        id: "trail",
        label: "A long trail and a swim at the end",
        weights: { adventurer: 3, chill: 1 },
      },
      {
        id: "market",
        label: "A food market crawl and a long lunch",
        weights: { foodie: 3, social: 1 },
      },
      {
        id: "museum",
        label: "Two museums and an evening recital",
        weights: { culture: 3 },
      },
      {
        id: "hammock",
        label: "A book, a hammock, a sunset",
        weights: { chill: 3 },
      },
    ],
  },
  {
    id: "pace",
    prompt: "How packed is a good day?",
    options: [
      {
        id: "five",
        label: "Five things, and a late dinner",
        weights: { social: 2, adventurer: 1, foodie: 1 },
      },
      {
        id: "three",
        label: "Three solid things",
        weights: { culture: 2, foodie: 1 },
      },
      {
        id: "two",
        label: "Two unhurried things",
        weights: { chill: 3 },
      },
    ],
  },
  {
    id: "spend",
    prompt: "Where does most of your money go?",
    options: [
      {
        id: "stay",
        label: "A great hotel",
        weights: { luxury: 3 },
      },
      {
        id: "food",
        label: "A great meal",
        weights: { foodie: 3 },
      },
      {
        id: "experience",
        label: "A great experience — guides, tickets, lessons",
        weights: { culture: 2, adventurer: 2 },
      },
      {
        id: "save",
        label: "I&apos;d rather save and stay longer",
        weights: { budget: 3 },
      },
    ],
  },
  {
    id: "stay",
    prompt: "Where do you stay?",
    options: [
      {
        id: "hostel",
        label: "Hostel or guesthouse",
        weights: { social: 2, budget: 2 },
      },
      {
        id: "boutique",
        label: "A small boutique place",
        weights: { culture: 1, foodie: 1, luxury: 1 },
      },
      {
        id: "apartment",
        label: "An apartment with a kitchen",
        weights: { chill: 2, foodie: 1 },
      },
      {
        id: "fivestar",
        label: "Five-star, full service",
        weights: { luxury: 3 },
      },
    ],
  },
  {
    id: "evening",
    prompt: "Best evening on the road?",
    options: [
      {
        id: "bar",
        label: "Bar hop with strangers who became friends",
        weights: { social: 3 },
      },
      {
        id: "concert",
        label: "Live performance, traditional or modern",
        weights: { culture: 3 },
      },
      {
        id: "tasting",
        label: "Tasting menu, slow",
        weights: { foodie: 2, luxury: 1 },
      },
      {
        id: "stars",
        label: "Stars, fire, conversation",
        weights: { chill: 2, adventurer: 1 },
      },
    ],
  },
  {
    id: "transport",
    prompt: "Getting around looks like…",
    options: [
      {
        id: "walk",
        label: "Walking, mostly",
        weights: { chill: 1, culture: 1 },
      },
      {
        id: "transit",
        label: "Public transit",
        weights: { budget: 2, culture: 1 },
      },
      {
        id: "rental",
        label: "A rental car or motorbike",
        weights: { adventurer: 2 },
      },
      {
        id: "private",
        label: "A driver or private transfers",
        weights: { luxury: 3 },
      },
    ],
  },
  {
    id: "trip",
    prompt: "What do you talk about when you get home?",
    options: [
      {
        id: "meal",
        label: "A meal you can&apos;t stop describing",
        weights: { foodie: 3 },
      },
      {
        id: "view",
        label: "A view you earned",
        weights: { adventurer: 3 },
      },
      {
        id: "story",
        label: "Something you didn&apos;t know before",
        weights: { culture: 3 },
      },
      {
        id: "people",
        label: "The people you met",
        weights: { social: 3 },
      },
    ],
  },
  {
    id: "treat",
    prompt: "Pick a treat for yourself.",
    options: [
      {
        id: "spa",
        label: "A spa afternoon",
        weights: { luxury: 2, chill: 1 },
      },
      {
        id: "tour",
        label: "A guided private tour",
        weights: { culture: 2, luxury: 1 },
      },
      {
        id: "feast",
        label: "A multi-course feast",
        weights: { foodie: 3 },
      },
      {
        id: "adventure",
        label: "An off-itinerary adventure",
        weights: { adventurer: 3 },
      },
    ],
  },
];

export function scoreQuiz(
  answers: Record<string, string>,
): { winner: Personality; scores: Record<Personality, number> } {
  const scores: Record<Personality, number> = {
    foodie: 0,
    adventurer: 0,
    culture: 0,
    chill: 0,
    social: 0,
    budget: 0,
    luxury: 0,
    mixed: 0,
  };

  for (const q of QUIZ) {
    const optionId = answers[q.id];
    const option = q.options.find((o) => o.id === optionId);
    if (!option) continue;
    for (const [k, v] of Object.entries(option.weights)) {
      scores[k as Personality] += v ?? 0;
    }
  }

  const sorted = (Object.entries(scores) as Array<[Personality, number]>)
    .filter(([k]) => k !== "mixed")
    .sort((a, b) => b[1] - a[1]);

  const [topName, topScore] = sorted[0];
  const [, secondScore] = sorted[1];

  // If the top two are within one point, call it mixed.
  if (topScore - secondScore <= 1) return { winner: "mixed", scores };
  return { winner: topName, scores };
}
