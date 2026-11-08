import { expect, it } from "vitest";
import { createRateLimit } from "./rateLimit";

it("allows the budget and rejects subsequent requests with retry seconds", () => {
  const check = createRateLimit(2, 60_000);
  expect(check(1000)).toBe(0);
  expect(check(1001)).toBe(0);
  expect(check(1501)).toBe(60);
  expect(check(60_500)).toBe(1);
});

it("restores the budget at the window boundary, including after a long idle", () => {
  const check = createRateLimit(1, 60_000);
  expect(check(0)).toBe(0);
  expect(check(59_999)).toBe(1);
  expect(check(60_000)).toBe(0);
  expect(check(60_001)).toBe(60);
  expect(check(1_000_000)).toBe(0);
});
