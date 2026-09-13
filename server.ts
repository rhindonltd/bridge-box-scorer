import next from "next";
import { createServer } from "http";
import { startSocketServer, closeSocketServer } from "@/socket/websocket"; // ensures DB is initialized
import { closeAllDatabases } from "@/db/open-database";
import { logger } from "@/lib/log";

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
      logger.error({ err, url: req.url }, "Error handling request");
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  startSocketServer(server);

  server.on("error", (err) => {
    logger.fatal({ err }, "HTTP server error");
    process.exit(1);
  });

  server.listen(port, host, () => {
    logger.info({ host, port }, "Next.js + Socket.IO server listening");
  });

  /**
   * Graceful shutdown for `pm2 reload`, reboot and power-down. Stop accepting
   * new connections, close Socket.IO, then checkpoint the WAL and close every
   * open database so no half-written transaction or growing `-wal`/`-shm` file
   * is left behind. Idempotent and time-boxed so a stuck close can never wedge
   * the reload.
   */
  let shuttingDown = false;
  async function shutdown(signal: string, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down gracefully");

    // Hard cap: if something hangs, exit anyway so the supervisor can restart.
    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await closeSocketServer();
      closeAllDatabases();
      logger.info("Shutdown complete");
      clearTimeout(forceExit);
      process.exit(exitCode);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      clearTimeout(forceExit);
      process.exit(1);
    }
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // Last-resort process-level safety nets.
  //
  // uncaughtException: the process state is unknowable after an uncaught throw,
  // so log it and shut down cleanly (WAL checkpoint + close DBs) with a
  // non-zero exit. The systemd unit is expected to restart on failure
  // (Restart=on-failure); see docs/durability-and-operations.md.
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    // shutdown() force-exits after 10s if close hangs; pass a non-zero code so
    // the supervisor treats it as a failure and restarts.
    void shutdown("uncaughtException", 1);
  });

  // unhandledRejection: usually a single dropped async op (a transient DB write
  // during a broadcast/timer tick) rather than a corrupt process. Log and keep
  // serving — crashing the whole appliance mid-session would be worse. The
  // scheduler now catches its own transitions, so this is a genuine backstop.
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
