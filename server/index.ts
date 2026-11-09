import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { suggestAddresses } from "./suggest.ts";
import { geocode } from "./geocoder.ts";
import { cities } from "../src/data/locations.ts";
import { createRateLimit } from "./rateLimit.ts";
const port = Number(process.env.PORT ?? process.env.LOCATION_PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const browserKey = process.env.YANDEX_MAPS_API_KEY ?? "";
const geocoderKey = process.env.YANDEX_GEOCODER_API_KEY ?? "";
const suggestKey = process.env.YANDEX_SUGGEST_API_KEY ?? "";
const serveStatic = process.argv.includes("--serve");
const root = resolve("dist");
const checkRateLimit = createRateLimit();
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  const reply = (status: number, body: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  try {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname === "/api/location/config" && req.method === "GET") {
      reply(200, {
        mapKey: browserKey,
        geocoding: !!geocoderKey,
        suggestions: !!suggestKey,
      });
      return;
    }
    if (
      [
        "/api/location/geocode",
        "/api/location/reverse",
        "/api/location/suggest",
      ].includes(pathname) &&
      req.method === "POST"
    ) {
      const suggesting = pathname.endsWith("/suggest");
      if (suggesting ? !suggestKey : !geocoderKey) {
        reply(503, {
          message:
            "Карта и определение адреса пока не настроены. Введите адрес вручную.",
        });
        return;
      }
      const retryAfter = checkRateLimit();
      if (retryAfter) {
        res.setHeader("Retry-After", retryAfter);
        reply(429, {
          message:
            "Слишком много запросов. Попробуйте через минуту или введите адрес вручную.",
        });
        return;
      }
      let text = "";
      for await (const chunk of req) {
        text += chunk.toString();
        if (Buffer.byteLength(text) > 8192) {
          reply(413, { message: "Слишком большой запрос." });
          return;
        }
      }
      let body: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          throw new Error();
        body = parsed as typeof body;
      } catch {
        reply(400, { message: "Некорректный запрос." });
        return;
      }
      let query: string;
      if (pathname.endsWith("/reverse")) {
        const { lat, lng } = body;
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          Math.abs(lat) > 90 ||
          Math.abs(lng) > 180
        ) {
          reply(400, { message: "Некорректные координаты." });
          return;
        }
        query = `${lng},${lat}`;
      } else {
        if (
          typeof body.query !== "string" ||
          body.query.trim().length < 3 ||
          body.query.length > 200 ||
          typeof body.cityId !== "string" ||
          !cities.some((c) => c.id === body.cityId)
        ) {
          reply(400, { message: "Укажите город, улицу и дом." });
          return;
        }
        query = body.query.trim();
        const city = cities.find((c) => c.id === body.cityId)!;
        if (
          !cities.some((c) =>
            c.aliases.some((alias) => query.toLowerCase().includes(alias)),
          )
        )
          query = `${city.name}, ${query}`;
      }
      try {
        reply(
          200,
          suggesting
            ? await suggestAddresses(
                query,
                cities.find((c) => c.id === body.cityId)!,
                suggestKey,
              )
            : await geocode(query, geocoderKey),
        );
      } catch (error) {
        reply(502, {
          message:
            error instanceof Error
              ? error.message
              : "Не удалось определить адрес. Введите его вручную.",
        });
      }
      return;
    }
    if (pathname.startsWith("/api/")) {
      reply(404, { message: "Метод не найден." });
      return;
    }
    if (!serveStatic) {
      reply(404, { message: "Not found" });
      return;
    }
    const file = resolve(
      root,
      "." + decodeURIComponent(pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + "/")) {
      reply(403, { message: "Forbidden" });
      return;
    }
    try {
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch {
      reply(404, { message: "Not found" });
    }
  } catch {
    if (!res.headersSent)
      reply(500, { message: "Сервис временно недоступен." });
    else res.end();
  }
});
server.listen(port, host, () =>
  console.log(`Location API: http://${host}:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
