import next from "next";
import { createServer } from "http";
import { startSocketServer } from "@/socket/websocket"; // ensures DB is initialized

const port = 3000;
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

(async () => {
  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  startSocketServer(server);

  server.listen(port, () => {
    console.log(
      `Next.js + Socket.IO server running on http://localhost:${port}`,
    );
  });
})();
