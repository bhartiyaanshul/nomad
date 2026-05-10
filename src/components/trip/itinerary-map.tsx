"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  transportMode?: string | null;
  activitiesCount: number;
}

interface ItineraryMapProps {
  stops: MapStopShape[];
}

type TransportMode = "flight" | "train" | "bus" | "car" | "ferry";

function buildPinIcon(index: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="traveloop-pin"><span class="traveloop-pin-number">${index}</span></div>`,
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 36],
    popupAnchor: [0, -32],
  });
}

// Per-mode SVG markup. Sized 18×18 to read clearly at zoom levels 4–10.
const TRANSPORT_SVG: Record<TransportMode, string> = {
  flight:
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5l8 2.5z"/></svg>',
  train:
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
  bus:
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4S4 2.5 4 6v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>',
  car:
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
  ferry:
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20 21c-1.39 0-2.78-.47-4-1.32a7.027 7.027 0 0 1-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/></svg>',
};

function inferTransportMode(
  mode: string | null | undefined,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): TransportMode {
  const valid = ["flight", "train", "bus", "car", "ferry"] as const;
  if (mode && (valid as readonly string[]).includes(mode)) {
    return mode as TransportMode;
  }
  // Heuristic for stops that don't have a mode set: long hops fly,
  // medium-distance hops take a train, short hops drive.
  const dist = Math.hypot(toLat - fromLat, toLng - fromLng);
  if (dist > 8) return "flight";
  if (dist > 2.5) return "train";
  return "car";
}

function buildTransportIcon(
  mode: TransportMode,
  bearingDeg: number,
): L.DivIcon {
  // Aircraft pictograms point up (north) at 0°; the SVG icon already faces
  // up, so we rotate by `bearing` so it points along the segment.
  // For ground/water modes, keep them upright (no rotation) since the icons
  // are drawn front-on.
  const rotate = mode === "flight" ? bearingDeg : 0;
  return L.divIcon({
    html: `<div class="traveloop-vehicle" style="transform: rotate(${rotate}deg)">${TRANSPORT_SVG[mode]}</div>`,
    className: "traveloop-vehicle-wrap",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function bearing(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  // Simple compass bearing (degrees clockwise from north).
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLng - fromLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

interface PlacedStop {
  id: string;
  city: string;
  country: string;
  arrivalDay: number;
  departureDay: number;
  orderIndex: number;
  latitude: number;
  longitude: number;
  transportMode: TransportMode | null;
  activitiesCount: number;
}

export function ItineraryMap({ stops }: ItineraryMapProps) {
  const placed: PlacedStop[] = useMemo(
    () =>
      stops
        .filter(
          (s): s is MapStopShape & { latitude: number; longitude: number } =>
            typeof s.latitude === "number" && typeof s.longitude === "number",
        )
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => ({
          id: s.id,
          city: s.city,
          country: s.country,
          arrivalDay: s.arrivalDay,
          departureDay: s.departureDay,
          orderIndex: s.orderIndex,
          latitude: s.latitude,
          longitude: s.longitude,
          transportMode: (s.transportMode ?? null) as TransportMode | null,
          activitiesCount: s.activitiesCount,
        })),
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
        {/* Cased dashed line: thick translucent base + thin animated dashed top. */}
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "var(--color-primary)",
            weight: 7,
            opacity: 0.16,
          }}
        />
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "var(--color-primary)",
            weight: 2.5,
            opacity: 0.95,
            dashArray: "8 6",
            // Custom class so globals.css can animate stroke-dashoffset.
            className: "traveloop-route",
          }}
        />

        {placed.length > 1 ? <RouteTraveller stops={placed} /> : null}

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
 * One traveller that walks the entire route, segment by segment. Swaps
 * the mode pictogram (and the rotation, for flights) when crossing into
 * a new leg. Updates the marker's position imperatively via Leaflet's
 * setLatLng on requestAnimationFrame so React doesn't reconcile each
 * frame.
 *
 * Pacing: 5s per leg + 600ms hover at each stop. Total cycle scales
 * naturally with the trip length — short trips loop quickly, long trips
 * read like a slow journey.
 */
function RouteTraveller({ stops }: { stops: PlacedStop[] }) {
  const markerRef = useRef<L.Marker | null>(null);
  const segments = useMemo(() => {
    const out: Array<{
      from: [number, number];
      to: [number, number];
      mode: TransportMode;
      bearingDeg: number;
    }> = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      const mode = inferTransportMode(
        a.transportMode,
        a.latitude,
        a.longitude,
        b.latitude,
        b.longitude,
      );
      out.push({
        from: [a.latitude, a.longitude],
        to: [b.latitude, b.longitude],
        mode,
        bearingDeg: bearing(a.latitude, a.longitude, b.latitude, b.longitude),
      });
    }
    return out;
  }, [stops]);

  // Track which segment is "active" so the icon (mode + rotation) can
  // re-render only when crossing a boundary, not every frame.
  const [activeSegment, setActiveSegment] = useState(0);

  // requestAnimationFrame loop — drives both the marker position and the
  // active-segment state. Position updates bypass React via setLatLng.
  useEffect(() => {
    if (segments.length === 0) return;
    const PER_SEGMENT = 5_000; // ms travelling
    const PAUSE = 600; // ms paused at each arrival
    const PER_CYCLE = PER_SEGMENT + PAUSE;
    const TOTAL = PER_CYCLE * segments.length;

    let raf = 0;
    const start = performance.now();
    let lastSeg = -1;

    function tick(now: number) {
      const elapsed = (now - start) % TOTAL;
      const segIdx = Math.floor(elapsed / PER_CYCLE);
      const within = elapsed - segIdx * PER_CYCLE;
      const seg = segments[segIdx];
      // Travel from 0→1 over PER_SEGMENT then hold at 1 for PAUSE.
      const t = within < PER_SEGMENT ? within / PER_SEGMENT : 1;
      const lat = seg.from[0] + (seg.to[0] - seg.from[0]) * t;
      const lng = seg.from[1] + (seg.to[1] - seg.from[1]) * t;
      markerRef.current?.setLatLng([lat, lng]);

      if (segIdx !== lastSeg) {
        lastSeg = segIdx;
        setActiveSegment(segIdx);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length, ...segments.map((s) => s.from.join(",") + s.to.join(","))]);

  const seg = segments[activeSegment] ?? segments[0];
  const icon = useMemo(
    () => buildTransportIcon(seg.mode, seg.bearingDeg),
    [seg.mode, seg.bearingDeg],
  );

  return (
    <Marker
      ref={(m) => {
        markerRef.current = m;
      }}
      position={seg.from}
      icon={icon}
      interactive={false}
      keyboard={false}
    />
  );
}

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
