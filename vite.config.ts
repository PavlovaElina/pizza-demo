import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const proxy = {
  "/api/location": {
    target: `http://127.0.0.1:${process.env.LOCATION_PORT ?? 3001}`,
    changeOrigin: true,
  },
};
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { proxy },
  preview: { proxy },
});
