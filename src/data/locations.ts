import type { City, Restaurant } from "../types";
export const cities: City[] = [
  {
    id: "moscow",
    name: "Москва",
    aliases: ["москва", "moscow"],
    coordinates: { lat: 55.7558, lng: 37.6173 },
  },
  {
    id: "saint-petersburg",
    name: "Санкт-Петербург",
    aliases: ["санкт-петербург", "санкт петербург", "saint petersburg"],
    coordinates: { lat: 59.9386, lng: 30.3141 },
  },
  {
    id: "kazan",
    name: "Казань",
    aliases: ["казань", "kazan"],
    coordinates: { lat: 55.7961, lng: 49.1064 },
  },
];
// Fictional branches. Coordinates orient the demo map; these are not real businesses.
export const restaurants: Restaurant[] = [
  {
    id: "moscow-center",
    cityId: "moscow",
    name: "Pizza Cheff · Центр",
    address: "Базиликовая улица, 12",
    coordinates: { lat: 55.757, lng: 37.613 },
  },
  {
    id: "moscow-park",
    cityId: "moscow",
    name: "Pizza Cheff · У парка",
    address: "Сырный переулок, 8",
    coordinates: { lat: 55.73, lng: 37.6 },
  },
  {
    id: "spb-center",
    cityId: "saint-petersburg",
    name: "Pizza Cheff · Центр",
    address: "Томатная улица, 15",
    coordinates: { lat: 59.934, lng: 30.33 },
  },
  {
    id: "spb-river",
    cityId: "saint-petersburg",
    name: "Pizza Cheff · У реки",
    address: "Пекарская набережная, 6",
    coordinates: { lat: 59.945, lng: 30.3 },
  },
  {
    id: "kazan-center",
    cityId: "kazan",
    name: "Pizza Cheff · Центр",
    address: "Улица Моцареллы, 10",
    coordinates: { lat: 55.79, lng: 49.12 },
  },
  {
    id: "kazan-garden",
    cityId: "kazan",
    name: "Pizza Cheff · У сада",
    address: "Пряная улица, 4",
    coordinates: { lat: 55.805, lng: 49.13 },
  },
];
export const findCity = (value: string) =>
  cities.find((c) => c.aliases.includes(value.trim().toLowerCase()));
