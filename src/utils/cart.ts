import { ingredientNames, productIngredientIds } from "../data/ingredients";
import type { CartItem, PizzaOptions, Product } from "../types";
import {
  defaultOptions,
  doughTypes,
  pizzaSizes,
  toppings,
} from "../data/pizzaOptions";
export const CART_STORAGE_KEY = "pizza-cart-v3";
export const variantId = (productId: string, options: PizzaOptions) =>
  options.size === 30 &&
  options.dough === "traditional" &&
  !options.toppings.length &&
  !options.excludedIngredients.length
    ? productId
    : `${productId}:${options.size}:${options.dough}:${[...options.toppings].sort().join(",")}:without=${[...options.excludedIngredients].sort().join(",")}`;
export function createCartItem(
  productId: string,
  options: PizzaOptions = defaultOptions,
): CartItem {
  const normalized = {
    ...options,
    toppings: [...new Set(options.toppings)].sort(),
    excludedIngredients: [...new Set(options.excludedIngredients)].sort(),
  };
  return {
    ...normalized,
    id: variantId(productId, normalized),
    productId,
    quantity: 1,
  };
}
export const unitPrice = (
  product: Product,
  options: PizzaOptions = defaultOptions,
) =>
  product.price +
  (pizzaSizes.find((size) => size.value === options.size)?.priceAdjustment ??
    0) +
  toppings
    .filter((t) => options.toppings.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);
export function describeOptions(options: PizzaOptions) {
  const extras = toppings
    .filter((t) => options.toppings.includes(t.id))
    .map((t) => t.name)
    .join(", ");
  const excluded = options.excludedIngredients
    .map((id) => ingredientNames[id])
    .join(", ");
  return `${options.size} см · ${doughTypes.find((d) => d.value === options.dough)?.label.toLowerCase()} тесто${extras ? ` · + ${extras}` : ""}${excluded ? ` · Без: ${excluded}` : ""}`;
}
export type CartAction =
  | { type: "add"; id: string; options?: PizzaOptions }
  | { type: "remove"; id: string }
  | { type: "decrease"; id: string }
  | { type: "edit"; id: string; options: PizzaOptions }
  | { type: "clear" };
export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  if (action.type === "clear") return [];
  if (action.type === "edit") {
    const old = state.find((i) => i.id === action.id);
    if (!old) return state;
    const replacement = {
      ...createCartItem(old.productId, action.options),
      quantity: old.quantity,
    };
    const target = state.find(
      (i) => i.id === replacement.id && i.id !== old.id,
    );
    if (target && target.quantity + old.quantity > 99) return state;
    return target
      ? state
          .filter((i) => i.id !== old.id)
          .map((i) =>
            i.id === target.id
              ? { ...i, quantity: i.quantity + old.quantity }
              : i,
          )
      : state.map((i) => (i.id === old.id ? replacement : i));
  }
  if (action.type === "remove") return state.filter((i) => i.id !== action.id);
  if (action.type === "decrease")
    return state.flatMap((i) =>
      i.id !== action.id
        ? [i]
        : i.quantity > 1
          ? [{ ...i, quantity: i.quantity - 1 }]
          : [],
    );
  const candidate = action.options
    ? createCartItem(action.id, action.options)
    : (state.find((i) => i.id === action.id) ?? createCartItem(action.id));
  const item = state.find((i) => i.id === candidate.id);
  return item
    ? state.map((i) =>
        i.id === candidate.id
          ? { ...i, quantity: Math.min(99, i.quantity + 1) }
          : i,
      )
    : [...state, candidate];
}
export const total = (items: CartItem[], products: Product[]) =>
  items.reduce((sum, item) => {
    const p = products.find((p) => p.id === item.productId);
    return sum + (p ? unitPrice(p, item) * item.quantity : 0);
  }, 0);
export const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
export function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const i = value as CartItem;
  return (
    typeof i.productId === "string" &&
    typeof i.id === "string" &&
    pizzaSizes.some((s) => s.value === i.size) &&
    doughTypes.some((d) => d.value === i.dough) &&
    Array.isArray(i.toppings) &&
    i.toppings.every((t) => toppings.some((option) => option.id === t)) &&
    new Set(i.toppings).size === i.toppings.length &&
    Number.isInteger(i.quantity) &&
    i.quantity >= 1 &&
    i.quantity <= 99 &&
    Array.isArray(i.excludedIngredients) &&
    i.excludedIngredients.every((id) =>
      productIngredientIds[i.productId]?.includes(id),
    ) &&
    new Set(i.excludedIngredients).size === i.excludedIngredients.length &&
    !i.toppings.some((id) => i.excludedIngredients.includes(id)) &&
    i.id === variantId(i.productId, i)
  );
}
export function readCart(): CartItem[] {
  try {
    const current = localStorage.getItem(CART_STORAGE_KEY);
    const legacy = current === null;
    const raw: unknown = JSON.parse(
      current ??
        localStorage.getItem("pizza-cart-v2") ??
        localStorage.getItem("pizza-cart-v1") ??
        "[]",
    );
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const result: CartItem[] = [];
    for (const value of raw) {
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      let candidate: unknown = value;
      if (legacy) {
        if (typeof record.id !== "string") continue;
        if (!("productId" in record))
          candidate = {
            ...createCartItem(record.id),
            quantity: record.quantity,
          };
        else {
          if (
            typeof record.productId !== "string" ||
            !Array.isArray(record.toppings)
          )
            continue;
          const options = {
            size: record.size,
            dough: record.dough,
            toppings: record.toppings,
            excludedIngredients: [],
          } as PizzaOptions;
          candidate = {
            ...record,
            excludedIngredients: [],
            id: variantId(record.productId, options),
          };
        }
      }
      if (isValidCartItem(candidate) && !seen.has(candidate.id)) {
        seen.add(candidate.id);
        result.push(candidate);
      }
    }
    return result;
  } catch {
    return [];
  }
}
