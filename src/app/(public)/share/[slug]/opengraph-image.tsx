import { ImageResponse } from "next/og";

import { db } from "@/lib/db";
import { tripDayCount } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const trip = await db.trip.findUnique({
    where: { shareSlug: slug },
    select: {
      isPublic: true,
      name: true,
      startDate: true,
      endDate: true,
      personality: true,
      stops: { select: { city: true }, orderBy: { orderIndex: "asc" } },
    },
  });

  if (!trip || !trip.isPublic) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0c0a09",
            color: "#f5f5f4",
            fontSize: 64,
          }}
        >
          Traveloop
        </div>
      ),
      { ...size },
    );
  }

  const days = tripDayCount(trip.startDate, trip.endDate);
  const personalityLabel = trip.personality
    ? `${trip.personality[0].toUpperCase()}${trip.personality.slice(1)}`
    : "Mixed";
  const route = trip.stops
    .slice(0, 5)
    .map((s) => s.city)
    .join("  →  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0c0a09",
          color: "#fafaf9",
          padding: 80,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#7dd3c0",
            }}
          />
          <div style={{ fontSize: 24, opacity: 0.85, letterSpacing: 2 }}>
            TRAVELOOP
          </div>
        </div>

        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 22,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: 4,
              marginBottom: 18,
            }}
          >
            {personalityLabel} · {days} {days === 1 ? "day" : "days"} ·{" "}
            {trip.stops.length} {trip.stops.length === 1 ? "stop" : "stops"}
          </div>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              fontWeight: 500,
              letterSpacing: -2,
              maxWidth: 1040,
            }}
          >
            {trip.name}
          </div>
          {route ? (
            <div
              style={{
                marginTop: 38,
                fontSize: 28,
                color: "#a8a29e",
              }}
            >
              {route}
              {trip.stops.length > 5 ? "  …" : ""}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#a8a29e",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span>A public itinerary</span>
          <span>Plan, share, copy</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
