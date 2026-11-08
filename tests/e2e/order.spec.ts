import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.context().route("**/api/location/config", (route) =>
    route.fulfill({
      json: { mapKey: "", geocoding: false, suggestions: false },
    }),
  );
  await page.addInitScript(() => {
    if (!localStorage.getItem("pizza-location-v1"))
      localStorage.setItem(
        "pizza-location-v1",
        JSON.stringify({ cityId: "moscow", restaurantId: "moscow-center" }),
      );
  });
});
async function expectAccessible(page: Page) {
  // Audit the settled screen, after the dialog's entrance animation.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}
const addPizza = (page: Page, name = "Мясная Делюкс") =>
  page.getByRole("button", { name: `В корзину: ${name}`, exact: true }).click();
const openCart = (page: Page) =>
  page.getByRole("button", { name: /Открыть корзину/ }).click();
async function fillCustomer(page: Page) {
  await page.getByLabel("Ваше имя", { exact: true }).fill("Тест");
  await page
    .getByLabel("Улица и дом", { exact: true })
    .fill("Тестовая улица, дом 1");
  await page.getByLabel("Телефон", { exact: true }).fill("+7 999 123-45-67");
}
async function fillCard(page: Page) {
  await page
    .getByLabel("Номер карты", { exact: true })
    .fill("4242424242424242");
  await page.getByLabel("Срок действия", { exact: true }).fill("12/35");
  await page.getByLabel("CVC", { exact: true }).fill("123");
  await page.getByLabel("Имя владельца", { exact: true }).fill("TEST USER");
}
async function reachPayment(page: Page) {
  await addPizza(page);
  await openCart(page);
  await page
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
  await fillCustomer(page);
  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  await expect(
    page.getByRole("heading", { name: "Оплата заказа" }),
  ).toBeVisible();
}

test("выбор, сохранение, возврат в каталог, оформление и оплата", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#cart")).toHaveCount(0);
  await expect(page.getByRole("form")).toHaveCount(0);
  await addPizza(page);
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Мясная Делюкс", exact: true }),
  });
  await expect(card.getByText("В корзине · 1 шт.")).toBeVisible();
  await card.getByRole("button", { name: "Увеличить: Мясная Делюкс" }).click();
  await page.reload();
  await expect(
    card.getByLabel("Количество пицц: Мясная Делюкс", { exact: true }),
  ).toHaveText("2");
  await openCart(page);
  let dialog = page.getByRole("dialog");
  await expect(dialog.locator(".order-summary__total")).toContainText("1 380");
  await dialog.getByRole("button", { name: "Добавить ещё пиццу" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card.getByText("В корзине · 2 шт.")).toBeVisible();
  await addPizza(page, "Сырная");
  await openCart(page);
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  await expect(
    page.getByText("Укажите имя — минимум 2 символа."),
  ).toBeVisible();
  await expect(page.getByLabel("Ваше имя", { exact: true })).toBeFocused();
  await fillCustomer(page);
  await page.getByRole("button", { name: "Вернуться в корзину" }).click();
  await dialog
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
  await expect(page.getByLabel("Ваше имя", { exact: true })).toHaveValue(
    "Тест",
  );
  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  await expect(
    page.getByRole("heading", { name: "Оплата заказа" }),
  ).toBeVisible();
  await expect(page.locator(".order-summary__total")).toContainText("1 970");
  await fillCard(page);
  await page.getByRole("button", { name: /^Оплатить/ }).click();
  await expect(
    page.getByRole("heading", { name: "Заказ оплачен" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Вернуться в меню" }).click();
  await openCart(page);
  await expect(
    page.getByRole("heading", { name: "Здесь будет ваша пицца" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pizza-cart-v3")!),
    ),
  ).toEqual([]);
});

test("карта проверяется локально, реквизиты не отправляются, повтор идемпотентен", async ({
  page,
}) => {
  await page.goto("/");
  await reachPayment(page);
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/payment")) requests++;
  });
  await page.getByRole("button", { name: /^Оплатить/ }).click();
  await expect(page.getByText("Введите 16 цифр номера карты.")).toBeVisible();
  expect(requests).toBe(0);
  await expect(
    page.getByRole("heading", { name: "Оплата заказа" }),
  ).toBeVisible();
  await fillCard(page);
  const request = page.waitForRequest((r) => r.url().endsWith("/payment"));
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/payment") && r.status() === 200,
  );
  await page.getByRole("button", { name: /^Оплатить/ }).click();
  expect((await request).postDataJSON()).toEqual({ method: "card" });
  const payment = await (await response).json();
  await expect(
    page.getByRole("heading", { name: "Заказ оплачен" }),
  ).toBeVisible();
  const repeated = await page.evaluate(
    async (id: string) =>
      (
        await fetch("/api/orders/" + id + "/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "card" }),
        })
      ).json(),
    payment.orderId,
  );
  expect(repeated).toEqual(payment);
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage }),
  );
  expect(storage).not.toContain("4242");
  expect(storage).not.toContain("TEST USER");
});
test("оплата при получении оформляет заказ без статуса оплачено", async ({
  page,
}) => {
  await page.goto("/");
  await reachPayment(page);
  await page.getByRole("radio", { name: /При получении/ }).check();
  await expect(page.getByLabel("Номер карты", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Подтвердить заказ", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Заказ оформлен", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("К оплате при получении:", { exact: false }),
  ).toBeVisible();
});
test("ошибка создания заказа сохраняет корзину и поля", async ({ page }) => {
  await page.goto("/");
  await addPizza(page);
  await openCart(page);
  await page
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
  await fillCustomer(page);
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = (...args) =>
      String(args[0]).endsWith("/api/orders")
        ? Promise.resolve(new Response(null, { status: 503 }))
        : original(...args);
  });
  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось оформить заказ.",
  );
  await expect(page.getByLabel("Ваше имя", { exact: true })).toHaveValue(
    "Тест",
  );
  await page.getByRole("button", { name: "Вернуться в корзину" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("Количество пицц: Мясная Делюкс", { exact: true }),
  ).toHaveText("1");
});

test("доступность страницы, корзины, формы, оплаты и мобильного меню", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.locator(".product")).toHaveCount(8);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: isMobile ? 375 : 1440, height: 900 });
  await expectAccessible(page);
  if (isMobile) {
    await page.getByRole("button", { name: "Меню ☰" }).click();
    await expectAccessible(page);
    await page.keyboard.press("Escape");
  }
  await addPizza(page);
  await openCart(page);
  await expectAccessible(page);
  await page
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
  await expectAccessible(page);
  await fillCustomer(page);
  await page.getByRole("button", { name: "Перейти к оплате" }).click();
  await expect(
    page.getByRole("heading", { name: "Оплата заказа" }),
  ).toBeVisible();
  await expectAccessible(page);
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
});

test("пустая корзина, Escape и удаление последней пиццы в карточке", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".product")).toHaveCount(8);
  await openCart(page);
  await expect(
    page.getByRole("heading", { name: "Здесь будет ваша пицца" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Открыть корзину/ }),
  ).toBeFocused();
  await addPizza(page);
  await page.getByRole("button", { name: "Уменьшить: Мясная Делюкс" }).click();
  await expect(
    page.getByRole("button", { name: "В корзину: Мясная Делюкс", exact: true }),
  ).toBeVisible();
});

test("ошибка каталога позволяет повторить загрузку", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    let fail = true;
    window.fetch = (...args) => {
      if (String(args[0]).endsWith("/api/products") && fail) {
        fail = false;
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return original(...args);
    };
  });
  await page.goto("/");
  await expect(
    page.getByText("Не удалось загрузить меню.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Повторить загрузку" }).click();
  await expect(page.locator(".product")).toHaveCount(8);
});

test("шапка остаётся наверху, текущий раздел подсвечивается", async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".product")).toHaveCount(8);
  for (const id of ["catalog", "delivery", "contacts"]) {
    await page.evaluate(
      (id) => document.getElementById(id)?.scrollIntoView(),
      id,
    );
    await expect(page.locator(`.desktop-nav a[href="#${id}"]`)).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(
      await page
        .locator(".header")
        .evaluate((e) => Math.abs(e.getBoundingClientRect().top)),
    ).toBeLessThan(1);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  if (!isMobile) {
    const link = page.locator('.desktop-nav a[href="#catalog"]');
    await link.hover();
    await expect(link).toHaveCSS("background-size", "100% 100%");
  }
});

test("настройки пиццы, дополнительные начинки и разные строки корзины", async ({
  page,
}) => {
  await page.goto("/");
  await addPizza(page);
  await page
    .getByRole("button", {
      name: "Состав и настройки: Мясная Делюкс",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Состав", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Моцарелла", { exact: true })).toHaveCount(0);
  await dialog.getByRole("radio", { name: "35 см", exact: true }).check();
  await dialog.getByRole("radio", { name: "Тонкое", exact: true }).check();
  await dialog
    .getByRole("checkbox", { name: "Добавить начинку", exact: true })
    .check();
  await dialog.getByRole("checkbox", { name: /Моцарелла/ }).check();
  await expect(dialog.locator(".product-dialog__footer")).toContainText("970");
  await expectAccessible(page);
  await dialog
    .getByRole("button", { name: "Добавить в корзину", exact: false })
    .click();
  await openCart(page);
  await expect(page.locator(".cart__list>li")).toHaveCount(2);
  await expect(page.getByRole("dialog")).toContainText(
    "35 см · тонкое тесто · + Моцарелла",
  );
  await expect(page.locator(".order-summary__total")).toContainText("1 660");
  await page.keyboard.press("Escape");
  await page.reload();
  await openCart(page);
  await expect(page.locator(".cart__list>li")).toHaveCount(2);
  await expect(page.locator(".order-summary__total")).toContainText("1 660");
});
test("маска телефона форматирует ввод, вставку и удаление", async ({
  page,
}) => {
  await page.goto("/");
  await addPizza(page);
  await openCart(page);
  await page
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
  const phone = page.getByLabel("Телефон", { exact: true });
  await phone.fill("89991234567");
  await expect(phone).toHaveValue("+7 (999) 123-45-67");
  await phone.clear();
  await phone.pressSequentially("9991234567");
  await expect(phone).toHaveValue("+7 (999) 123-45-67");
  await phone.press("End");
  await phone.press("Backspace");
  await expect(phone).toHaveValue("+7 (999) 123-45-6_");
  await expect(
    page.getByText("Формат телефона:", { exact: false }),
  ).toHaveCount(0);
});
