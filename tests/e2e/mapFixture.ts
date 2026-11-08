import type { Page } from "@playwright/test";
export async function installMap(page: Page) {
  await page
    .context()
    .route("**/api/location/config", (route) =>
      route.fulfill({ json: { mapKey: "test-public-key", geocoding: true } }),
    );
  await page.addInitScript(() => {
    class Base {
      props: Record<string, unknown>;
      constructor(props: Record<string, unknown> = {}) {
        this.props = props;
      }
      update(props: Record<string, unknown>) {
        Object.assign(this.props, props);
      }
    }
    class Marker extends Base {
      element: HTMLElement;
      constructor(props: Record<string, unknown>, element: HTMLElement) {
        super(props);
        this.element = element;
      }
    }
    class Listener extends Base {}
    class Map extends Base {
      element: HTMLElement;
      children: Base[] = [];
      click: (event: Event) => void;
      drag: (event: Event) => void;
      constructor(element: HTMLElement, props: Record<string, unknown>) {
        super(props);
        this.element = element;
        this.element.dataset.sdk = "test";
        this.click = (event) => {
          const coordinates = (event as CustomEvent).detail ?? [37.61, 55.75];
          const listener = this.children.find(
            (child) => child instanceof Listener,
          );
          const handler = listener?.props.onClick as
            ((o: unknown, e: { coordinates: number[] }) => void) | undefined;
          handler?.(undefined, { coordinates });
        };
        this.drag = (event) => {
          const marker = this.children.find((child) => child instanceof Marker);
          const handler = marker?.props.onDragEnd as
            ((point: number[]) => void) | undefined;
          handler?.((event as CustomEvent).detail);
        };
        window.addEventListener("test-map-click", this.click);
        window.addEventListener("test-map-drag", this.drag);
        element.onclick = (event) => {
          if (event.target === element)
            this.click(
              new CustomEvent("test-map-click", { detail: [37.61, 55.75] }),
            );
        };
      }
      addChild(child: Base) {
        this.children.push(child);
        if (child instanceof Marker) this.element.append(child.element);
        return this;
      }
      removeChild(child: Base) {
        this.children = this.children.filter((value) => value !== child);
        if (child instanceof Marker) child.element.remove();
        return this;
      }
      destroy() {
        window.removeEventListener("test-map-click", this.click);
        window.removeEventListener("test-map-drag", this.drag);
        this.element.replaceChildren();
      }
    }
    Object.defineProperty(window, "ymaps3", {
      value: {
        ready: Promise.resolve(),
        YMap: Map,
        YMapDefaultSchemeLayer: Base,
        YMapDefaultFeaturesLayer: Base,
        YMapMarker: Marker,
        YMapListener: Listener,
      },
      configurable: true,
    });
  });
}
export const addressResult = (
  address = "Москва, Тестовая улица, 1",
  lat = 55.75,
  lng = 37.61,
  cityId: string | undefined = "moscow",
) => ({
  address,
  cityName: cityId === "kazan" ? "Казань" : "Москва",
  cityId,
  coordinates: { lat, lng },
  precision: "exact",
});
export async function seedMoscow(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "pizza-location-v1",
      JSON.stringify({ cityId: "moscow", restaurantId: "moscow-center" }),
    ),
  );
}
export async function openCheckout(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "В корзину: Мясная Делюкс", exact: true })
    .click();
  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  await page
    .getByRole("button", { name: "Оформить заказ", exact: true })
    .click();
}
