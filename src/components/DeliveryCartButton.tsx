import { useEffect, useRef } from "react";
import { money } from "../utils/cart";

export default function DeliveryCartButton({
  count,
  amount,
  onOpenCart,
}: {
  count: number;
  amount: number;
  onOpenCart: () => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!anchor.current || !bar.current) return;
      anchor.current.style.setProperty(
        "--cart-bar-height",
        `${bar.current.getBoundingClientRect().height}px`,
      );
      bar.current.classList.toggle(
        "is-docked",
        anchor.current.getBoundingClientRect().bottom <= window.innerHeight,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    if (anchor.current) observer.observe(anchor.current);
    if (bar.current) observer.observe(bar.current);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [count]);
  return (
    <div
      ref={anchor}
      className={`delivery__cart-anchor${count === 0 ? " is-empty" : ""}`}
    >
      <div ref={bar} className="delivery-cart-bar">
        <button className="button" onClick={onOpenCart}>
          <span>
            Перейти в корзину <span className="cart-count">{count}</span>
          </span>
          <strong>{money(amount)} →</strong>
        </button>
      </div>
    </div>
  );
}
