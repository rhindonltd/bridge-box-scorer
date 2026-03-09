import {Server} from "socket.io";
import {getSession} from "@/server/auth/sessions";
import http from "http";
import db from "@/db";

export function startSocketServer(server: http.Server) {
    const io = new Server(server, {
        cors: { origin: "*" }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        console.log("token: ", token);
        const session = getSession(token);
        socket.data.isDirector = session?.director || false;
        next();
    });

    io.on("connection", (socket) => {
        console.log("client connected", socket.id);

        socket.on("joinTable", (tableId) => {
            socket.join(`table:${tableId}`);
        });

        // DIRECTOR EVENTS
        socket.on("director:startSession", () => {
            console.log("start session");
            if (!socket.data.isDirector) {
                console.log("not director");
                return
            }
            console.log("director");
            db.prepare(`
                INSERT OR REPLACE INTO settings (setting_key, setting_value)
                VALUES ('session_started','true')
              `).run()
            io.emit("session:started")
        })

        socket.on("director:startRound", () => {
            if (!socket.data.isDirector) {
                console.log("Unauthorized director event");
                return;
            }
            console.log("Director started round");
            io.emit("roundStarted");
        });
    });

    return io;
}
