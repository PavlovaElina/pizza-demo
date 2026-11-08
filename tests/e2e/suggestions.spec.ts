import { expect, test } from "@playwright/test";
import {
  addressResult,
  installMap,
  openCheckout,
  seedMoscow,
} from "./mapFixture";
import AxeBuilder from "@axe-core/playwright";
async function setup(page: import("@playwright/test").Page) {
  await seedMoscow(page);
  await installMap(page);
  await page.context().route("**/api/location/config", (route) =>
    route.fulfill({
      json: { mapKey: "test-key", geocoding: true, suggestions: true },
    }),
  );
  await page
    .context()
    .route("**/api/location/geocode", (route) =>
      route.fulfill({ json: addressResult() }),
    );
}

test("подсказка выбирается клавиатурой и определяет адрес", async ({
  page,
}) => {
  await setup(page);
  await page.context().route("**/api/location/suggest", (route) =>
    route.fulfill({
      json: [
        {
          label: "Тверская улица, 1",
          description: "Москва",
          address: "Москва, Тверская улица, 1",
        },
      ],
    }),
  );
  await openCheckout(page);
  const input = page.getByRole("combobox", { name: "Улица и дом" });
  await input.fill("Тверская");
  await expect(
    page.getByRole("listbox", { name: "Подсказки адреса" }),
  ).toBeVisible();
  await input.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Оформление заказа" }),
  ).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await input.blur();
  await input.focus();
  await expect(page.getByRole("listbox")).toBeVisible();
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /.+/);
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await input.press("Enter");
  await expect(input).toHaveValue("Москва, Тестовая улица, 1");
  await expect(page.locator(".delivery-marker")).toHaveCount(1);
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("подсказки ограничены задержкой, старый ответ не заменяет новый", async ({
  page,
}) => {
  await setup(page);
  let count = 0;
  await page.context().route("**/api/location/suggest", async (route) => {
    count++;
    const query = route.request().postDataJSON().query;
    await new Promise((resolve) =>
      setTimeout(resolve, query === "старый" ? 500 : 10),
    );
    await route
      .fulfill({
        json: [
          {
            label: query,
            description: "Москва",
            address: `Москва, ${query}, 1`,
          },
        ],
      })
      .catch(() => {});
  });
  await openCheckout(page);
  const input = page.getByRole("combobox", { name: "Улица и дом" });
  await input.fill("Т");
  await input.fill("Тв");
  await page.waitForTimeout(450);
  expect(count).toBe(0);
  const first = page.waitForRequest((r) => r.url().endsWith("/suggest"));
  await input.fill("старый");
  await first;
  await input.fill("новый");
  await expect(page.getByRole("option")).toHaveText("новыйМосква");
  await page.waitForTimeout(200);
  await expect(page.getByRole("option")).toHaveText("новыйМосква");
  expect(count).toBe(2);
});

test("ошибка Геосаджеста не блокирует ручной адрес", async ({ page }) => {
  await setup(page);
  await page
    .context()
    .route("**/api/location/suggest", (route) =>
      route.fulfill({ status: 502, json: { message: "Подсказки недоступны" } }),
    );
  await openCheckout(page);
  const input = page.getByRole("combobox", { name: "Улица и дом" });
  await input.fill("Мой адрес, 7");
  await expect(
    page.getByText("Подсказки недоступны. Продолжите ввод вручную.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(input).toHaveValue("Мой адрес, 7");
});
