import { ingredientNames, productIngredientIds } from "../data/ingredients";
import type { Product } from "../types";
const names = [
  "Мясная Делюкс",
  "Морская Премиум",
  "Бекон и Сосиски",
  "Куриная Делюкс",
  "Барбекю Премиум",
  "Пепперони Дабл",
  "Куриное трио",
  "Сырная",
];
const descriptions = [
  "Пепперони, лук, бекон, томатная паста, колбаски, перец, грибы, соус чили, ананасы",
  "Перец, сыр, креветки, кальмары, мидии, лосось",
  "Бекон, сыр, сосиски, ананас, томатная паста",
  "Курица, ананас, сыр, пепперони, томатная паста",
  "Свинина BBQ, соус барбекю, сыр, курица, соус чили",
  "Пепперони, сыр, обжаренная и варёная колбаса",
  "Жареная и тушёная курица, наггетсы, перец, сыр, грибы",
  "Джюгас, сыр с плесенью, моцарелла и секретный сыр",
];
export const products: Product[] = names.map((name, i) => ({
  id: `pizza-${i + 1}`,
  name,
  description: descriptions[i],
  ingredients: productIngredientIds[`pizza-${i + 1}`].map((id) => ({
    id,
    name: ingredientNames[id],
  })),
  price: [690, 890, 590, 650, 750, 690, 720, 590][i],
  image:
    "assets/images/" +
    [
      "meat-deluxe.png",
      "seafood-premium.png",
      "bacon-and-sausages.png",
      "chicken-deluxe.png",
      "barbecue-premium.png",
      "double-pepperoni.png",
      "chicken-trio.png",
      "cheese.png",
    ][i],
}));
