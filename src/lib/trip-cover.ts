// Deterministic cover-image URL for a trip. Honours an explicit cover URL
// when set, otherwise returns a stable picsum.photos URL seeded by the
// trip id so the same trip always gets the same image.

export function tripCoverUrl(trip: {
  id: string;
  coverImageUrl: string | null;
}): string {
  if (trip.coverImageUrl && trip.coverImageUrl.trim() !== "") {
    return trip.coverImageUrl;
  }
  // 800×450 → 16:9 to match the TripCard aspect ratio.
  return `https://picsum.photos/seed/${encodeURIComponent(trip.id)}/800/450`;
}
