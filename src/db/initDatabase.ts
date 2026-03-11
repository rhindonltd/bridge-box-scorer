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

  // db.prepare(`-- INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES ('session_started','false')`).run()

  // const currentDate = new Date().toISOString()
  //
  // db.prepare(`INSERT OR REPLACE INTO events (id, event_name, event_date, director, scoring_type, created_at)
  //     VALUES ('773a2efd-0e87-484d-b52d-2dc7c09cdea3', 'Monday AM Pairs', '${currentDate}', 'Jacqui Collier', 'MP_PAIRS', '${currentDate}')`).run()
  //
  // db.prepare(`INSERT OR REPLACE INTO sessions (id, event_id, session_number)
  //     VALUES ('da012fe3-b84b-422d-b64a-3950d975e26b', '773a2efd-0e87-484d-b52d-2dc7c09cdea3')`).run()
  //
  // // , movement_type, boards_per_round, rounds // , 1, 'Mitchell', 2, 12
  // db.prepare(`INSERT OR REPLACE INTO sections (id, session_id, section_name, movement_type, boards_per_round, rounds, bridge_tables)
  //     VALUES ('351906a3-b7a9-4975-a004-c30239026e35', 'da012fe3-b84b-422d-b64a-3950d975e26b', 'A', 'Mitchell', 2, 12, 10)`).run()
  //
  //

  console.log("Database initialized successfully");

  return db;
}
