import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * A section within a game. A large session is split into multiple sections,
 * each with its own table count and its own movement. All sections play the
 * same board numbers. Table numbers restart within each section, so seats are
 * only unique when qualified by their section (see `SectionedSeat`).
 *
 * The section letter (A, B, C, ...) is the primary key and is the prefix used
 * in section-qualified seats. `selectedMovement` is the per-section serialized
 * `SelectedMovement` (see src/model/selected-movement.ts), null until the
 * director has chosen a movement for that section.
 */
export const sections = sqliteTable("sections", {
  section: text("section").primaryKey(),
  label: text("label").notNull(),
  tables: integer("tables").notNull(),
  // JSON-encoded SelectedMovement tagged union, per section. Null until chosen.
  selectedMovement: text("selected_movement"),
  ordinal: integer("ordinal").notNull(),
});

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
