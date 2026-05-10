export interface BuilderActivity {
  id: string;
  name: string;
  description: string;
  day: number;
  category: string;
  estimatedDurationHours: number | null;
  estimatedCost: number;
  bookingUrl: string | null;
}

export interface BuilderStop {
  id: string;
  city: string;
  country: string;
  arrivalDay: number;
  departureDay: number;
  orderIndex: number;
  summary: string | null;
  accomName: string | null;
  accomType: string | null;
  accomCostPerNight: number | null;
  transportMode: string | null;
  transportCost: number | null;
  transportHours: number | null;
  dailyFoodEstimate: number | null;
  activities: BuilderActivity[];
}

export interface BuilderTrip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalBudget: number | null;
  currency: string;
  totalDays: number;
  stops: BuilderStop[];
}
