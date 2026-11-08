import { useEffect, useState } from "react";
export const navigation = [
  { id: "catalog", label: "Пиццы" },
  { id: "delivery", label: "Доставка и оплата" },
  { id: "contacts", label: "Контакты" },
] as const;
export function useActiveSection() {
  const [active, setActive] = useState("");
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".header");
    let frame = 0;
    const measure = () => {
      frame = 0;
      const offset = (header?.getBoundingClientRect().height ?? 0) + 32;
      let current = "";
      for (const { id } of navigation) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= offset)
          current = id;
      }
      // The short footer cannot always reach the header; activate it at page end.
      if (
        window.scrollY > 0 &&
        Math.ceil(window.innerHeight + window.scrollY) >=
          document.documentElement.scrollHeight - 2
      )
        current = "contacts";
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${header?.getBoundingClientRect().height ?? 0}px`,
      );
      schedule();
    });
    if (header) resize.observe(header);
    resize.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return active;
}
