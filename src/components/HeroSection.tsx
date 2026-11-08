export default function HeroSection() {
  const asset = (name: string) =>
    `${import.meta.env.BASE_URL}assets/images/${name}`;
  return (
    <section className="hero section">
      <div className="container hero__grid">
        <div>
          <p className="eyebrow">Pizza Cheff · с любовью к деталям</p>
          <h1>
            Самая вкусная пицца в мире
            <br />
            <span>только в Pizza Cheff</span>
          </h1>
          <div className="advantages">
            {[
              [
                "dough.png",
                "Лучшее тесто",
                "Отборная мука и время, чтобы тесто стало идеальным.",
              ],
              [
                "chef.png",
                "Лучшие повара",
                "Готовим каждую пиццу с вниманием к деталям.",
              ],
              [
                "quality.png",
                "Качество ингредиентов",
                "Выбираем продукты, вкус которых любим сами.",
              ],
              [
                "recipes.png",
                "Любимые рецепты",
                "От классической сырной до мясной делюкс.",
              ],
            ].map(([image, title, text]) => (
              <div className="advantage" key={title}>
                <img src={asset(image)} alt="" width="60" height="60" />
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <a className="button" href="#catalog">
            Выбрать пиццу
          </a>
        </div>
        <img
          className="hero__image"
          src={asset("hero-pizza.png")}
          alt="Пицца Pizza Cheff с мясной начинкой"
          width="520"
          height="342"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
