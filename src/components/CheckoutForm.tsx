import {
  useState,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { IMaskInput } from "react-imask";
import DeliveryAddress from "./DeliveryAddress";
import type { DeliveryDetails, LocationSelection, Customer } from "../types";
import { validateCustomer, validateOrderDetails } from "../utils/validation";
import { money } from "../utils/cart";
type Props = {
  customer: Customer;
  onChange: Dispatch<SetStateAction<Customer>>;
  details: DeliveryDetails;
  onDetailsChange: Dispatch<SetStateAction<DeliveryDetails>>;
  location: LocationSelection | null;
  onChooseCity: () => void;
  locationNotice: string;
  onSubmit: () => void;
  pending: boolean;
  amount: number;
  onBack: () => void;
};
export default function CheckoutForm({
  customer,
  onChange,
  onSubmit,
  pending,
  amount,
  onBack,
  details,
  onDetailsChange,
  location,
  onChooseCity,
  locationNotice,
}: Props) {
  const [errors, setErrors] = useState<Partial<Customer>>({});
  const change = (key: keyof Customer, value: string) => {
    onChange((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found = validateCustomer(customer);
    const deliveryError = validateOrderDetails(
      details,
      location,
      customer.address,
    );
    if (deliveryError) found.address = deliveryError;
    setErrors(found);
    if (Object.keys(found).length) {
      event.currentTarget
        .querySelector<HTMLInputElement>(`[name="${Object.keys(found)[0]}"]`)
        ?.focus();
      return;
    }
    onSubmit();
  }
  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Оформление заказа"
      aria-busy={pending}
    >
      <button
        className="text-button"
        type="button"
        onClick={onBack}
        disabled={pending}
      >
        ← Вернуться в корзину
      </button>
      <p className="muted">Куда привезти пиццу? Заполните контактные данные.</p>
      <fieldset disabled={pending}>
        <legend className="sr-only">Контактные данные</legend>
        {(["name"] as const).map((key) => (
          <div className="field" key={key}>
            <label htmlFor={key}>
              {key === "name" ? "Ваше имя" : "Адрес доставки"}
            </label>
            <input
              id={key}
              name={key}
              autoComplete={key === "name" ? "given-name" : "street-address"}
              maxLength={60}
              required
              value={customer[key]}
              onChange={(event) => change(key, event.target.value)}
              aria-invalid={!!errors[key]}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
            />
            {errors[key] && (
              <p className="error" id={`${key}-error`}>
                {errors[key]}
              </p>
            )}
          </div>
        ))}
        {locationNotice && (
          <p className="location-message" role="status">
            {locationNotice}
          </p>
        )}
        <DeliveryAddress
          key={location?.cityId ?? "none"}
          address={customer.address}
          details={details}
          location={location}
          onAddressChange={(value) => change("address", value)}
          onDetailsChange={onDetailsChange}
          onChooseCity={onChooseCity}
          error={errors.address}
          disabled={pending}
        />
        <div className="field">
          <label htmlFor="phone">Телефон</label>
          <IMaskInput
            id="phone"
            name="phone"
            type="text"
            inputMode="tel"
            autoComplete="tel"
            mask="+{7} (000) 000-00-00"
            value={customer.phone}
            lazy={false}
            prepare={(value) => {
              const digits = value.replace(/\D/g, "");
              return digits.length === 11 && digits.startsWith("8")
                ? digits.slice(1)
                : value;
            }}
            onAccept={(value: string) => change("phone", value)}
            required
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p className="error" id="phone-error">
              {errors.phone}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="order-comment">
            Комментарий к заказу <span className="muted">(необязательно)</span>
          </label>
          <textarea
            id="order-comment"
            maxLength={500}
            rows={3}
            value={details.comment}
            onChange={(e) =>
              onDetailsChange((previous) => ({
                ...previous,
                comment: e.target.value,
              }))
            }
            placeholder="Например: не звонить в дверь"
          />
          <small className="muted">{details.comment.length}/500</small>
        </div>
        <div className="order-summary">
          <div>
            <span>Доставка</span>
            <strong>Бесплатно</strong>
          </div>
          <div className="order-summary__total">
            <span>К оплате</span>
            <strong>{money(amount)}</strong>
          </div>
          <button
            className="button button--wide"
            disabled={pending}
            type="submit"
          >
            {pending ? "Подготавливаем заказ…" : "Перейти к оплате"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </fieldset>
    </form>
  );
}
