import { expect, it, vi } from "vitest";
import { distance, readLocation } from "./location";
import { emptyDelivery } from "../types";
import { validateOrderDetails } from "./validation";
it("считает расстояние и не принимает филиал другого города", () => {
  expect(distance({ lat: 55, lng: 37 }, { lat: 55, lng: 37 })).toBe(0);
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({ cityId: "moscow", restaurantId: "spb-center" }),
  });
  expect(readLocation()).toBeNull();
  vi.unstubAllGlobals();
});
it("проверяет город, комментарий и дополнительные поля", () => {
  const location = { cityId: "moscow", restaurantId: "moscow-center" };
  expect(
    validateOrderDetails(emptyDelivery, location, "Москва, Тестовая, 1"),
  ).toBe("");
  expect(
    validateOrderDetails(emptyDelivery, location, "Казань, Тестовая, 1"),
  ).toContain("другом городе");
  expect(
    validateOrderDetails(
      { ...emptyDelivery, comment: "x".repeat(501) },
      location,
      "Тестовая, 1",
    ),
  ).toContain("500");
  expect(validateOrderDetails(emptyDelivery, null, "Тестовая, 1")).toContain(
    "Выберите",
  );
});
