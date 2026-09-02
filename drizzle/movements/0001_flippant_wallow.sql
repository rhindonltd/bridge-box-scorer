PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pairmovementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`board_set` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `pairmovementtablespec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_pairmovementroundspec`("id", "table_id", "round_number", "ns", "ew", "board_set") SELECT "id", "table_id", "round_number", "ns", "ew", (("board_start" - 1) / ("board_end" - "board_start" + 1)) + 1 FROM `pairmovementroundspec`;--> statement-breakpoint
DROP TABLE `pairmovementroundspec`;--> statement-breakpoint
ALTER TABLE `__new_pairmovementroundspec` RENAME TO `pairmovementroundspec`;--> statement-breakpoint
CREATE TABLE `__new_teammovementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`board_set` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `teammovementtablespec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_teammovementroundspec`("id", "table_id", "round_number", "ns", "ew", "board_set") SELECT "id", "table_id", "round_number", "ns", "ew", (("board_start" - 1) / ("board_end" - "board_start" + 1)) + 1 FROM `teammovementroundspec`;--> statement-breakpoint
DROP TABLE `teammovementroundspec`;--> statement-breakpoint
ALTER TABLE `__new_teammovementroundspec` RENAME TO `teammovementroundspec`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
