import { useState } from "react";
import { createPortal } from "react-dom";
import ProductDialog from "./ProductDialog";
import type { Dispatch } from "react";
import type { CartItem, Product } from "../types";
import {
  variantId,
  money,
  total,
  unitPrice,
  describeOptions,
  type CartAction,
} from "../utils/cart";
import QuantityControl from "./QuantityControl";
type Props = {
  items: CartItem[];
  products: Product[];
  dispatch: Dispatch<CartAction>;
  onContinue: () => void;
  onCheckout: () => void;
};
export default function CartPanel({
  items,
  products,
  dispatch,
  onContinue,
  onCheckout,
}: Props) {
  const [editing, setEditing] = useState<CartItem | null>(null);
  return (
    <div className="cart-panel">
      {!items.length ? (
        <div className="empty-cart">
          <span aria-hidden="true">○</span>
          <h3>Здесь будет ваша пицца</h3>
          <p>Выберите что-нибудь в меню — мы сохраним ваш выбор.</p>
          <button className="button" onClick={onContinue}>
            Выбрать пиццу
          </button>
        </div>
      ) : (
        <>
          <p className="muted">Проверьте выбранные размеры, тесто и начинки.</p>
          <ul className="cart__list">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return (
                <li key={item.id}>
                  <img
                    src={`${import.meta.env.BASE_URL}${product.image}`}
                    alt=""
                    width="100"
                    height="76"
                  />
                  <div className="cart__product">
                    <h3>{product.name}</h3>
                    <p className="muted">
                      {describeOptions(item)} ·{" "}
                      {money(unitPrice(product, item))} / шт.
                    </p>
                    <button
                      className="text-button"
                      aria-label={`Настроить: ${product.name}`}
                      onClick={() => setEditing(item)}
                    >
                      Настроить
                    </button>
                    <QuantityControl
                      name={
                        item.id === product.id
                          ? product.name
                          : `${product.name}, ${describeOptions(item)}`
                      }
                      quantity={item.quantity}
                      onIncrease={() => dispatch({ type: "add", id: item.id })}
                      onDecrease={() =>
                        dispatch({ type: "decrease", id: item.id })
                      }
                    />
                  </div>
                  <div className="cart__price">
                    <strong>
                      {money(unitPrice(product, item) * item.quantity)}
                    </strong>
                    <button
                      className="text-button"
                      onClick={() => dispatch({ type: "remove", id: item.id })}
                      aria-label={`Удалить: ${product.name}`}
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="text-button" onClick={onContinue}>
            ← Добавить ещё пиццу
          </button>
          <div className="order-summary">
            <div>
              <span>Доставка</span>
              <strong>Бесплатно</strong>
            </div>
            <div className="order-summary__total">
              <span>Итого</span>
              <strong>{money(total(items, products))}</strong>
            </div>
            <button className="button button--wide" onClick={onCheckout}>
              Оформить заказ <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      )}
      {editing &&
        createPortal(
          <ProductDialog
            product={products.find((p) => p.id === editing.productId)!}
            initialOptions={editing}
            quantity={editing.quantity}
            submitLabel="Сохранить изменения"
            onClose={() => {
              setEditing(null);
              requestAnimationFrame(() =>
                document
                  .getElementById("order-title")
                  ?.focus({ preventScroll: true }),
              );
            }}
            onAdd={(options) => {
              const target = items.find(
                (i) =>
                  i.id === variantId(editing.productId, options) &&
                  i.id !== editing.id,
              );
              if (target && target.quantity + editing.quantity > 99)
                return "В одной позиции может быть не больше 99 пицц. Уменьшите количество перед объединением.";
              dispatch({ type: "edit", id: editing.id, options });
              return undefined;
            }}
          />,
          document.body,
        )}
    </div>
  );
}
