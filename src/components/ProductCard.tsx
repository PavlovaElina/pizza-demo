import { useState } from "react";
import { createPortal } from "react-dom";
import type { CartItem, PizzaOptions, Product } from "../types";
import { defaultOptions } from "../data/pizzaOptions";
import { describeOptions, money, unitPrice, variantId } from "../utils/cart";
import QuantityControl from "./QuantityControl";
import ProductDialog from "./ProductDialog";
type Props = {
  product: Product;
  items: CartItem[];
  onAdd: (options: PizzaOptions) => void;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
};
export default function ProductCard({
  product,
  items,
  onAdd,
  onIncrease,
  onDecrease,
}: Props) {
  const [selected, setSelected] = useState<PizzaOptions>(
    () => items[0] ?? defaultOptions,
  );
  const [open, setOpen] = useState(false);
  const id = variantId(product.id, selected);
  const quantity = items.find((i) => i.id === id)?.quantity ?? 0;
  const otherQuantity = items
    .filter((i) => i.id !== id)
    .reduce((sum, i) => sum + i.quantity, 0);
  return (
    <article className={`product${quantity ? " product--selected" : ""}`}>
      <div className="product__image">
        <img
          src={`${import.meta.env.BASE_URL}${product.image}`}
          alt={product.name}
          width="240"
          height="180"
          loading="lazy"
        />
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <button
        className="text-button product__configure"
        onClick={() => setOpen(true)}
        aria-label={`Состав и настройки: ${product.name}`}
      >
        Состав и настройки <span aria-hidden="true">↗</span>
      </button>
      <div className="product__bottom">
        <span className="product__variant">{describeOptions(selected)}</span>
        <strong>{money(unitPrice(product, selected))}</strong>
        <div className="product__actions">
          {quantity ? (
            <>
              <span className="product__in-cart">
                В корзине · {quantity} шт.
              </span>
              <QuantityControl
                name={product.name}
                quantity={quantity}
                onIncrease={() => onIncrease(id)}
                onDecrease={() => onDecrease(id)}
              />
            </>
          ) : (
            <button
              className="button"
              onClick={() => onAdd(selected)}
              aria-label={`В корзину: ${product.name}`}
            >
              В корзину
            </button>
          )}
        </div>
        {otherQuantity > 0 && (
          <span className="product__other">
            Другие варианты в корзине: {otherQuantity} шт.
          </span>
        )}
      </div>
      {open &&
        createPortal(
          <ProductDialog
            product={product}
            initialOptions={selected}
            onClose={() => setOpen(false)}
            onAdd={(options) => {
              setSelected(options);
              onAdd(options);
            }}
          />,
          document.body,
        )}
    </article>
  );
}
