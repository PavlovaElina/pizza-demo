import { cities, restaurants } from "../data/locations";
import type { LocationSelection } from "../types";
import { useRef, useState } from "react";
import { navigation, useActiveSection } from "../hooks/useActiveSection";
import { money } from "../utils/cart";
type Props = {
  count: number;
  amount: number;
  onOpenCart: () => void;
  location: LocationSelection | null;
  onChooseCity: () => void;
};
export default function SiteHeader({
  count,
  amount,
  onOpenCart,
  location,
  onChooseCity,
}: Props) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useActiveSection();
  const close = () => {
    dialog.current?.close();
    setOpen(false);
  };
  const links = navigation.map(({ id, label }) => (
    <a
      key={id}
      className="nav-link"
      data-label={label}
      aria-current={active === id ? "location" : undefined}
      href={`#${id}`}
      onClick={close}
    >
      <span>{label}</span>
    </a>
  ));
  return (
    <>
      <a className="skip-link" href="#content">
        Перейти к содержимому
      </a>
      <header className="header">
        <div className="demo-bar">
          Учебный проект · заказы и оплата демонстрационные, деньги не
          списываются
        </div>
        <div className="container header__inner">
          <a href="#content" aria-label="Pizza Cheff — главная">
            <img
              src={`${import.meta.env.BASE_URL}assets/images/logo.png`}
              width="159"
              height="69"
              alt="Pizza Cheff"
            />
          </a>
          <button
            className="location-trigger"
            onClick={onChooseCity}
            aria-label={`${cities.find((c) => c.id === location?.cityId)?.name ?? "Выбрать город"} ${restaurants.find((r) => r.id === location?.restaurantId)?.address ?? "Найдём пиццерию рядом"}. Выбрать город и пиццерию`}
          >
            <span>
              {cities.find((c) => c.id === location?.cityId)?.name ??
                "Выбрать город"}{" "}
              <span aria-hidden="true">⌄</span>
            </span>
            <small>
              {restaurants.find((r) => r.id === location?.restaurantId)
                ?.address ?? "Найдём пиццерию рядом"}
            </small>
          </button>
          <nav className="desktop-nav" aria-label="Основная навигация">
            {links}
          </nav>
          <button
            className="button header__cart"
            onClick={onOpenCart}
            aria-label={`Корзина ${count}${count > 0 ? ` ${money(amount)}` : ""}. Открыть корзину`}
          >
            <span>
              Корзина <span className="cart-count">{count}</span>
            </span>
            {count > 0 && (
              <span className="header__cart-total">{money(amount)}</span>
            )}
          </button>
          <button
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => {
              dialog.current?.showModal();
              setOpen(true);
            }}
          >
            Меню ☰
          </button>
        </div>
      </header>
      <dialog
        aria-label="Навигация"
        id="mobile-menu"
        className="mobile-menu"
        ref={dialog}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <button className="button" onClick={close}>
          Закрыть меню
        </button>
        <nav aria-label="Мобильная навигация">{links}</nav>
      </dialog>
    </>
  );
}
