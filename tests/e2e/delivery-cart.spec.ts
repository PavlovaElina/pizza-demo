import { expect, test } from "@playwright/test";

test("кнопка корзины находится в доставке и на телефоне останавливается перед футером", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/api/location/config", (route) =>
    route.fulfill({
      json: { mapKey: "", geocoding: false, suggestions: false },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "В корзину: Мясная Делюкс", exact: true })
    .click();
  const button = page.getByRole("button", { name: /Перейти в корзину/ });
  await expect(button).toHaveCount(1);
  await expect(
    page.locator("#catalog").getByRole("button", { name: /Перейти в корзину/ }),
  ).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await expect
      .poll(async () => {
        const box = await button.boundingBox();
        return box
          ? Math.abs(page.viewportSize()!.height - box.y - box.height - 12)
          : 1000;
      })
      .toBeLessThan(3);
    await page
      .locator(".delivery__cart-anchor")
      .evaluate((el) =>
        el.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const anchor = document
            .querySelector(".delivery__cart-anchor")!
            .getBoundingClientRect();
          const bar = document
            .querySelector(".delivery-cart-bar")!
            .getBoundingClientRect();
          return Math.abs(anchor.bottom - bar.bottom);
        }),
      )
      .toBeLessThan(2);
    await expect(page.locator(".delivery-cart-bar")).toHaveCSS(
      "position",
      "absolute",
    );
    // Once docked, scrolling moves the button with its section without easing lag.
    for (const delta of [40, -20, 60]) {
      await page.evaluate(
        (y) => window.scrollBy({ top: y, behavior: "instant" }),
        delta,
      );
      await expect
        .poll(() =>
          page.evaluate(() => {
            const anchor = document
              .querySelector(".delivery__cart-anchor")!
              .getBoundingClientRect();
            const bar = document
              .querySelector(".delivery-cart-bar")!
              .getBoundingClientRect();
            return Math.abs(anchor.bottom - bar.bottom);
          }),
        )
        .toBeLessThan(1);
    }
    const visual = await page.locator(".delivery__visual").boundingBox();
    const content = await page.locator(".delivery__content").boundingBox();
    const footer = await page.locator("#contacts").boundingBox();
    const anchor = await page.locator(".delivery__cart-anchor").boundingBox();
    expect(anchor!.y).toBeGreaterThanOrEqual(visual!.y + visual!.height);
    expect(anchor!.y).toBeGreaterThanOrEqual(content!.y + content!.height);
    expect(anchor!.y + anchor!.height).toBeLessThanOrEqual(footer!.y);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  } else {
    await expect(
      page
        .locator("#delivery")
        .getByRole("button", { name: /Перейти в корзину/ }),
    ).toHaveCount(1);
  }
  await button.click();
  await expect(
    page.getByRole("dialog", { name: "Ваша корзина" }),
  ).toBeVisible();
});
