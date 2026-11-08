import { cities, restaurants } from "../data/locations";
import type { Customer } from "../types";
export function validateCustomer(customer: Customer): Partial<Customer> {
  const errors: Partial<Customer> = {};
  if (customer.name.trim().length < 2)
    errors.name = "Укажите имя — минимум 2 символа.";
  if (customer.address.trim().length < 8)
    errors.address = "Укажите улицу, дом и квартиру — минимум 8 символов.";
  if (!/^(?:7|8)\d{10}$/.test(customer.phone.replace(/\D/g, "")))
    errors.phone = "Введите российский номер: +7 и ещё 10 цифр.";
  return errors;
}

export function validateOrderDetails(
  details: import("../types").DeliveryDetails,
  location: import("../types").LocationSelection | null,
  address: string,
): string {
  if (
    !location ||
    !cities.some((c) => c.id === location.cityId) ||
    !restaurants.some(
      (r) => r.id === location.restaurantId && r.cityId === location.cityId,
    )
  )
    return "Выберите город и пиццерию.";
  if (typeof details.comment !== "string" || details.comment.length > 500)
    return "Комментарий должен быть не длиннее 500 символов.";
  if (
    ["apartment", "entrance", "floor", "intercom"].some(
      (key) =>
        typeof details[key as keyof typeof details] !== "string" ||
        String(details[key as keyof typeof details]).length > 30,
    )
  )
    return "Проверьте дополнительные сведения об адресе.";
  const otherCity = cities.find(
    (c) =>
      c.id !== location.cityId &&
      c.aliases.some((alias) => address.toLowerCase().includes(alias)),
  );
  if (
    otherCity ||
    (details.addressCityId && details.addressCityId !== location.cityId)
  )
    return "Адрес находится в другом городе. Измените город или адрес.";
  if (
    details.coordinates &&
    (!Number.isFinite(details.coordinates.lat) ||
      !Number.isFinite(details.coordinates.lng) ||
      Math.abs(details.coordinates.lat) > 90 ||
      Math.abs(details.coordinates.lng) > 180)
  )
    return "Проверьте точку доставки.";
  return "";
}
