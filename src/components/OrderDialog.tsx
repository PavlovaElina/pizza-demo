import { emptyDelivery } from "../types";
import LocationDialog from "./LocationDialog";
import type { DeliveryDetails, LocationSelection } from "../types";
import { useEffect, useRef, useState, type Dispatch } from "react";
import type {
  CartItem,
  Customer,
  Order,
  Product,
  PaymentMethod,
  Payment,
} from "../types";
import { type CartAction, money, total } from "../utils/cart";
import { createOrder, payOrder } from "../services/api";
import CartPanel from "./CartPanel";
import CheckoutForm from "./CheckoutForm";
import PaymentPanel from "./PaymentPanel";
type Step = "cart" | "checkout" | "payment" | "success";
type Props = {
  location: LocationSelection | null;
  onLocationSelect: (selection: LocationSelection) => void;
  items: CartItem[];
  products: Product[];
  dispatch: Dispatch<CartAction>;
  onClose: () => void;
  onContinue: () => void;
  storageError: boolean;
  catalogStatus: "loading" | "ready" | "error";
  onRetry: () => void;
};
const titles = {
  cart: "Ваша корзина",
  checkout: "Оформление заказа",
  payment: "Оплата заказа",
  success: "Заказ оплачен",
};
export default function OrderDialog({
  location,
  onLocationSelect,
  items,
  products,
  dispatch,
  onClose,
  onContinue,
  storageError,
  catalogStatus,
  onRetry,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const [step, setStep] = useState<Step>("cart");
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    address: "",
    phone: "",
  });
  const [details, setDetails] = useState<DeliveryDetails>(emptyDelivery);
  const [choosingCity, setChoosingCity] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  function selectLocation(value: LocationSelection) {
    if (value.cityId !== location?.cityId) {
      setCustomer((previous) => ({ ...previous, address: "" }));
      setDetails((previous) => ({
        ...previous,
        coordinates: undefined,
        addressCityId: undefined,
        apartment: "",
        entrance: "",
        floor: "",
        intercom: "",
      }));
      setLocationNotice("Город изменён. Укажите адрес доставки заново.");
    }
    onLocationSelect(value);
  }
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    heading.current?.focus();
    dialog.current?.scrollTo(0, 0);
  }, [step]);
  function go(next: Step) {
    setError("");
    setStep(next);
  }
  async function prepareOrder() {
    if (busy.current || !items.length) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      setOrder(await createOrder(items, customer, details, location!));
      go("payment");
    } catch {
      setError(
        "Не удалось оформить заказ. Корзина и введённые данные сохранены — попробуйте ещё раз.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function pay(method: PaymentMethod) {
    if (busy.current || !order) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await payOrder(order.id, method);
      setPayment(result);
      dispatch({ type: "clear" });
      setCustomer({ name: "", address: "", phone: "" });
      go("success");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Не удалось выполнить оплату. Попробуйте ещё раз.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <dialog
        ref={dialog}
        className="order-dialog"
        aria-labelledby="order-title"
        onCancel={(event) => {
          if (busy.current) event.preventDefault();
        }}
        onClose={() => {
          if (!dialog.current?.open) onClose();
        }}
      >
        <div className="order-dialog__header">
          <div>
            <p className="eyebrow">Pizza Cheff</p>
            <h2 id="order-title" ref={heading} tabIndex={-1}>
              {step === "success" && payment?.status === "pending"
                ? "Заказ оформлен"
                : titles[step]}
            </h2>
          </div>
          <button
            className="icon-button"
            disabled={pending}
            aria-label="Закрыть корзину"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        {step !== "success" && (
          <ol className="order-steps" aria-label="Этапы заказа">
            {(["cart", "checkout", "payment"] as const).map((item, index) => (
              <li key={item} aria-current={step === item ? "step" : undefined}>
                <span>{index + 1}</span>
                {
                  { cart: "Корзина", checkout: "Данные", payment: "Оплата" }[
                    item
                  ]
                }
              </li>
            ))}
          </ol>
        )}
        {storageError && (
          <p className="error" role="alert">
            Не удалось сохранить корзину в браузере. Не закрывайте страницу до
            завершения заказа.
          </p>
        )}
        <div className="order-dialog__body" aria-busy={pending}>
          {step === "cart" && catalogStatus === "loading" && (
            <p role="status">Загружаем меню…</p>
          )}
          {step === "cart" && catalogStatus === "error" && (
            <div role="alert">
              <p>Не удалось загрузить меню.</p>
              <button className="button" onClick={onRetry}>
                Повторить загрузку
              </button>
            </div>
          )}
          {step === "cart" && catalogStatus === "ready" && (
            <CartPanel
              items={items}
              products={products}
              dispatch={dispatch}
              onContinue={onContinue}
              onCheckout={() => go("checkout")}
            />
          )}{" "}
          {step === "checkout" && (
            <CheckoutForm
              details={details}
              onDetailsChange={setDetails}
              location={location}
              onChooseCity={() => setChoosingCity(true)}
              locationNotice={locationNotice}
              customer={customer}
              onChange={setCustomer}
              onSubmit={prepareOrder}
              pending={pending}
              amount={total(items, products)}
              onBack={() => go("cart")}
            />
          )}{" "}
          {step === "payment" && order && (
            <PaymentPanel
              order={order}
              pending={pending}
              onPay={pay}
              onBack={() => go("checkout")}
            />
          )}{" "}
          {step === "success" && order && (
            <div className="order-success">
              <div className="order-success__icon" aria-hidden="true">
                ✓
              </div>
              <h3>Спасибо за заказ!</h3>
              <p>
                Номер <strong>{order.id}</strong>
              </p>
              <p>
                {payment?.status === "pending"
                  ? "К оплате при получении: "
                  : "Оплачено: "}
                <strong>{money(order.total)}</strong>
              </p>
              <button className="button button--wide" onClick={onContinue}>
                Вернуться в меню
              </button>
            </div>
          )}
          <div role="alert">
            {error && <p className="error payment-error">{error}</p>}
          </div>
        </div>
      </dialog>
      {choosingCity && (
        <LocationDialog
          selection={location}
          onSelect={selectLocation}
          onClose={() => {
            setChoosingCity(false);
            requestAnimationFrame(() =>
              heading.current?.focus({ preventScroll: true }),
            );
          }}
        />
      )}
    </>
  );
}
