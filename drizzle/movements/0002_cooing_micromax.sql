-- Drop the unused stored teams movements, and the individual-movement tables
-- the schema dropped earlier without a migration. Children go before parents,
-- because Drizzle runs migrations in a transaction where
-- `PRAGMA foreign_keys=OFF` has no effect.
--
-- The schema also made pairmovementtablespec.movement_id NOT NULL without a
-- migration. Rebuilding that table cannot pass the foreign-key check inside a
-- transaction (pairmovementroundspec points at it), so the column stays
-- nullable in the database. The seed always sets it.
DROP TABLE `individualmovementroundspec`;--> statement-breakpoint
DROP TABLE `individualmovementtablespec`;--> statement-breakpoint
DROP TABLE `individualmovementspec`;--> statement-breakpoint
DROP TABLE `teammovementroundspec`;--> statement-breakpoint
DROP TABLE `teammovementtablespec`;--> statement-breakpoint
DROP TABLE `teammovementspec`;
