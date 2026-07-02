CREATE TABLE `assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`initial_seat` text
);
--> statement-breakpoint
CREATE TABLE `boards` (
	`round_number` integer,
	`table_number` integer,
	`board_number` integer,
	`n` text,
	`s` text,
	`e` text,
	`w` text,
	`status` text,
	PRIMARY KEY(`round_number`, `table_number`, `board_number`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participant` (
	`initial_seat` text PRIMARY KEY NOT NULL,
	`player` integer NOT NULL,
	`secret_key` text NOT NULL,
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
