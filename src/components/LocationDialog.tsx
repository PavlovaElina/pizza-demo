import { useEffect, useRef, useState } from "react";
import { cities, restaurants } from "../data/locations";
import { reverseGeocode } from "../services/location";
import { distance } from "../utils/location";
import type { Coordinates, LocationSelection } from "../types";
type Props = {
  selection: LocationSelection | null;
  onSelect: (selection: LocationSelection) => void;
  onClose: () => void;
};
export default function LocationDialog({
  selection,
  onSelect,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const [query, setQuery] = useState("");
  const [cityId, setCityId] = useState(selection?.cityId ?? "");
  const [restaurantId, setRestaurantId] = useState(
    selection?.restaurantId ?? "",
  );
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    alive.current = true;
    const el = dialog.current;
    el?.showModal();
    return () => {
      alive.current = false;
      el?.close();
    };
  }, []);
  function selectCity(id: string) {
    generation.current++;
    setPending(false);
    setCityId(id);
    setRestaurantId(restaurants.find((r) => r.cityId === id)?.id ?? "");
    setMessage("");
  }
  function locate() {
    const token = ++generation.current;
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Геолокация недоступна. Выберите город вручную.");
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      async (result) => {
        if (!alive.current || token !== generation.current) return;
        try {
          const point = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
          };
          const address = await reverseGeocode(point);
          if (!alive.current || token !== generation.current) return;
          if (!address.cityId) {
            setMessage(
              "Пока работаем в Москве, Санкт-Петербурге и Казани. Выберите город вручную.",
            );
            return;
          }
          setPosition(point);
          setCityId(address.cityId);
          setRestaurantId(
            [...restaurants]
              .filter((r) => r.cityId === address.cityId)
              .sort(
                (a, b) =>
                  distance(point, a.coordinates) -
                  distance(point, b.coordinates),
              )[0].id,
          );
          setQuery("");
          setMessage(
            `Ваш город — ${address.cityName}? Подтвердите выбор ниже.`,
          );
        } catch (error) {
          if (alive.current && token === generation.current)
            setMessage(
              error instanceof Error
                ? error.message
                : "Не удалось определить город. Выберите его вручную.",
            );
        } finally {
          if (alive.current && token === generation.current) setPending(false);
        }
      },
      (error) => {
        if (alive.current && token === generation.current) {
          setPending(false);
          setMessage(
            error.code === 1
              ? "Доступ к геолокации не разрешён. Выберите город вручную."
              : "Не удалось определить местоположение. Выберите город вручную.",
          );
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }
  const branches = restaurants
    .filter((r) => r.cityId === cityId)
    .sort((a, b) =>
      position
        ? distance(position, a.coordinates) - distance(position, b.coordinates)
        : 0,
    );
  return (
    <dialog
      ref={dialog}
      className="order-dialog location-dialog"
      aria-labelledby="location-title"
      onClose={() => {
        if (!dialog.current?.open) onClose();
      }}
    >
      <div className="order-dialog__header">
        <div>
          <p className="eyebrow">Рядом с вами</p>
          <h2 id="location-title">Город и пиццерия</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Закрыть выбор города"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div className="order-dialog__body">
        <button
          className="button button--wide"
          onClick={locate}
          disabled={pending}
        >
          {pending ? "Определяем город…" : "Определить моё местоположение"}
        </button>
        <p className="muted location-consent">
          По вашему разрешению координаты будут переданы Яндексу, чтобы
          определить город. Мы их не сохраняем.
        </p>
        <div role="status">
          {message && <p className="location-message">{message}</p>}
        </div>
        <div className="field">
          <label htmlFor="city-search">Найти город</label>
          <input
            id="city-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Москва, Санкт-Петербург, Казань"
          />
        </div>
        <fieldset className="city-options">
          <legend>Выберите город</legend>
          {cities
            .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
            .map((city) => (
              <label key={city.id}>
                <input
                  type="radio"
                  name="city"
                  checked={cityId === city.id}
                  onChange={() => selectCity(city.id)}
                />
                {city.name}
              </label>
            ))}
          {!cities.some((c) =>
            c.name.toLowerCase().includes(query.toLowerCase()),
          ) && <p>Этот город пока не поддерживается.</p>}
        </fieldset>
        {cityId && (
          <fieldset className="branch-options">
            <legend>Пиццерии в городе</legend>
            {branches.map((branch) => (
              <label key={branch.id}>
                <input
                  type="radio"
                  name="restaurant"
                  checked={restaurantId === branch.id}
                  onChange={() => setRestaurantId(branch.id)}
                />
                <span>
                  <strong>{branch.name}</strong>
                  <small>
                    {branch.address}
                    {position
                      ? ` · ${distance(position, branch.coordinates).toFixed(1)} км`
                      : ""}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <button
          className="button button--wide"
          disabled={!cityId || !restaurantId || pending}
          onClick={() => {
            onSelect({ cityId, restaurantId });
            dialog.current?.close();
          }}
        >
          Подтвердить город и пиццерию
        </button>
      </div>
    </dialog>
  );
}
