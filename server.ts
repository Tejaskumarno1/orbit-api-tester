import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import createApp from "./src/serverApp";

async function startServer() {
  const app = createApp();
  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const listenPort = Number(PORT);
  app.listen(listenPort, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${listenPort}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
