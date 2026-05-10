"use client";

import { useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
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

/**
 * Build a Leaflet DivIcon for a numbered teardrop pin. The pin uses the
 * theme's primary colour and renders the index inside; the inner span
 * counter-rotates so the number stays upright while the outer wrapper has
 * the classic 45° tilt.
 */
function buildPinIcon(index: number): L.DivIcon {
  const html = `
    <div class="traveloop-pin">
      <span class="traveloop-pin-number">${index}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 36],
    popupAnchor: [0, -32],
  });
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

  // Compute bounds for fitBounds (better than a heuristic zoom).
  const lats = placed.map((s) => s.latitude);
  const lons = placed.map((s) => s.longitude);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];

  const polyline: [number, number][] = placed.map((s) => [
    s.latitude,
    s.longitude,
  ]);

  return (
    <div className="border-border/70 relative overflow-hidden rounded-md border">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [40, 40] }}
        scrollWheelZoom={false}
        style={{ height: "60vh", minHeight: 480, width: "100%" }}
      >
        <FitBounds bounds={bounds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Soft cased polyline: a thicker translucent line under a thinner solid one. */}
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "var(--color-primary)",
            weight: 7,
            opacity: 0.18,
          }}
        />
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "var(--color-primary)",
            weight: 2.5,
            opacity: 0.95,
            dashArray: "8 6",
          }}
        />
        {placed.map((stop, idx) => (
          <Marker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            icon={buildPinIcon(idx + 1)}
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
          </Marker>
        ))}
      </MapContainer>

    </div>
  );
}

/**
 * Fits the map view to the trip's bounding box on mount and whenever the
 * stop set changes (e.g., after a swap). Keeps the heuristic-zoom problem
 * from before — single-stop trips zoom in tight; sprawling regions stay
 * comfortably framed.
 */
function FitBounds({
  bounds,
}: {
  bounds: [[number, number], [number, number]];
}) {
  const map = useMap();
  useMemo(() => {
    map.fitBounds(bounds, { padding: [40, 40], animate: false });
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]]);
  return null;
}
