import path from "node:path";
import express from "express";
import { createApp } from "./app.js";

export function createProductionApp(distPath: string) {
  const app = createApp();

  app.use(express.static(distPath));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }

    response.sendFile(path.join(distPath, "index.html"));
  });

  return app;
}
