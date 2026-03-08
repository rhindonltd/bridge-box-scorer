import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function initDatabase(): Database.Database {
    // Ensure the 'data' folder exists
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    const dbFile = path.join(dataDir, "bridge.db");
    const schemaFile = path.join(process.cwd(), "db", "schema.sql");

    // Open database (creates file if missing)
    const db = new Database(dbFile);

    // Read schema SQL
    const schemaSQL = fs.readFileSync(schemaFile, "utf-8");

    // Execute schema
    db.exec(schemaSQL);

    console.log("Database initialized successfully");

    return db;
}
