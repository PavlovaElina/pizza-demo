export type Product = {
  id: string;
  name: string;
  description: string;
  ingredients: { id: string; name: string }[];
  price: number;
  image: string;
};
export type PizzaSize = 25 | 30 | 35;
export type Dough = "traditional" | "thin";
export type PizzaOptions = {
  size: PizzaSize;
  dough: Dough;
  toppings: string[];
  excludedIngredients: string[];
};
export type CartItem = PizzaOptions & {
  id: string;
  productId: string;
  quantity: number;
};
export type Customer = { name: string; address: string; phone: string };
export type Order = { id: string; total: number };
export type PaymentMethod = "card" | "delivery";
export type Payment = {
  orderId: string;
  status: "paid" | "pending";
  total: number;
  method: PaymentMethod;
};
export type CardDetails = {
  number: string;
  expiry: string;
  holder: string;
  cvc: string;
};

export type Coordinates = { lat: number; lng: number };
export type City = {
  id: string;
  name: string;
  aliases: string[];
  coordinates: Coordinates;
};
export type Restaurant = {
  id: string;
  cityId: string;
  name: string;
  address: string;
  coordinates: Coordinates;
};
export type LocationSelection = { cityId: string; restaurantId: string };
export type DeliveryDetails = {
  comment: string;
  apartment: string;
  entrance: string;
  floor: string;
  intercom: string;
  coordinates?: Coordinates;
  addressCityId?: string;
};
export type GeocodedAddress = {
  address: string;
  cityName: string;
  cityId?: string;
  coordinates: Coordinates;
  precision: string;
};
export type LocationConfig = {
  mapKey: string;
  geocoding: boolean;
  suggestions?: boolean;
};
export const emptyDelivery: DeliveryDetails = {
  comment: "",
  apartment: "",
  entrance: "",
  floor: "",
  intercom: "",
};

export type AddressSuggestion = {
  label: string;
  description: string;
  address: string;
};
