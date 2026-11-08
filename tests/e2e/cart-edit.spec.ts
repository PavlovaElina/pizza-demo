import { test, expect } from "@playwright/test";

test("исключение, редактирование всей позиции, отмена и объединение", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "В корзину: Мясная Делюкс", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Увеличить: Мясная Делюкс", exact: true })
    .click();
  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  await page
    .getByRole("button", { name: "Настроить: Мясная Делюкс", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Лук в составе", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Лук в составе", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Отменить изменения" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ваша корзина" }),
  ).not.toContainText("Без: Лук");
  await page
    .getByRole("button", { name: "Настроить: Мясная Делюкс", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Лук в составе", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: false })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Ваша корзина" }),
  ).toContainText("Без: Лук");
  await expect(page.locator(".order-summary__total")).toContainText("1 380");
  await expect(page.locator(".cart__list output")).toHaveText("2");
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Ваша корзина" }),
  ).toContainText("Без: Лук");
  await page.getByRole("button", { name: "Добавить ещё пиццу" }).click();
  await page
    .getByRole("button", {
      name: "Состав и настройки: Мясная Делюкс",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", { name: "Лук в составе", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Добавить в корзину", exact: false })
    .click();
  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  const excluded = page
    .locator(".cart__list>li")
    .filter({ hasText: "Без: Лук" });
  await excluded
    .getByRole("button", { name: "Настроить: Мясная Делюкс", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Лук в составе", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: false })
    .click();
  await expect(page.locator(".cart__list>li")).toHaveCount(1);
  await expect(page.locator(".cart__list output")).toHaveText("3");
});

test("исключённая моцарелла не добавляется как дополнительная начинка", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Состав и настройки: Сырная", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Моцарелла в составе", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Добавить начинку", exact: true })
    .check();
  await expect(
    page
      .locator(".topping-options")
      .getByRole("checkbox", { name: /Моцарелла/ }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Моцарелла в составе", exact: true })
    .check();
  await expect(
    page
      .locator(".topping-options")
      .getByRole("checkbox", { name: /Моцарелла/ }),
  ).toBeEnabled();
});

test("объединение сверх 99 блокируется без потери позиций", async ({
  page,
}) => {
  const normal = {
    id: "pizza-1",
    productId: "pizza-1",
    size: 30,
    dough: "traditional",
    toppings: [],
    excludedIngredients: [],
    quantity: 98,
  };
  const excluded = {
    ...normal,
    id: "pizza-1:30:traditional::without=onion",
    excludedIngredients: ["onion"],
    quantity: 2,
  };
  await page.addInitScript(
    (items) => localStorage.setItem("pizza-cart-v3", JSON.stringify(items)),
    [normal, excluded],
  );
  await page.goto("/");
  await expect(page.locator(".product")).toHaveCount(8);
  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  await page
    .locator(".cart__list>li")
    .filter({ hasText: "Без: Лук" })
    .getByRole("button", { name: "Настроить: Мясная Делюкс", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Лук в составе", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: false })
    .click();
  await expect(
    page.locator(".product-dialog").getByRole("alert"),
  ).toContainText("не больше 99");
  await page.getByRole("button", { name: "Отменить изменения" }).click();
  await expect(page.locator(".cart__list>li")).toHaveCount(2);
  expect(await page.locator(".cart__list output").allTextContents()).toEqual([
    "98",
    "2",
  ]);
});
