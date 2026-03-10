import {Server} from "socket.io";
import {getDirectorSession} from "@/server/auth/sessions";
import http from "http";
import db from "@/db";

export function startSocketServer(server: http.Server) {
    const io = new Server(server, {
        cors: { origin: "*" }
    });

    io.use((socket, next) => {
        socket.data.isDirector = getDirectorSession(socket.handshake.auth.token)?.director || false;
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

            const eventId = crypto.randomUUID();
            const sessionId = crypto.randomUUID();
            const sectionId = crypto.randomUUID();

            // EVENT
            db.prepare(`
                INSERT INTO events (id, event_name, event_date, director, scoring_type, created_at)
                VALUES ('${eventId}', '${event.event_name}', '${new Date().toISOString()}', '${event.director}', '${event.scoring_type}', '${new Date().toISOString()}')
            `).run()

            // SESSION
            db.prepare(`
                INSERT INTO sessions (id, event_id, session_name, started)
                VALUES ('${sessionId}', '${eventId}', '1', 0)
            `).run()

            // SECTION
            db.prepare(`
                INSERT INTO sections (id, session_id, section_name, movement_type, boards_per_round, rounds, bridge_tables)
                VALUES ('${sectionId}', '${sessionId}', 'A', 'Mitchell', 2, 12, 10)
            `).run()

            // PAIR
            db.prepare(`
                INSERT INTO pairs (section_id, pair_number, player1, player2, direction)
                VALUES ('${sectionId}', '1', '', '', 'NS')
            `).run()

            db.prepare(`
                INSERT INTO pairs (section_id, pair_number, player1, player2, direction)
                VALUES ('${sectionId}', '2', '', '', 'NS')
            `).run()

            db.prepare(`
                INSERT INTO pairs (section_id, pair_number, player1, player2, direction)
                VALUES ('${sectionId}', '1', '', '', 'EW')
            `).run()

            db.prepare(`
                INSERT INTO pairs (section_id, pair_number, player1, player2, direction)
                VALUES ('${sectionId}', '2', '', '', 'EW')
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
