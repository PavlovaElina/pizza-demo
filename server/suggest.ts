import type { City, AddressSuggestion } from "../src/types.ts";
type SuggestResponse = {
  results?: {
    title?: { text?: string };
    subtitle?: { text?: string };
    address?: {
      formatted_address?: string;
      component?: { kind?: string[]; name?: string }[];
    };
  }[];
};
export function parseSuggestions(
  value: unknown,
  city: City,
): AddressSuggestion[] {
  const results = (value as SuggestResponse)?.results;
  if (!Array.isArray(results)) return [];
  return results
    .flatMap((item) => {
      if (typeof item?.title?.text !== "string") return [];
      const locality = item.address?.component?.find((c) =>
        c.kind?.includes("LOCALITY"),
      )?.name;
      if (
        typeof locality === "string" &&
        !city.aliases.includes(locality.toLowerCase())
      )
        return [];
      const label = item.title.text;
      const description =
        typeof item.subtitle?.text === "string" ? item.subtitle.text : "";
      const address =
        typeof item.address?.formatted_address === "string"
          ? item.address.formatted_address
          : [city.name, label].join(", ");
      return [{ label, description, address }];
    })
    .slice(0, 5);
}
export async function suggestAddresses(
  query: string,
  city: City,
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<AddressSuggestion[]> {
  const url = new URL("https://suggest-maps.yandex.ru/v1/suggest");
  url.search = new URLSearchParams({
    apikey: key,
    text: query,
    lang: "ru",
    results: "5",
    highlight: "0",
    countries: "ru",
    types: "house,street",
    print_address: "1",
    ll: `${city.coordinates.lng},${city.coordinates.lat}`,
    spn: "0.6,0.6",
    strict_bounds: "1",
  }).toString();
  let response: Response;
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new Error("Подсказки недоступны. Продолжите ввод вручную.");
  }
  if (!response.ok)
    throw new Error("Подсказки недоступны. Продолжите ввод вручную.");
  return parseSuggestions(await response.json(), city);
}
