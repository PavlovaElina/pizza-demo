import { useState, type FormEvent } from "react";
import { IMaskInput } from "react-imask";
import type { CardDetails, Order, PaymentMethod } from "../types";
import { money } from "../utils/cart";
import { validateCard } from "../utils/payment";
type Props = {
  order: Order;
  pending: boolean;
  onPay: (method: PaymentMethod) => void;
  onBack: () => void;
};
export default function PaymentPanel({ order, pending, onPay, onBack }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [card, setCard] = useState<CardDetails>({
    number: "",
    expiry: "",
    holder: "",
    cvc: "",
  });
  const [errors, setErrors] = useState<Partial<CardDetails>>({});
  const change = (key: keyof CardDetails, value: string) => {
    setCard((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (method === "card") {
      const found = validateCard(card);
      setErrors(found);
      if (Object.keys(found).length) {
        event.currentTarget
          .querySelector<HTMLInputElement>(`[name="${Object.keys(found)[0]}"]`)
          ?.focus();
        return;
      }
    }
    // Only the chosen payment method leaves this component. Card fields never enter the API payload.
    setCard({ number: "", expiry: "", holder: "", cvc: "" });
    onPay(method);
  }
  return (
    <form
      onSubmit={submit}
      noValidate
      autoComplete="off"
      aria-label="Способ оплаты"
    >
      <button
        className="text-button"
        type="button"
        onClick={onBack}
        disabled={pending}
      >
        ← Вернуться к данным
      </button>
      <fieldset className="payment-methods" disabled={pending}>
        <legend>Как вам удобнее оплатить?</legend>
        <label className={method === "card" ? "is-selected" : ""}>
          <input
            type="radio"
            name="payment-method"
            checked={method === "card"}
            onChange={() => {
              setMethod("card");
              setErrors({});
            }}
          />
          <span>
            <strong>Картой сейчас</strong>
            <small>Онлайн, без комиссии</small>
          </span>
        </label>
        <label className={method === "delivery" ? "is-selected" : ""}>
          <input
            type="radio"
            name="payment-method"
            checked={method === "delivery"}
            onChange={() => {
              setMethod("delivery");
              setCard({ number: "", expiry: "", holder: "", cvc: "" });
              setErrors({});
            }}
          />
          <span>
            <strong>При получении</strong>
            <small>Курьеру наличными или картой</small>
          </span>
        </label>
      </fieldset>
      {method === "card" ? (
        <>
          <div className="bank-card" aria-hidden="true">
            <div className="bank-card__top">
              <span>Pizza Cheff</span>
              <span className="bank-card__chip" />
            </div>
            <div className="bank-card__number">
              {card.number || "•••• •••• •••• ••••"}
            </div>
            <div className="bank-card__bottom">
              <span>{card.holder || "CARDHOLDER NAME"}</span>
              <span>{card.expiry || "MM/YY"}</span>
            </div>
          </div>
          <fieldset disabled={pending} className="card-fields">
            <legend className="sr-only">Данные банковской карты</legend>
            <div className="field">
              <label htmlFor="card-number">Номер карты</label>
              <IMaskInput
                id="card-number"
                name="number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                mask="0000 0000 0000 0000"
                placeholder="0000 0000 0000 0000"
                value={card.number}
                onAccept={(value: string) => change("number", value)}
                aria-invalid={!!errors.number}
                aria-describedby={
                  errors.number ? "card-number-error" : undefined
                }
              />
              {errors.number && (
                <p className="error" id="card-number-error">
                  {errors.number}
                </p>
              )}
            </div>
            <div className="card-fields__row">
              <div className="field">
                <label htmlFor="card-expiry">Срок действия</label>
                <IMaskInput
                  id="card-expiry"
                  name="expiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  mask="00/00"
                  placeholder="ММ/ГГ"
                  value={card.expiry}
                  onAccept={(value: string) => change("expiry", value)}
                  aria-invalid={!!errors.expiry}
                  aria-describedby={
                    errors.expiry ? "card-expiry-error" : undefined
                  }
                />
                {errors.expiry && (
                  <p className="error" id="card-expiry-error">
                    {errors.expiry}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="card-cvc">CVC</label>
                <input
                  id="card-cvc"
                  name="cvc"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="•••"
                  maxLength={3}
                  value={card.cvc}
                  onChange={(event) =>
                    change("cvc", event.target.value.replace(/\D/g, ""))
                  }
                  aria-invalid={!!errors.cvc}
                  aria-describedby={errors.cvc ? "card-cvc-error" : undefined}
                />
                {errors.cvc && (
                  <p className="error" id="card-cvc-error">
                    {errors.cvc}
                  </p>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="card-holder">Имя владельца</label>
              <input
                id="card-holder"
                name="holder"
                autoComplete="off"
                placeholder="IVAN IVANOV"
                maxLength={60}
                value={card.holder}
                onChange={(event) =>
                  change("holder", event.target.value.toUpperCase())
                }
                aria-invalid={!!errors.holder}
                aria-describedby={
                  errors.holder ? "card-holder-error" : undefined
                }
              />
              {errors.holder && (
                <p className="error" id="card-holder-error">
                  {errors.holder}
                </p>
              )}
            </div>
          </fieldset>
        </>
      ) : (
        <div className="pay-on-delivery">
          <span aria-hidden="true">✓</span>
          <h3>Оплатите, когда пицца будет у вас</h3>
          <p>
            Сейчас платить не нужно. Подтвердите заказ, а сумму передайте
            курьеру при получении.
          </p>
        </div>
      )}
      <div className="order-summary">
        <div className="order-summary__total">
          <span>{method === "card" ? "К оплате" : "При получении"}</span>
          <strong>{money(order.total)}</strong>
        </div>
        <button
          className="button button--wide"
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Подтверждаем…"
            : method === "card"
              ? `Оплатить ${money(order.total)}`
              : "Подтвердить заказ"}
        </button>
      </div>
    </form>
  );
}
