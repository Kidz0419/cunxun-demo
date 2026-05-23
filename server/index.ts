import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadServerEnv } from "./env.js";
import { createProductionApp } from "./productionApp.js";

await loadServerEnv(process.env.NODE_ENV ?? "production");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8787);
const distPath = path.resolve(__dirname, "../dist");
const app = createProductionApp(distPath);

app.listen(port, "0.0.0.0", () => {
  console.log(`Cunxun server running at http://localhost:${port}/`);
});
