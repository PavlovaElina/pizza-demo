import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "../types";
import {
  loadYandexMaps,
  lngLat,
  type MapInstance,
} from "../services/yandexMaps";
type Props = {
  apiKey: string;
  center: Coordinates;
  selected?: Coordinates;
  onSelect: (point: Coordinates) => Promise<boolean>;
};
export default function AddressMap({
  apiKey,
  center,
  selected,
  onSelect,
}: Props) {
  const { lat: centerLat, lng: centerLng } = center;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const zoom = useRef(12);
  const callback = useRef(onSelect);
  const latest = useRef(selected);
  const interaction = useRef(0);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    callback.current = onSelect;
    latest.current = selected;
  }, [onSelect, selected]);
  useEffect(() => {
    let active = true;
    let instance: MapInstance | undefined;
    let removeMarker: (() => void) | undefined;
    loadYandexMaps(apiKey)
      .then((sdk) => {
        if (!active || !container.current) return;
        instance = new sdk.YMap(container.current, {
          location: { center: [centerLng, centerLat], zoom: 12 },
          behaviors: ["drag", "pinchZoom", "scrollZoom", "dblClick"],
        });
        map.current = instance;
        zoom.current = 12;
        instance
          .addChild(new sdk.YMapDefaultSchemeLayer())
          .addChild(new sdk.YMapDefaultFeaturesLayer());
        let markerElement: HTMLButtonElement | undefined;
        let marker: InstanceType<typeof sdk.YMapMarker> | undefined;
        const setPoint = (point?: Coordinates) => {
          const focused = markerElement === document.activeElement;
          if (marker) {
            instance?.removeChild(marker);
            marker = undefined;
          }
          if (!point) return;
          const button = document.createElement("button");
          markerElement = button;
          button.type = "button";
          button.className = "delivery-marker";
          button.textContent = "●";
          button.setAttribute(
            "aria-label",
            "Точка доставки. Для перемещения используйте стрелки.",
          );
          button.onkeydown = (event) => {
            const offsets: Record<string, [number, number]> = {
              ArrowUp: [0.0002, 0],
              ArrowDown: [-0.0002, 0],
              ArrowLeft: [0, -0.0002],
              ArrowRight: [0, 0.0002],
            };
            const delta = offsets[event.key];
            if (!delta) return;
            event.preventDefault();
            const current = latest.current ?? point;
            void select({
              lat: current.lat + delta[0],
              lng: current.lng + delta[1],
            });
          };
          marker = new sdk.YMapMarker(
            {
              coordinates: lngLat(point),
              draggable: true,
              onDragEnd: ([lng, lat]) => {
                void select({ lat, lng });
              },
            },
            button,
          );
          instance?.addChild(marker);
          if (focused) button.focus({ preventScroll: true });
        };
        async function select(point: Coordinates) {
          const id = ++interaction.current;
          const accepted = await callback.current(point);
          if (active && id === interaction.current && !accepted)
            setPoint(latest.current);
        }
        instance.addChild(
          new sdk.YMapListener({
            layer: "any",
            onClick: (object, event) => {
              if (
                (object as { type?: string } | undefined)?.type !== "marker"
              ) {
                const [lng, lat] = event.coordinates;
                void select({ lat, lng });
              }
            },
          }),
        );
        // React communicates point updates through this scoped DOM event; no global map state.
        const update = () => {
          setPoint(latest.current);
          if (latest.current)
            instance?.update({
              location: { center: lngLat(latest.current), zoom: 15 },
            });
        };
        container.current.addEventListener("address-point-update", update);
        removeMarker = () =>
          container.current?.removeEventListener(
            "address-point-update",
            update,
          );
        update();
        setReady(true);
      })
      .catch(() => {
        if (active)
          setError("Карта не загрузилась. Вы можете указать адрес вручную.");
      });
    return () => {
      active = false;
      removeMarker?.();
      instance?.destroy();
      map.current = null;
    };
  }, [apiKey, centerLat, centerLng]);
  useEffect(() => {
    container.current?.dispatchEvent(new Event("address-point-update"));
  }, [selected, ready]);
  return (
    <div className="address-map">
      <div
        ref={container}
        className="address-map__canvas"
        role="region"
        aria-label="Карта выбора адреса доставки"
      />
      <div className="map-zoom">
        <button
          type="button"
          aria-label="Приблизить карту"
          onClick={() => {
            zoom.current = Math.min(19, zoom.current + 1);
            map.current?.update({ location: { zoom: zoom.current } });
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Отдалить карту"
          onClick={() => {
            zoom.current = Math.max(4, zoom.current - 1);
            map.current?.update({ location: { zoom: zoom.current } });
          }}
        >
          −
        </button>
      </div>
      {!ready && !error && (
        <p className="map-overlay" role="status">
          Загружаем карту…
        </p>
      )}
      {error && (
        <p className="map-overlay" role="status">
          {error}
        </p>
      )}
      <p className="muted">
        Нажмите на карту или переместите метку. Адрес можно ввести и вручную.
      </p>
    </div>
  );
}
