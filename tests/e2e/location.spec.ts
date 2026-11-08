import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  addressResult,
  installMap,
  openCheckout,
  seedMoscow,
} from "./mapFixture";

test("город выбирается вручную, меняется и сохраняется без запроса геолокации", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: () => {
          throw new Error("Не запрашивать при открытии");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Выбрать город и пиццерию/ }).click();
  const dialog = page.getByRole("dialog", { name: "Город и пиццерия" });
  await dialog.getByRole("radio", { name: "Казань", exact: true }).check();
  await dialog.getByRole("radio", { name: /У сада/ }).check();
  await dialog
    .getByRole("button", { name: "Подтвердить город и пиццерию" })
    .click();
  await expect(page.locator(".location-trigger")).toContainText("Казань");
  await page.reload();
  await expect(page.locator(".location-trigger")).toContainText(
    "Пряная улица, 4",
  );
  await page.getByRole("button", { name: /Выбрать город и пиццерию/ }).click();
  await page.getByLabel("Найти город").fill("Санкт");
  await expect(
    page.getByRole("radio", { name: "Москва", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("radio", { name: "Санкт-Петербург", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Подтвердить город и пиццерию" })
    .click();
  await expect(page.locator(".location-trigger")).toContainText(
    "Санкт-Петербург",
  );
});

test("геолокация предлагает город, но применяет только после подтверждения", async ({
  page,
  context,
}) => {
  await seedMoscow(page);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 55.8, longitude: 49.1 });
  await page
    .context()
    .route("**/api/location/reverse", (route) =>
      route.fulfill({ json: addressResult("Казань", 55.8, 49.1, "kazan") }),
    );
  await page.goto("/");
  await page.getByRole("button", { name: /Выбрать город и пиццерию/ }).click();
  await page
    .getByRole("button", { name: "Определить моё местоположение", exact: true })
    .click();
  await expect(
    page.locator(".location-dialog").getByRole("status"),
  ).toContainText("Ваш город — Казань?");
  await expect(page.locator(".location-trigger")).toContainText("Москва");
  await page
    .getByRole("button", { name: "Подтвердить город и пиццерию" })
    .click();
  await expect(page.locator(".location-trigger")).toContainText("Казань");
  const stored = await page.evaluate(() =>
    localStorage.getItem("pizza-location-v1"),
  );
  expect(stored).not.toContain("latitude");
  expect(stored).not.toContain("49.1");
});

for (const code of [1, 3])
  test(`отказ или таймаут геолокации (${code}) оставляет ручной выбор`, async ({
    page,
  }) => {
    await page.addInitScript(
      (code) =>
        Object.defineProperty(navigator, "geolocation", {
          value: {
            getCurrentPosition: (
              _success: unknown,
              error: (value: { code: number }) => void,
            ) => error({ code }),
          },
        }),
      code,
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: /Выбрать город и пиццерию/ })
      .click();
    await page
      .getByRole("button", {
        name: "Определить моё местоположение",
        exact: true,
      })
      .click();
    await expect(
      page.locator(".location-dialog").getByRole("status"),
    ).toContainText("Выберите город вручную");
    await page.getByRole("radio", { name: "Москва", exact: true }).check();
    await expect(
      page.getByRole("button", { name: "Подтвердить город и пиццерию" }),
    ).toBeEnabled();
  });

test("неподдерживаемый город не подменяется ближайшим", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 56.86, longitude: 35.9 });
  await page.context().route("**/api/location/reverse", (route) =>
    route.fulfill({
      json: { ...addressResult(), cityName: "Тверь", cityId: undefined },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Выбрать город и пиццерию/ }).click();
  await page
    .getByRole("button", { name: "Определить моё местоположение", exact: true })
    .click();
  await expect(
    page.locator(".location-dialog").getByRole("status"),
  ).toContainText("Пока работаем");
  await expect(
    page.getByRole("button", { name: "Подтвердить город и пиццерию" }),
  ).toBeDisabled();
});

test("без ключей работает ручной адрес, комментарий и смена города", async ({
  page,
}) => {
  await seedMoscow(page);
  await page
    .context()
    .route("**/api/location/config", (route) =>
      route.fulfill({ json: { mapKey: "", geocoding: false } }),
    );
  await openCheckout(page);
  await expect(
    page.getByText("Карта сейчас недоступна.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Ваше имя", { exact: true }).fill("Анна");
  await page.getByLabel("Телефон", { exact: true }).fill("9991234567");
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Тестовая улица, 1");
  await page
    .getByLabel("Комментарий к заказу", { exact: false })
    .fill("Не звонить в дверь");
  await page.getByLabel("Квартира", { exact: true }).fill("8");
  await page
    .getByRole("button", { name: "Изменить город", exact: true })
    .click();
  await page.getByRole("radio", { name: "Казань", exact: true }).check();
  await page
    .getByRole("button", { name: "Подтвердить город и пиццерию" })
    .click();
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Ваше имя", { exact: true })).toHaveValue(
    "Анна",
  );
  await expect(
    page.getByLabel("Комментарий к заказу", { exact: false }),
  ).toHaveValue("Не звонить в дверь");
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Казань, Тестовая улица, 2");
  await page.getByLabel("Квартира", { exact: true }).fill("4");
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/orders") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  const payload = (await request).postDataJSON();
  expect(payload.location.cityId).toBe("kazan");
  expect(payload.details.comment).toBe("Не звонить в дверь");
  expect(payload.details.apartment).toBe("4");
  await expect(
    page.getByRole("heading", { name: "Оплата заказа" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("Не звонить в дверь");
});

test("клик и перенос метки подставляют адрес, ручная правка снимает точку", async ({
  page,
}) => {
  await seedMoscow(page);
  await installMap(page);
  await page.context().route("**/api/location/reverse", async (route) => {
    const point = route.request().postDataJSON();
    await route.fulfill({
      json: addressResult(`Москва, Дом ${point.lat}`, point.lat, point.lng),
    });
  });
  await openCheckout(page);
  await expect(page.locator("[data-sdk=test]")).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test-map-click", { detail: [37.61, 55.75] }),
    ),
  );
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Москва, Дом 55.75",
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test-map-drag", { detail: [37.62, 55.76] }),
    ),
  );
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Москва, Дом 55.76",
  );
  await page.getByLabel("Улица и дом", { exact: true }).fill("Ручная улица, 5");
  await expect(page.locator(".delivery-marker")).toHaveCount(0);
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("адрес находит точку, несовпадение города и ошибка не стирают ввод", async ({
  page,
}) => {
  await seedMoscow(page);
  await installMap(page);
  let mode = "ok";
  await page.context().route("**/api/location/geocode", (route) =>
    mode === "error"
      ? route.fulfill({
          status: 502,
          json: { message: "Не удалось определить адрес" },
        })
      : route.fulfill({
          json:
            mode === "other"
              ? addressResult("Казань, Тестовая, 2", 55.8, 49.1, "kazan")
              : addressResult(),
        }),
  );
  await openCheckout(page);
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Тестовая улица, 1");
  await page.getByRole("button", { name: "Показать на карте" }).click();
  await expect(page.locator(".delivery-marker")).toHaveCount(1);
  mode = "other";
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Казань, Тестовая, 2");
  await page.getByRole("button", { name: "Показать на карте" }).click();
  await expect(
    page.getByText("Этот адрес находится в другом городе.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Казань, Тестовая, 2",
  );
  mode = "error";
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Москва, Ручная, 5");
  await page.getByRole("button", { name: "Показать на карте" }).click();
  await expect(
    page.getByText("Не удалось определить адрес", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Москва, Ручная, 5",
  );
});

test("поздний геокодер не перезаписывает новую точку и ручной адрес", async ({
  page,
}) => {
  await seedMoscow(page);
  await installMap(page);
  await page.context().route("**/api/location/reverse", async (route) => {
    const point = route.request().postDataJSON();
    await new Promise((resolve) =>
      setTimeout(resolve, point.lat === 55.7 ? 250 : 10),
    );
    await route
      .fulfill({
        json: addressResult(`Москва, Дом ${point.lat}`, point.lat, point.lng),
      })
      .catch(() => {});
  });
  await openCheckout(page);
  await expect(page.locator("[data-sdk=test]")).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test-map-click", { detail: [37.6, 55.7] }),
    ),
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test-map-click", { detail: [37.62, 55.8] }),
    ),
  );
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Москва, Дом 55.8",
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test-map-click", { detail: [37.6, 55.7] }),
    ),
  );
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Мой ручной адрес, 3");
  await page.waitForTimeout(300);
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Мой ручной адрес, 3",
  );
});

test("ошибка загрузки SDK не блокирует ручной ввод", async ({ page }) => {
  await seedMoscow(page);
  await page
    .context()
    .route("**/api/location/config", (route) =>
      route.fulfill({ json: { mapKey: "test-public-key", geocoding: true } }),
    );
  await page
    .context()
    .route("https://api-maps.yandex.ru/**", (route) => route.abort());
  await openCheckout(page);
  await expect(
    page.getByText("Карта не загрузилась. Вы можете указать адрес вручную.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Улица и дом", { exact: true }).fill("Ручная улица, 7");
  await expect(page.getByLabel("Улица и дом", { exact: true })).toHaveValue(
    "Ручная улица, 7",
  );
});
