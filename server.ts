import next from "next";
import { createServer } from "http";
import { startSocketServer } from "@/server/websocket"; // ensures DB is initialized

const port = 3000;
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

(async () => {
  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = startSocketServer(server);

  server.listen(port, () => {
    console.log(
      `Next.js + Socket.IO server running on http://localhost:${port}`,
    );
  });
})();
