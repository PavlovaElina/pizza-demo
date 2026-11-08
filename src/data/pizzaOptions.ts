import type { Dough, PizzaOptions, PizzaSize } from "../types";
export const pizzaSizes: {
  value: PizzaSize;
  label: string;
  priceAdjustment: number;
}[] = [
  { value: 25, label: "25 см", priceAdjustment: -150 },
  { value: 30, label: "30 см", priceAdjustment: 0 },
  { value: 35, label: "35 см", priceAdjustment: 200 },
];
export const doughTypes: { value: Dough; label: string }[] = [
  { value: "traditional", label: "Традиционное" },
  { value: "thin", label: "Тонкое" },
];
export const toppings = [
  { id: "mozzarella", name: "Моцарелла", price: 80 },
  { id: "mushrooms", name: "Шампиньоны", price: 60 },
  { id: "pepperoni", name: "Пепперони", price: 100 },
  { id: "jalapeno", name: "Халапеньо", price: 50 },
];
export const defaultOptions: PizzaOptions = {
  size: 30,
  dough: "traditional",
  toppings: [],
  excludedIngredients: [],
};
