-- Recreate the stored teams movement tables that 0002 dropped: the teams
-- movement library (TSMovements.txt) is kept for teams games. 0002's removal
-- of the individual-movement tables stands.
CREATE TABLE `teammovementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`board_set` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `teammovementtablespec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teammovementspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`tables` integer NOT NULL,
	`boards` integer NOT NULL,
	`boards_per_round` integer NOT NULL,
	`rounds` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teammovementtablespec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movement_id` integer NOT NULL,
	`table_number` integer NOT NULL,
	FOREIGN KEY (`movement_id`) REFERENCES `teammovementspec`(`id`) ON UPDATE no action ON DELETE no action
);
