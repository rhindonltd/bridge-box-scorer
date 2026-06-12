import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const metadata = sqliteTable("metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Metadata = typeof metadata.$inferSelect;
