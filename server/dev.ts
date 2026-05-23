import { createServer as createViteServer } from "vite";
import { createApp } from "./app.js";
import { loadServerEnv } from "./env.js";

await loadServerEnv();
const port = Number(process.env.PORT ?? 5173);
const hmrPort = Number(process.env.VITE_HMR_PORT ?? port + 20000);
const app = createApp();
const vite = await createViteServer({
  appType: "spa",
  server: {
    middlewareMode: true,
    hmr: {
      port: hmrPort
    }
  }
});

app.use(vite.middlewares);

app.listen(port, "0.0.0.0", () => {
  console.log(`Cunxun H5 + API running at http://localhost:${port}/`);
});
