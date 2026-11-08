import type { CardDetails } from "../types";
export function validateCard(
  card: CardDetails,
  now = new Date(),
): Partial<CardDetails> {
  const errors: Partial<CardDetails> = {};
  if (!/^\d{16}$/.test(card.number.replace(/\D/g, "")))
    errors.number = "Введите 16 цифр номера карты.";
  const match = /^(\d{2})\/(\d{2})$/.exec(card.expiry);
  if (
    !match ||
    Number(match[1]) < 1 ||
    Number(match[1]) > 12 ||
    2000 + Number(match[2]) < now.getFullYear() ||
    (2000 + Number(match[2]) === now.getFullYear() &&
      Number(match[1]) < now.getMonth() + 1)
  )
    errors.expiry = "Укажите действующий срок в формате ММ/ГГ.";
  if (card.holder.trim().length < 2)
    errors.holder = "Укажите имя владельца карты.";
  if (!/^\d{3}$/.test(card.cvc)) errors.cvc = "Введите 3 цифры CVC.";
  return errors;
}
