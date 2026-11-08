import { spawn } from "node:child_process";
const args = process.argv.slice(2);
const preview = args.includes("--preview");
const env = {
  ...process.env,
  LOCATION_PORT: process.env.LOCATION_PORT ?? (preview ? "3002" : "3001"),
};
const children = [
  spawn(
    process.execPath,
    ["--env-file-if-exists=.env.local", "server/index.ts"],
    { stdio: "inherit", env },
  ),
  spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      ...(preview ? ["preview"] : []),
      "--host",
      "127.0.0.1",
      ...args.filter((a) => a !== "--preview"),
    ],
    { stdio: "inherit", env },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("exit", (code) => stop(code ?? 1));
  child.on("error", () => stop(1));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
