import { useEffect, useRef } from "react";
export default function DeliverySection() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          section.current?.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section ref={section} id="delivery" className="section delivery">
      <div className="container delivery__layout">
        <div className="delivery__content">
          <p className="eyebrow">Из печи — к вашему столу</p>
          <h2>
            Хорошая пицца.
            <br />
            <span>Ничего лишнего.</span>
          </h2>
          <p className="delivery__intro">
            Вы выбираете любимые сочетания — мы берём на себя всё остальное.
          </p>
          <ol className="delivery__steps">
            <li>
              <span>01</span>
              <div>
                <h3>Соберите свою пиццу</h3>
                <p>
                  Выберите размер и тесто. Добавьте начинку, если хочется
                  большего.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Доставим горячей</h3>
                <p>Бережная упаковка сохранит вкус. Доставка — бесплатно.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Оплатите как удобно</h3>
                <p>
                  Картой онлайн или при получении. Сумма заказа известна
                  заранее.
                </p>
              </div>
            </li>
          </ol>
          <a className="button" href="#catalog">
            Выбрать пиццу <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="delivery__visual">
          <div className="delivery__halo" />
          <img
            src={`${import.meta.env.BASE_URL}assets/images/pizza-slice.png`}
            alt="Кусочек пиццы с томатами, оливками и зеленью"
            width="410"
            height="454"
            loading="lazy"
          />
          <div className="delivery__badge">
            <strong>0 ₽</strong>
            <span>за доставку</span>
          </div>
          <span className="delivery__caption">
            Больше вкуса
            <br />в каждом кусочке.
          </span>
        </div>
      </div>
    </section>
  );
}
