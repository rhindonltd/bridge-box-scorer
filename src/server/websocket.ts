import {Server} from "socket.io";
import {getDirectorSession} from "@/server/auth/sessions";
import http from "http";
import db from "@/db";

export function startSocketServer(server: http.Server) {
    const io = new Server(server, {
        cors: { origin: "*" }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        console.log("token: ", token);
        const session = getDirectorSession(token);
        socket.data.isDirector = session?.director || false;
        next();
    });

    io.on("connection", (socket) => {
        console.log("client connected", socket.id);

        // player:joinTable
        // player:submitScore
        // player:confirmScore
        // player:readyNextRound

        // director:startRound
        // director:endRound
        // director:adjustScore
        // director:skipBoard
        // director:endSession

        // event:created
        // table:scoreUpdate
        // table:boardComplete
        // round:started
        // round:ended
        // movement:update

        socket.on("joinTable", (tableId) => {
            socket.join(`table:${tableId}`);
        });

        // DIRECTOR EVENTS
        socket.on("director:createEvent", (event) => {
            if (!socket.data.isDirector) {
                return
            }

            console.log("Event: " + JSON.stringify(event))

            db.prepare(`
                INSERT INTO events (id, event_name, event_date, director, scoring_type, created_at)
                VALUES ('${crypto.randomUUID()}', '${event.event_name}', '${new Date().toISOString()}', '${event.director}', '${event.scoring_type}', '${new Date().toISOString()}')
            `).run()
            io.emit("event:created", event)
        });

        socket.on("director:startSession", () => {
            if (!socket.data.isDirector) {
                return
            }
            db.prepare(`
                INSERT OR REPLACE INTO settings (setting_key, setting_value)
                VALUES ('session_started','true')
              `).run()
            io.emit("session:started")
        });

        socket.on("director:startRound", () => {
            if (!socket.data.isDirector) {
                return;
            }
            io.emit("round:started");
        });
    });

    return io;
}
