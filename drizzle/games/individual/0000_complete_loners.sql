CREATE TABLE `boardplays` (
	`round_number` integer,
	`table_number` integer,
	`board_number` integer,
	`status` text,
	PRIMARY KEY(`round_number`, `table_number`, `board_number`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`movement_type` text NOT NULL,
	`boards_per_round` integer NOT NULL,
	`rounds` integer NOT NULL,
	`bridge_tables` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`round_number` integer,
	`table_number` integer,
	`n` text,
	`s` text,
	`e` text,
	`w` text,
	`board_start` integer,
	`board_end` integer,
	PRIMARY KEY(`round_number`, `table_number`)
);
--> statement-breakpoint
CREATE TABLE `playermovementmap` (
	`id` text PRIMARY KEY NOT NULL,
	`player` integer,
	FOREIGN KEY (`player`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`national_id` text
);
--> statement-breakpoint
CREATE TABLE `results` (
	`round_number` integer,
	`table_number` integer,
	`result` text,
	PRIMARY KEY(`round_number`, `table_number`)
);
--> statement-breakpoint
CREATE TABLE `startingpositions` (
	`table_number` integer NOT NULL,
	`direction` text NOT NULL,
	`player` integer NOT NULL,
	PRIMARY KEY(`table_number`, `direction`),
	FOREIGN KEY (`player`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
