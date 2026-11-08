import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
async function start() {
  const { worker } = await import("./mocks/browser");
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: "bypass",
    quiet: true,
  });
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
start().catch(() => {
  document.getElementById("root")!.textContent =
    "Не удалось запустить демо. Откройте сайт через localhost или HTTPS и обновите страницу.";
});
