import { Linking } from 'react-native';

/** Opens Google Maps with turn-by-turn directions to the destination (uses current location when available). */
export async function openGoogleMapsDirections(latitude: number, longitude: number): Promise<void> {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  await Linking.openURL(url);
}

/** Opens Google Maps search when coordinates are unknown (legacy points). */
export async function openGoogleMapsSearch(query: string): Promise<void> {
  const q = query.trim();
  if (!q) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  await Linking.openURL(url);
}

export function hasMapCoords(
  lat: number | null | undefined,
  lng: number | null | undefined
): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}
