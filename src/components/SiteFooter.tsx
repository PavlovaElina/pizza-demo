import { cities, restaurants } from "../data/locations";
import type { LocationSelection } from "../types";
export default function SiteFooter({
  location,
}: {
  location: LocationSelection | null;
}) {
  const city = cities.find((c) => c.id === location?.cityId);
  const branch = restaurants.find((r) => r.id === location?.restaurantId);
  return (
    <footer id="contacts" className="footer">
      <div className="container footer__grid">
        <div>
          <img
            src={`${import.meta.env.BASE_URL}assets/images/logo.png`}
            alt="Pizza Cheff"
            width="159"
            height="69"
            loading="lazy"
          />
          <p className="footer__tagline">
            Тесто с характером.
            <br />
            Пицца с любовью.
          </p>
          <small>© {new Date().getFullYear()} Pizza Cheff</small>
        </div>
        <div>
          <h2>Заходите в гости</h2>
          <address>
            {city?.name ?? "г. Пиццеград"},{" "}
            {branch?.address ?? "ул. Базиликовая, 12"}
            <br />
            Ежедневно, 10:00–23:00
          </address>
        </div>
        <div>
          <h2>Всегда на связи</h2>
          <p className="footer__phone">+7 (000) 123-45-67</p>
          <a href="mailto:hello@pizzacheff.example">hello@pizzacheff.example</a>
          <p className="footer__social">Пишите нам — мы любим общаться.</p>
        </div>
        <a className="nav-link" href="#content">
          <span>Наверх ↑</span>
        </a>
      </div>
    </footer>
  );
}
