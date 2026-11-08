import { describe, expect, it, vi } from "vitest";
import {
  cartReducer,
  createCartItem,
  isValidCartItem,
  readCart,
  total,
  unitPrice,
} from "./cart";
import { products } from "../mocks/products";
import { validateCustomer } from "./validation";
import { validateCard } from "./payment";
describe("корзина", () => {
  it("считает итог после добавления, увеличения и удаления", () => {
    let state = cartReducer([], { type: "add", id: products[0].id });
    state = cartReducer(state, { type: "add", id: products[0].id });
    state = cartReducer(state, { type: "add", id: products[1].id });
    expect(total(state, products)).toBe(2270);
    state = cartReducer(state, { type: "decrease", id: products[0].id });
    expect(total(state, products)).toBe(1580);
    expect(cartReducer(state, { type: "remove", id: products[1].id })).toEqual([
      createCartItem(products[0].id),
    ]);
  });
  it("удаляет последнюю штуку и ограничивает количество", () => {
    const item = createCartItem("pizza-1");
    expect(cartReducer([item], { type: "decrease", id: item.id })).toEqual([]);
    expect(
      cartReducer([{ ...item, quantity: 99 }], { type: "add", id: item.id })[0]
        .quantity,
    ).toBe(99);
  });
  it("разделяет варианты, объединяет одинаковые наборы начинок и считает цену", () => {
    const first = {
      size: 35 as const,
      dough: "thin" as const,
      toppings: ["mozzarella", "mushrooms"],
      excludedIngredients: [],
    };
    let state = cartReducer([], { type: "add", id: "pizza-1", options: first });
    state = cartReducer(state, {
      type: "add",
      id: "pizza-1",
      options: { ...first, toppings: ["mushrooms", "mozzarella"] },
    });
    state = cartReducer(state, { type: "add", id: "pizza-1" });
    expect(state).toHaveLength(2);
    expect(state[0].quantity).toBe(2);
    expect(unitPrice(products[0], first)).toBe(1030);
    expect(total(state, products)).toBe(2750);
  });
  it("мигрирует прежнюю корзину и отбрасывает повреждённые записи", () => {
    vi.stubGlobal("localStorage", { getItem: () => "{broken" });
    expect(readCart()).toEqual([]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === "pizza-cart-v1"
          ? JSON.stringify([
              { id: "pizza-1", quantity: 2 },
              { id: "pizza-1", quantity: 4 },
              { id: "pizza-2", quantity: -1 },
            ])
          : null,
    });
    expect(readCart()).toEqual([{ ...createCartItem("pizza-1"), quantity: 2 }]);
    vi.unstubAllGlobals();
  });
  it("не принимает подменённые варианты и неизвестные начинки", () => {
    const item = createCartItem("pizza-1");
    expect(isValidCartItem({ ...item, size: 99 })).toBe(false);
    expect(isValidCartItem({ ...item, toppings: ["free-price"] })).toBe(false);
    expect(isValidCartItem({ ...item, id: "changed" })).toBe(false);
  });
});
it("проверяет имя, адрес и российский телефон", () => {
  expect(
    Object.keys(validateCustomer({ name: " ", address: "дом", phone: "123" })),
  ).toHaveLength(3);
  expect(
    validateCustomer({
      name: "Анна",
      address: "Тестовая улица, 1",
      phone: "+7 (999) 123-45-67",
    }),
  ).toEqual({});
});
it("отклоняет пустые и просроченные карточные данные", () => {
  const now = new Date(2026, 10, 7);
  expect(
    Object.keys(
      validateCard({ number: "", expiry: "", holder: "", cvc: "" }, now),
    ),
  ).toHaveLength(4);
  const card = {
    number: "4242 4242 4242 4242",
    expiry: "11/26",
    holder: "TEST USER",
    cvc: "123",
  };
  expect(validateCard(card, now)).toEqual({});
  expect(validateCard({ ...card, expiry: "10/26" }, now).expiry).toBeDefined();
  expect(validateCard({ ...card, expiry: "13/35" }, now).expiry).toBeDefined();
});

it("изменение объединяет количество, сохраняет исходную позицию при переполнении", () => {
  const first = createCartItem("pizza-1");
  const second = createCartItem("pizza-1", {
    size: 35,
    dough: "thin",
    toppings: [],
    excludedIngredients: ["onion"],
  });
  const state = [
    { ...first, quantity: 2 },
    { ...second, quantity: 3 },
  ];
  const merged = cartReducer(state, {
    type: "edit",
    id: second.id,
    options: first,
  });
  expect(merged).toEqual([{ ...first, quantity: 5 }]);
  const full = [
    { ...first, quantity: 98 },
    { ...second, quantity: 2 },
  ];
  expect(
    cartReducer(full, { type: "edit", id: second.id, options: first }),
  ).toEqual(full);
  expect(
    unitPrice(products[0], { ...first, excludedIngredients: ["onion"] }),
  ).toBe(unitPrice(products[0], first));
});
it("переносит v2, включая нестандартные варианты, в новую схему", () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "pizza-cart-v2"
        ? JSON.stringify([
            {
              id: "pizza-1:35:thin:mozzarella",
              productId: "pizza-1",
              size: 35,
              dough: "thin",
              toppings: ["mozzarella"],
              quantity: 2,
            },
          ])
        : null,
  });
  const restored = readCart();
  expect(restored).toHaveLength(1);
  expect(restored[0].excludedIngredients).toEqual([]);
  expect(total(restored, products)).toBe(1940);
  vi.unstubAllGlobals();
});
it("исключения каноничны, а исключённый ингредиент нельзя одновременно добавить", () => {
  const options = {
    size: 30 as const,
    dough: "traditional" as const,
    toppings: [],
    excludedIngredients: ["onion", "mushrooms"],
  };
  expect(createCartItem("pizza-1", options).id).toBe(
    createCartItem("pizza-1", {
      ...options,
      excludedIngredients: ["mushrooms", "onion"],
    }).id,
  );
  expect(
    isValidCartItem(
      createCartItem("pizza-1", { ...options, toppings: ["mushrooms"] }),
    ),
  ).toBe(false);
});
