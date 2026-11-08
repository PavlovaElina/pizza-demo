import type { Coordinates, GeocodedAddress, LocationConfig } from "../types";
const unavailable = "Сервис адресов недоступен. Введите адрес вручную.";
async function request(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.BASE_URL}api/location/${path}`, {
      ...(body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(unavailable, { cause: error });
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(unavailable);
  }
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : unavailable;
    throw new Error(message);
  }
  return result;
}
export async function getLocationConfig(): Promise<LocationConfig> {
  const result = (await request("config")) as LocationConfig;
  if (
    !result ||
    typeof result.mapKey !== "string" ||
    typeof result.geocoding !== "boolean"
  )
    throw new Error(unavailable);
  return result;
}
function parseAddress(value: unknown): GeocodedAddress {
  const result = value as GeocodedAddress;
  if (
    !result ||
    typeof result.address !== "string" ||
    typeof result.cityName !== "string" ||
    typeof result.precision !== "string" ||
    (result.cityId !== undefined && typeof result.cityId !== "string") ||
    !result.coordinates ||
    !Number.isFinite(result.coordinates.lat) ||
    !Number.isFinite(result.coordinates.lng) ||
    Math.abs(result.coordinates.lat) > 90 ||
    Math.abs(result.coordinates.lng) > 180
  )
    throw new Error("Не удалось распознать адрес. Укажите его вручную.");
  return result;
}
export const reverseGeocode = async (
  coordinates: Coordinates,
  signal?: AbortSignal,
) => parseAddress(await request("reverse", coordinates, signal));
export const forwardGeocode = async (
  query: string,
  cityId: string,
  signal?: AbortSignal,
) => parseAddress(await request("geocode", { query, cityId }, signal));

export async function getAddressSuggestions(
  query: string,
  cityId: string,
  signal?: AbortSignal,
): Promise<import("../types").AddressSuggestion[]> {
  const value = await request("suggest", { query, cityId }, signal);
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) =>
        item &&
        typeof item.label === "string" &&
        typeof item.description === "string" &&
        typeof item.address === "string",
    )
  )
    throw new Error("Подсказки недоступны. Продолжите ввод вручную.");
  return value;
}
