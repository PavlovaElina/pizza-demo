import type { DeliveryDetails, LocationSelection } from "../types";
import type {
  Product,
  CartItem,
  Customer,
  Order,
  Payment,
  PaymentMethod,
} from "../types";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/${path}`, {
    ...init,
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 402)
    throw new Error(
      "Не удалось подтвердить оплату. Корзина сохранена — попробуйте ещё раз.",
    );
  if (!response.ok)
    throw new Error("Сервис временно недоступен. Попробуйте ещё раз.");
  return response.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const getProducts = () => request<Product[]>("products");
export const createOrder = (
  items: CartItem[],
  customer: Customer,
  details: DeliveryDetails,
  location: LocationSelection,
) => request<Order>("orders", json({ items, customer, details, location }));
export const payOrder = (id: string, method: PaymentMethod) =>
  request<Payment>(
    `orders/${encodeURIComponent(id)}/payment`,
    json({ method }),
  );
