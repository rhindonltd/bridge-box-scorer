import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";

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
    port,

    /**
     * Create an additional client connection to the same server.
     * Useful for multi-client tests (e.g., director + player).
     */
    async addClient(): Promise<ClientSocket> {
      const newClient = Client(`http://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        newClient.on("connect", resolve);
        newClient.on("connect_error", reject);
      });
      return newClient;
    },

    async close() {
      client.disconnect();
      io.close();
      httpServer.close();
    },
  };
}
