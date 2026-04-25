CREATE TABLE `individualmovementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`n` text NOT NULL,
	`s` text NOT NULL,
	`e` text NOT NULL,
	`w` text NOT NULL,
	`board_start` integer NOT NULL,
	`board_end` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `individualmovementtablespec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `individualmovementspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`tables` integer NOT NULL,
	`boards` integer NOT NULL,
	`boards_per_round` integer NOT NULL,
	`rounds` integer NOT NULL,
	`missing_player` integer
);
--> statement-breakpoint
CREATE TABLE `individualmovementtablespec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movement_id` integer,
	`table_number` integer NOT NULL,
	FOREIGN KEY (`movement_id`) REFERENCES `individualmovementspec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pairmovementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`board_start` integer NOT NULL,
	`board_end` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `pairmovementtablespec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pairmovementspec` (
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
CREATE TABLE `pairmovementtablespec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movement_id` integer,
	`table_number` integer NOT NULL,
	FOREIGN KEY (`movement_id`) REFERENCES `pairmovementspec`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teammovementroundspec` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`round_number` integer NOT NULL,
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`board_start` integer NOT NULL,
	`board_end` integer NOT NULL,
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
	`movement_id` integer,
	`table_number` integer NOT NULL,
	FOREIGN KEY (`movement_id`) REFERENCES `teammovementspec`(`id`) ON UPDATE no action ON DELETE no action
);
