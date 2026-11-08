import { cities, restaurants } from "../data/locations";
import type { Coordinates, LocationSelection } from "../types";
export function distance(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function readLocation(): LocationSelection | null {
  try {
    const value = JSON.parse(
      localStorage.getItem("pizza-location-v1") ?? "null",
    );
    return value &&
      cities.some((c) => c.id === value.cityId) &&
      restaurants.some(
        (r) => r.id === value.restaurantId && r.cityId === value.cityId,
      )
      ? { cityId: value.cityId, restaurantId: value.restaurantId }
      : null;
  } catch {
    return null;
  }
}
