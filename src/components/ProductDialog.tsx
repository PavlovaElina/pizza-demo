import { useEffect, useRef, useState } from "react";
import type { PizzaOptions, Product } from "../types";
import { doughTypes, pizzaSizes, toppings } from "../data/pizzaOptions";
import { money, unitPrice } from "../utils/cart";
type Props = {
  product: Product;
  initialOptions: PizzaOptions;
  onAdd: (options: PizzaOptions) => string | void;
  submitLabel?: string;
  quantity?: number;
  onClose: () => void;
};
export default function ProductDialog({
  product,
  initialOptions,
  onAdd,
  onClose,
  submitLabel = "Добавить в корзину",
  quantity,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<PizzaOptions>({
    ...initialOptions,
    toppings: [...initialOptions.toppings],
    excludedIngredients: [...initialOptions.excludedIngredients],
  });
  const [error, setError] = useState("");
  const [extra, setExtra] = useState(initialOptions.toppings.length > 0);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="product-dialog order-dialog"
      aria-labelledby="product-dialog-title"
      onClose={() => {
        if (!dialog.current?.open) onClose();
      }}
    >
      <div className="order-dialog__header">
        <div>
          <p className="eyebrow">Соберите любимую</p>
          <h2 id="product-dialog-title">{product.name}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Закрыть настройки пиццы"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div className="product-dialog__body">
        <img
          className="product-dialog__image"
          src={`${import.meta.env.BASE_URL}${product.image}`}
          alt={product.name}
          width="300"
          height="220"
        />
        <div className="product-dialog__ingredients">
          <h3>Состав</h3>
          <p>Уберите то, что не хотите добавлять. Тесто остаётся основой.</p>
          <fieldset className="ingredient-list">
            <legend className="sr-only">Ингредиенты рецепта</legend>
            {product.ingredients.map((ingredient) => (
              <label
                key={ingredient.id}
                className={
                  options.excludedIngredients.includes(ingredient.id)
                    ? "ingredient--excluded"
                    : ""
                }
              >
                <input
                  type="checkbox"
                  checked={!options.excludedIngredients.includes(ingredient.id)}
                  aria-label={ingredient.name + " в составе"}
                  onChange={(event) =>
                    setOptions({
                      ...options,
                      excludedIngredients: event.target.checked
                        ? options.excludedIngredients.filter(
                            (id) => id !== ingredient.id,
                          )
                        : [...options.excludedIngredients, ingredient.id],
                      toppings: event.target.checked
                        ? options.toppings
                        : options.toppings.filter((id) => id !== ingredient.id),
                    })
                  }
                />
                {ingredient.name}
              </label>
            ))}
          </fieldset>
          <p className="allergy-note">
            Исключение из рецепта не гарантирует отсутствия следов ингредиента.
            При аллергии уточните возможность приготовления у пиццерии.
          </p>
        </div>
        <fieldset className="option-group">
          <legend>Размер</legend>
          <div className="segmented">
            {pizzaSizes.map((size) => (
              <label key={size.value}>
                <input
                  type="radio"
                  name="pizza-size"
                  value={size.value}
                  checked={options.size === size.value}
                  onChange={() => setOptions({ ...options, size: size.value })}
                />
                <span>{size.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="option-group">
          <legend>Тесто</legend>
          <div className="segmented">
            {doughTypes.map((dough) => (
              <label key={dough.value}>
                <input
                  type="radio"
                  name="pizza-dough"
                  checked={options.dough === dough.value}
                  onChange={() =>
                    setOptions({ ...options, dough: dough.value })
                  }
                />
                <span>{dough.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="topping-switch">
          <label>
            <input
              type="checkbox"
              checked={extra}
              aria-controls="extra-toppings"
              aria-expanded={extra}
              onChange={(event) => {
                setExtra(event.target.checked);
                if (!event.target.checked)
                  setOptions({ ...options, toppings: [] });
              }}
            />
            <span>Добавить начинку</span>
          </label>
          <p>Ещё немного того, что вы любите.</p>
        </div>
        {extra && (
          <fieldset id="extra-toppings" className="topping-options">
            <legend className="sr-only">Дополнительные ингредиенты</legend>
            {toppings.map((topping) => (
              <label key={topping.id}>
                <input
                  type="checkbox"
                  checked={options.toppings.includes(topping.id)}
                  disabled={options.excludedIngredients.includes(topping.id)}
                  onChange={(event) =>
                    setOptions({
                      ...options,
                      toppings: event.target.checked
                        ? [...options.toppings, topping.id]
                        : options.toppings.filter((id) => id !== topping.id),
                    })
                  }
                />
                <span>{topping.name}</span>
                <strong>+{money(topping.price)}</strong>
              </label>
            ))}
          </fieldset>
        )}
        <div className="product-dialog__footer">
          <p>
            Ваша пицца{" "}
            <strong aria-live="polite">
              {money(unitPrice(product, options))}
            </strong>
          </p>
          {quantity && (
            <p className="muted">
              Изменения применятся ко всем {quantity} шт. этой позиции.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button--wide"
            onClick={() => {
              const message = onAdd(options);
              if (message) {
                setError(message);
                return;
              }
              dialog.current?.close();
            }}
          >
            {submitLabel} <span aria-hidden="true">→</span>
          </button>
          {quantity && (
            <button
              className="text-button"
              onClick={() => dialog.current?.close()}
            >
              Отменить изменения
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
