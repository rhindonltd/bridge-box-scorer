// db/index.ts
import { initDatabase } from "./initDatabase";
import Database from "better-sqlite3";

// singleton DB instance
const db: Database.Database = initDatabase();

export default db;
