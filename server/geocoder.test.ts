import { expect, it, vi } from "vitest";
import { geocode, parseGeocoderResponse } from "./geocoder";
const response = (city = "Москва", pos = "37.61 55.75") => ({
  response: {
    GeoObjectCollection: {
      featureMember: [
        {
          GeoObject: {
            Point: { pos },
            metaDataProperty: {
              GeocoderMetaData: {
                text: `${city}, Тестовая улица, 1`,
                precision: "exact",
                Address: {
                  country_code: "RUS",
                  Components: [{ kind: "locality", name: city }],
                },
              },
            },
          },
        },
      ],
    },
  },
});
it("нормализует ответ и сохраняет порядок долгота/широта", () => {
  const result = parseGeocoderResponse(response());
  expect(result.cityId).toBe("moscow");
  expect(result.coordinates).toEqual({ lat: 55.75, lng: 37.61 });
});
it("отличает неподдерживаемый город и повреждённый ответ", () => {
  expect(parseGeocoderResponse(response("Тверь")).cityId).toBeUndefined();
  expect(() => parseGeocoderResponse({})).toThrow();
  expect(() => parseGeocoderResponse(response("Москва", "999 999"))).toThrow();
});
it("обрабатывает отказ сервиса без раскрытия ключа", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(null, { status: 403 }));
  await expect(
    geocode("Москва, тест", "server-only-key", fetcher),
  ).rejects.toThrow("Сервис адресов временно недоступен");
  expect(fetcher.mock.calls[0][0].toString()).toContain(
    "apikey=server-only-key",
  );
});
