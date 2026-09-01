import next from "next";
import { createServer } from "http";
import { startSocketServer } from "@/socket/websocket"; // ensures DB is initialized

const port = Number(process.env.PORT) || 3000;
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

  server.listen(port, () => {
    console.log(`Next.js + Socket.IO server running on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
