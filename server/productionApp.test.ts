// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createProductionApp } from "./productionApp";

const servers: Array<{ close: (callback?: (error?: Error) => void) => void }> = [];
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
  tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

describe("production app", () => {
  it("serves the SPA index for nested client routes under Express 5", async () => {
    const distPath = fs.mkdtempSync(path.join(os.tmpdir(), "cunxun-dist-"));
    tempDirs.push(distPath);
    fs.writeFileSync(path.join(distPath, "index.html"), "<main>村寻生产包</main>");
    const app = createProductionApp(distPath);
    const server = app.listen(0);
    servers.push(server);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/studio`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("村寻生产包");
  });
});
