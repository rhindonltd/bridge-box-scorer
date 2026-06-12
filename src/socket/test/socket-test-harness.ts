import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

export async function createSocketTestServer(register: (io: Server) => void) {
  const httpServer = createServer();

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  register(io);

  await new Promise<void>((resolve) => {
    httpServer.listen(() => resolve());
  });

  const port = (httpServer.address() as any).port;

  const client = Client(`http://localhost:${port}`);

  await new Promise<void>((resolve, reject) => {
    client.on("connect", resolve);
    client.on("connect_error", reject);
  });

  return {
    io,
    client,
    httpServer,

    async close() {
      client.disconnect();
      io.close();
      httpServer.close();
    },
  };
}
