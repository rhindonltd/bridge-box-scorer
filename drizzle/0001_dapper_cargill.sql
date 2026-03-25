ALTER TABLE `events` RENAME COLUMN "scoring_type" TO "event_type";--> statement-breakpoint
CREATE TABLE `movementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`ns` integer NOT NULL,
	`ew` integer NOT NULL,
	`board_start` integer NOT NULL,
	`board_end` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `movementtablespec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `movementspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`tables` integer NOT NULL,
	`boards` integer NOT NULL,
	`boards_per_round` integer NOT NULL,
	`rounds` integer NOT NULL,
	`missing_pair` integer
);
--> statement-breakpoint
CREATE TABLE `movementtablespec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movement_id` integer,
	`table_number` integer NOT NULL,
	FOREIGN KEY (`movement_id`) REFERENCES `movementspec`(`id`) ON UPDATE no action ON DELETE no action
);
