import { useEffect, useId, useState } from "react";
import type { AddressSuggestion } from "../types";
import { getAddressSuggestions } from "../services/location";
type Props = {
  value: string;
  cityId?: string;
  enabled: boolean;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
  onChoose: (value: string) => void;
};
export default function AddressInput({
  value,
  cityId,
  enabled,
  disabled,
  invalid,
  onChange,
  onChoose,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (
      !enabled ||
      !cityId ||
      query.trim().length < 3 ||
      query !== value ||
      disabled
    )
      return;
    const controller = new AbortController();
    let live = true;
    const timer = setTimeout(() => {
      setStatus("Ищем адреса…");
      getAddressSuggestions(query, cityId, controller.signal)
        .then((result) => {
          if (live) {
            setItems(result);
            setActive(-1);
            setStatus(
              result.length
                ? ""
                : "Подходящих подсказок нет. Продолжите ввод вручную.",
            );
          }
        })
        .catch(() => {
          if (live) setStatus("Подсказки недоступны. Продолжите ввод вручную.");
        });
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value, cityId, enabled, disabled]);
  const visible =
    enabled && !disabled && open && query === value && items.length > 0;
  function choose(index: number) {
    if (disabled) return;
    const item = items[index];
    if (!item) return;
    setOpen(false);
    setQuery("");
    setItems([]);
    setStatus("");
    onChoose(item.address);
  }
  return (
    <div className="address-autocomplete">
      <input
        id="address"
        name="address"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!visible}
        aria-controls={visible ? `${id}-list` : undefined}
        aria-activedescendant={
          visible && active >= 0 ? `${id}-${active}` : undefined
        }
        autoComplete="off"
        maxLength={200}
        required
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={invalid ? "address-error" : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setItems([]);
          setActive(-1);
          setOpen(true);
          setStatus("");
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && visible) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            return;
          }
          if (!visible) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index <= 0 ? items.length - 1 : index - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(active);
          }
        }}
      />
      {visible && (
        <ul
          className="address-suggestions"
          id={`${id}-list`}
          role="listbox"
          aria-label="Подсказки адреса"
        >
          {items.map((item, index) => (
            <li
              key={item.address + index}
              id={`${id}-${index}`}
              role="option"
              aria-selected={active === index}
              onPointerDown={(e) => e.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <strong>{item.label}</strong>
              {item.description && <small>{item.description}</small>}
            </li>
          ))}
        </ul>
      )}
      {query === value && status && (
        <p role="status" className="muted address-suggest-status">
          {status}
        </p>
      )}
    </div>
  );
}
