import { Server } from "socket.io";
import http from "http";

export function startSocketServer(httpServer: http.Server) {
    const io = new Server(httpServer, {
        cors: { origin: "*" }, // allow connections from phones
    });

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on("joinTable", (tableId: number) => {
            socket.join(`table:${tableId}`);
            console.log(`Socket ${socket.id} joined table ${tableId}`);
        });

        socket.on("joinBoard", (boardNumber: number) => {
            socket.join(`board:${boardNumber}`);
        });

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    console.log("Socket.IO server started");
    return io;
}
