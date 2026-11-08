import { http, HttpResponse, delay } from "msw";
import { products } from "./products";
import { validateCustomer, validateOrderDetails } from "../utils/validation";
import { isValidCartItem, total } from "../utils/cart";
import type {
  DeliveryDetails,
  LocationSelection,
  CartItem,
  Customer,
  Payment,
  PaymentMethod,
} from "../types";
const orders = new Map<string, { total: number; payment?: Payment }>();
export const handlers = [
  http.get("*/api/products", async () => {
    await delay(350);
    return HttpResponse.json(products);
  }),
  http.post("*/api/orders", async ({ request }) => {
    await delay(650);
    let body: {
      items?: CartItem[];
      customer?: Customer;
      details?: DeliveryDetails;
      location?: LocationSelection;
    };
    try {
      body = (await request.json()) as typeof body;
      if (!body || typeof body !== "object")
        return new HttpResponse(null, { status: 400 });
    } catch {
      return new HttpResponse(null, { status: 400 });
    }
    const { items, customer, details, location } = body;
    if (
      !details ||
      !location ||
      !customer ||
      typeof customer.name !== "string" ||
      typeof customer.address !== "string" ||
      typeof customer.phone !== "string" ||
      Object.keys(validateCustomer(customer)).length ||
      validateOrderDetails(details, location, customer.address) ||
      !Array.isArray(items) ||
      !items.length ||
      items.some(
        (i) =>
          !isValidCartItem(i) || !products.some((p) => p.id === i.productId),
      ) ||
      new Set(items.map((i) => i.id)).size !== items.length
    )
      return new HttpResponse(null, { status: 400 });
    const id = "PC-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const amount = total(items, products);
    // Store no contact or card details, even in mock memory.
    orders.set(id, { total: amount });
    return HttpResponse.json({ id, total: amount }, { status: 201 });
  }),
  http.post("*/api/orders/:id/payment", async ({ params, request }) => {
    await delay(600);
    const id = String(params.id);
    const order = orders.get(id);
    if (!order) return new HttpResponse(null, { status: 404 });
    if (order.payment) return HttpResponse.json(order.payment);
    let body: { method?: PaymentMethod };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new HttpResponse(null, { status: 400 });
    }
    if (!body || !["card", "delivery"].includes(body.method ?? ""))
      return new HttpResponse(null, { status: 400 });
    const method = body.method!;
    order.payment = {
      orderId: id,
      total: order.total,
      status: method === "card" ? "paid" : "pending",
      method,
    };
    return HttpResponse.json(order.payment);
  }),
];
