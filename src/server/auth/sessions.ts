import crypto from "crypto";
import db from "@/db"; // your SQLite connection

// 1️⃣ DB row type
type SessionRow = {
    token: string;
    director: number; // 0 or 1
};

// 2️⃣ Returned session type
export type DirectorSession = {
    director: boolean;
};

/**
 * Create a new director session and store it in the database
 */
export function createDirectorSession(): string {
    const token = crypto.randomUUID();

    // Insert into DB
    db.prepare(`
    INSERT INTO sessions (token, director)
    VALUES (?, ?)
  `).run(token, 1); // 1 = director

    return token;
}

/**
 * Get a session by token
 */
export function getSession(token: string | undefined): DirectorSession | null {
    if (!token) return null;

    // Tell TS the returned row type
    const row = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token) as SessionRow | undefined;
    if (!row) return null;

    return {
        director: !!row.director, // convert 0/1 to boolean
    };
}

/**
 * Optional: delete session (logout)
 */
export function deleteSession(token: string) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}