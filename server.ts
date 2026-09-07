import next from "next";
import { createServer } from "http";
import { startSocketServer, closeSocketServer } from "@/socket/websocket"; // ensures DB is initialized
import { closeAllDatabases } from "@/db/open-database";

// Port is configurable via env (matches what PM2 passes) and defaults to 3000.
const port = Number(process.env.PORT) || 3000;
// Bind all interfaces so the app is reachable over the appliance's WiFi hotspot,
// not just localhost. Overridable via HOST for unusual setups.
const host = process.env.HOST ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  startSocketServer(server);

  server.on("error", (err) => {
    console.error("HTTP server error:", err);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`Next.js + Socket.IO server running on http://${host}:${port}`);
  });

  /**
   * Graceful shutdown for `pm2 reload`, reboot and power-down. Stop accepting
   * new connections, close Socket.IO, then checkpoint the WAL and close every
   * open database so no half-written transaction or growing `-wal`/`-shm` file
   * is left behind. Idempotent and time-boxed so a stuck close can never wedge
   * the reload.
   */
  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down gracefully...`);

    // Hard cap: if something hangs, exit anyway so the supervisor can restart.
    const forceExit = setTimeout(() => {
      console.error("Graceful shutdown timed out, forcing exit.");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await closeSocketServer();
      closeAllDatabases();
      console.log("Shutdown complete.");
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      clearTimeout(forceExit);
      process.exit(1);
    }
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
