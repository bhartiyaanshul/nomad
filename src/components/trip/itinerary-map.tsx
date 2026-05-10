"use client";

import { useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MapStopShape {
  id: string;
  city: string;
  country: string;
  arrivalDay: number;
  departureDay: number;
  orderIndex: number;
  latitude: number | null;
  longitude: number | null;
  activitiesCount: number;
}

interface ItineraryMapProps {
  stops: MapStopShape[];
}

export function ItineraryMap({ stops }: ItineraryMapProps) {
  const placed = useMemo(
    () =>
      stops
        .filter(
          (s): s is MapStopShape & { latitude: number; longitude: number } =>
            typeof s.latitude === "number" && typeof s.longitude === "number",
        )
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [stops],
  );

  if (placed.length === 0) {
    return (
      <div className="border-border/60 rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm">
          No stops have coordinates yet. Re-generate with AI or edit a stop to
          add the city — Nominatim will geocode it.
        </p>
      </div>
    );
  }

  const center: [number, number] = [
    placed.reduce((sum, s) => sum + s.latitude, 0) / placed.length,
    placed.reduce((sum, s) => sum + s.longitude, 0) / placed.length,
  ];

  // Auto-fit bounds via center + simple zoom heuristic.
  const lats = placed.map((s) => s.latitude);
  const lons = placed.map((s) => s.longitude);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lons) - Math.min(...lons),
  );
  const zoom =
    span > 30 ? 3 : span > 15 ? 4 : span > 7 ? 5 : span > 3 ? 6 : span > 1 ? 8 : 10;

  const polyline: [number, number][] = placed.map((s) => [
    s.latitude,
    s.longitude,
  ]);

  return (
    <div className="border-border/70 overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "60vh", minHeight: 480, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "var(--color-primary)",
            weight: 2,
            opacity: 0.7,
            dashArray: "6 6",
          }}
        />
        {placed.map((stop, idx) => (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={14}
            pathOptions={{
              color: "var(--color-primary)",
              fillColor: "var(--color-primary)",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium tracking-wide uppercase">
                  Stop {idx + 1}
                </p>
                <p className="font-display text-base">
                  {stop.city}
                  <span className="text-muted-foreground">
                    , {stop.country}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Day {stop.arrivalDay}
                  {stop.departureDay > stop.arrivalDay
                    ? `–${stop.departureDay}`
                    : ""}{" "}
                  · {stop.activitiesCount}{" "}
                  {stop.activitiesCount === 1 ? "activity" : "activities"}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
