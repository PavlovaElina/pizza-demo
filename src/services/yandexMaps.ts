import type { Coordinates } from "../types";
type Entity = { update: (props: Record<string, unknown>) => void };
export type MapInstance = Entity & {
  addChild: (entity: Entity) => MapInstance;
  removeChild: (entity: Entity) => MapInstance;
  destroy: () => void;
};
export type YandexSDK = {
  ready: Promise<void>;
  YMap: new (
    container: HTMLElement,
    props: Record<string, unknown>,
  ) => MapInstance;
  YMapDefaultSchemeLayer: new () => Entity;
  YMapDefaultFeaturesLayer: new () => Entity;
  YMapListener: new (props: {
    layer: string;
    onClick: (
      object: unknown,
      event: { coordinates: [number, number] },
    ) => void;
  }) => Entity;
  YMapMarker: new (
    props: {
      coordinates: [number, number];
      draggable: boolean;
      onDragEnd: (coordinates: [number, number]) => void;
    },
    element: HTMLElement,
  ) => Entity;
};
declare global {
  interface Window {
    ymaps3?: YandexSDK;
  }
}
let pending: Promise<YandexSDK> | undefined;
export function loadYandexMaps(key: string): Promise<YandexSDK> {
  if (window.ymaps3) return window.ymaps3.ready.then(() => window.ymaps3!);
  if (!pending)
    pending = new Promise<YandexSDK>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        pending = undefined;
        reject(new Error("Карта не загрузилась. Введите адрес вручную."));
      }, 10000);
      script.onload = () => {
        const sdk = window.ymaps3;
        if (!sdk) {
          clearTimeout(timer);
          pending = undefined;
          reject(new Error("Карта недоступна. Введите адрес вручную."));
          return;
        }
        sdk.ready.then(
          () => {
            clearTimeout(timer);
            resolve(sdk);
          },
          () => {
            clearTimeout(timer);
            pending = undefined;
            reject(new Error("Карта недоступна. Введите адрес вручную."));
          },
        );
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        pending = undefined;
        reject(new Error("Карта недоступна. Введите адрес вручную."));
      };
      document.head.append(script);
    });
  return pending;
}
export const lngLat = (point: Coordinates): [number, number] => [
  point.lng,
  point.lat,
];
