import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  Coordinates,
  DeliveryDetails,
  GeocodedAddress,
  LocationConfig,
  LocationSelection,
} from "../types";
import { cities } from "../data/locations";
import {
  forwardGeocode,
  getLocationConfig,
  reverseGeocode,
} from "../services/location";
import AddressInput from "./AddressInput";
import AddressMap from "./AddressMap";
type Props = {
  address: string;
  details: DeliveryDetails;
  location: LocationSelection | null;
  onAddressChange: (value: string) => void;
  onDetailsChange: Dispatch<SetStateAction<DeliveryDetails>>;
  onChooseCity: () => void;
  error?: string;
  disabled: boolean;
};
export default function DeliveryAddress({
  address,
  details,
  location,
  onAddressChange,
  onDetailsChange,
  onChooseCity,
  error,
  disabled,
}: Props) {
  const [config, setConfig] = useState<LocationConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const city = cities.find((c) => c.id === location?.cityId);
  useEffect(() => {
    let active = true;
    getLocationConfig()
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch(() => {
        if (active) setConfigFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(
    () => () => {
      sequence.current++;
      controller.current?.abort();
    },
    [location?.cityId],
  );
  function invalidate() {
    sequence.current++;
    controller.current?.abort();
    setPending(false);
    setMessage("");
  }
  async function resolve(
    point?: Coordinates,
    query = address,
  ): Promise<boolean> {
    if (!city || disabled) return false;
    const id = ++sequence.current;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setMessage("");
    try {
      const result: GeocodedAddress = point
        ? await reverseGeocode(point, request.signal)
        : await forwardGeocode(query, city.id, request.signal);
      if (id !== sequence.current) return false;
      if (result.cityId !== city.id) {
        setMessage(
          "Этот адрес находится в другом городе. Измените город или укажите другой адрес.",
        );
        return false;
      }
      if (!["exact", "number", "near", "range"].includes(result.precision)) {
        setMessage("Не удалось определить дом. Уточните адрес вручную.");
        return false;
      }
      onAddressChange(result.address);
      onDetailsChange((previous) => ({
        ...previous,
        coordinates: result.coordinates,
        addressCityId: city.id,
      }));
      return true;
    } catch (error) {
      if (id === sequence.current)
        setMessage(
          error instanceof Error && error.name !== "AbortError"
            ? error.message
            : "Не удалось определить адрес. Введите его вручную.",
        );
      return false;
    } finally {
      if (id === sequence.current) setPending(false);
    }
  }
  return (
    <div className="delivery-address">
      <div className="checkout-city">
        <span>
          Город доставки: <strong>{city?.name ?? "не выбран"}</strong>
        </span>
        <button
          type="button"
          className="text-button"
          onClick={onChooseCity}
          disabled={disabled}
        >
          {city ? "Изменить город" : "Выбрать город"}
        </button>
      </div>
      <div className="field">
        <label htmlFor="address">Улица и дом</label>
        <AddressInput
          value={address}
          cityId={city?.id}
          enabled={!!config?.suggestions}
          disabled={disabled}
          invalid={!!error}
          onChange={(value) => {
            invalidate();
            onAddressChange(value);
            onDetailsChange((previous) => ({
              ...previous,
              coordinates: undefined,
              addressCityId: undefined,
            }));
          }}
          onChoose={(value) => {
            invalidate();
            onAddressChange(value);
            onDetailsChange((previous) => ({
              ...previous,
              coordinates: undefined,
              addressCityId: undefined,
            }));
            if (config?.geocoding) void resolve(undefined, value);
          }}
        />
        {error && (
          <p className="error" id="address-error">
            {error}
          </p>
        )}
      </div>
      {city && config?.geocoding && (
        <button
          type="button"
          className="text-button"
          disabled={disabled || pending || address.trim().length < 3}
          onClick={() => {
            void resolve();
          }}
        >
          Показать на карте
        </button>
      )}
      {pending && <p role="status">Определяем адрес…</p>}
      {message && (
        <p className="error" role="status">
          {message}
        </p>
      )}
      {city && config?.mapKey && config.geocoding ? (
        <AddressMap
          key={city.id}
          apiKey={config.mapKey}
          center={city.coordinates}
          selected={details.coordinates}
          onSelect={resolve}
        />
      ) : (
        <p className="map-unavailable" role="status">
          {!city
            ? "Выберите город, чтобы указать адрес на карте."
            : !config && !configFailed
              ? "Проверяем доступность карты…"
              : "Карта сейчас недоступна. Укажите улицу и дом вручную."}
        </p>
      )}
      <div className="delivery-details">
        {(["apartment", "entrance", "floor", "intercom"] as const).map(
          (key) => (
            <div className="field" key={key}>
              <label htmlFor={key}>
                {
                  {
                    apartment: "Квартира",
                    entrance: "Подъезд",
                    floor: "Этаж",
                    intercom: "Домофон",
                  }[key]
                }
              </label>
              <input
                id={key}
                autoComplete="off"
                maxLength={30}
                value={details[key]}
                disabled={disabled}
                onChange={(e) =>
                  onDetailsChange((previous) => ({
                    ...previous,
                    [key]: e.target.value,
                  }))
                }
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
