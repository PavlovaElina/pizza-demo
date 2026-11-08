import { expect, it, vi } from "vitest";
import { parseSuggestions, suggestAddresses } from "./suggest";
import { cities } from "../src/data/locations";
it("нормализует подсказки и отбрасывает другой город", () => {
  expect(
    parseSuggestions(
      {
        results: [
          {
            title: { text: "Тверская, 1" },
            subtitle: { text: "Москва" },
            address: {
              formatted_address: "Москва, Тверская, 1",
              component: [{ kind: ["LOCALITY"], name: "Москва" }],
            },
          },
          {
            title: { text: "Баумана, 1" },
            address: { component: [{ kind: ["LOCALITY"], name: "Казань" }] },
          },
          {},
        ],
      },
      cities[0],
    ),
  ).toEqual([
    {
      label: "Тверская, 1",
      description: "Москва",
      address: "Москва, Тверская, 1",
    },
  ]);
  expect(parseSuggestions({}, cities[0])).toEqual([]);
});
it("отказ подсказок позволяет продолжить ввод вручную", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(null, { status: 403 }));
  await expect(
    suggestAddresses("Тверская", cities[0], "private-test-key", fetcher),
  ).rejects.toThrow("Продолжите ввод вручную");
});
