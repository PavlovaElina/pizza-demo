import { findCity } from "../src/data/locations.ts";
import type { GeocodedAddress } from "../src/types.ts";
type VendorResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: {
        GeoObject?: {
          Point?: { pos?: string };
          metaDataProperty?: {
            GeocoderMetaData?: {
              text?: string;
              precision?: string;
              Address?: {
                country_code?: string;
                Components?: { kind: string; name: string }[];
              };
            };
          };
        };
      }[];
    };
  };
};
export function parseGeocoderResponse(value: unknown): GeocodedAddress {
  const object = (value as VendorResponse)?.response?.GeoObjectCollection
    ?.featureMember?.[0]?.GeoObject;
  const metadata = object?.metaDataProperty?.GeocoderMetaData;
  const numbers = object?.Point?.pos?.split(" ").map(Number);
  const cityName =
    metadata?.Address?.Components?.find((c) => c.kind === "locality")?.name ??
    "";
  if (
    !metadata?.text ||
    !numbers ||
    numbers.length !== 2 ||
    !numbers.every(Number.isFinite) ||
    Math.abs(numbers[0]) > 180 ||
    Math.abs(numbers[1]) > 90
  )
    throw new Error("Адрес не найден. Уточните улицу и дом.");
  return {
    address: metadata.text,
    cityName,
    cityId: ["RU", "RUS"].includes(metadata.Address?.country_code ?? "")
      ? findCity(cityName)?.id
      : undefined,
    coordinates: { lng: numbers[0], lat: numbers[1] },
    precision: metadata.precision ?? "unknown",
  };
}
export async function geocode(
  query: string,
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<GeocodedAddress> {
  const url = new URL("https://geocode-maps.yandex.ru/v1/");
  url.search = new URLSearchParams({
    apikey: key,
    geocode: query,
    format: "json",
    lang: "ru_RU",
    results: "1",
  }).toString();
  let response: Response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new Error(
      "Сервис адресов временно недоступен. Введите адрес вручную.",
    );
  }
  if (!response.ok)
    throw new Error(
      "Сервис адресов временно недоступен. Введите адрес вручную.",
    );
  return parseGeocoderResponse(await response.json());
}
