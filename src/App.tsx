import { useEffect, useState } from "react";
import { readLocation } from "./utils/location";
import LocationDialog from "./components/LocationDialog";
import type { LocationSelection, Product } from "./types";
import { total } from "./utils/cart";
import { useCart } from "./hooks/useCart";
import { getProducts } from "./services/api";
import SiteHeader from "./components/SiteHeader";
import HeroSection from "./components/HeroSection";
import ProductCard from "./components/ProductCard";
import SiteFooter from "./components/SiteFooter";
import OrderDialog from "./components/OrderDialog";
import DeliverySection from "./components/DeliverySection";
export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [location, setLocation] = useState<LocationSelection | null>(
    readLocation,
  );
  const [locationOpen, setLocationOpen] = useState(false);
  const selectLocation = (value: LocationSelection) => {
    setLocation(value);
    try {
      localStorage.setItem("pizza-location-v1", JSON.stringify(value));
    } catch {
      /* Selection remains usable without storage. */
    }
  };
  const [cartOpen, setCartOpen] = useState(false);
  const { items, updateCart, storageError } = useCart();
  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (active) {
          setProducts(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const available = items.filter((i) =>
    products.some((p) => p.id === i.productId),
  );
  const count = available.reduce((sum, i) => sum + i.quantity, 0);
  const amount = total(available, products);
  const closeCart = () => {
    setCartOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(".header__cart")
        ?.focus({ preventScroll: true }),
    );
  };
  const continueShopping = () => {
    setCartOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("catalog")?.scrollIntoView();
      document.getElementById("catalog-title")?.focus({ preventScroll: true });
    });
  };
  return (
    <>
      <SiteHeader
        location={location}
        onChooseCity={() => setLocationOpen(true)}
        count={count}
        amount={amount}
        onOpenCart={() => setCartOpen(true)}
      />
      <main id="content">
        <HeroSection />
        <section id="catalog" className="section catalog">
          <div className="container">
            <p className="eyebrow">Приготовим любимую</p>
            <h2 id="catalog-title" tabIndex={-1}>
              Выберите свою пиццу
            </h2>
            <p className="muted">
              Любимые сочетания · три размера · пицца по вашему вкусу
            </p>
            {status === "loading" && <p role="status">Загружаем меню…</p>}
            {status === "error" && (
              <div role="alert">
                <p>Не удалось загрузить меню.</p>
                <button
                  className="button"
                  onClick={() => {
                    setStatus("loading");
                    setAttempt((a) => a + 1);
                  }}
                >
                  Повторить загрузку
                </button>
              </div>
            )}
            {status === "ready" && (
              <div className="products">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    items={available.filter((i) => i.productId === product.id)}
                    onAdd={(options) =>
                      updateCart({ type: "add", id: product.id, options })
                    }
                    onIncrease={(id) => updateCart({ type: "add", id })}
                    onDecrease={(id) => updateCart({ type: "decrease", id })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        {storageError && (
          <p className="container error" role="alert">
            Браузер запретил сохранение корзины. После закрытия страницы она
            может пропасть.
          </p>
        )}
        <DeliverySection
          count={count}
          amount={amount}
          onOpenCart={() => setCartOpen(true)}
        />
      </main>
      <SiteFooter location={location} />
      {locationOpen && (
        <LocationDialog
          selection={location}
          onSelect={selectLocation}
          onClose={() => setLocationOpen(false)}
        />
      )}
      {cartOpen && (
        <OrderDialog
          location={location}
          onLocationSelect={selectLocation}
          items={available}
          products={products}
          dispatch={updateCart}
          onClose={closeCart}
          onContinue={continueShopping}
          storageError={storageError}
          catalogStatus={status}
          onRetry={() => {
            setStatus("loading");
            setAttempt((a) => a + 1);
          }}
        />
      )}
    </>
  );
}
