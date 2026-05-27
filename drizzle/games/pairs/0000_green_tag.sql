CREATE TABLE `boardplays` (
	`round_number` integer,
	`table_number` integer,
	`board_number` integer,
	`status` text,
	PRIMARY KEY(`round_number`, `table_number`, `board_number`)
);
--> statement-breakpoint
CREATE TABLE `initialseat` (
	`table_number` integer NOT NULL,
	`direction` text NOT NULL,
	`player` integer NOT NULL,
	PRIMARY KEY(`table_number`, `direction`),
	FOREIGN KEY (`player`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
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
	`ns` text,
	`ew` text,
	`board_start` integer,
	`board_end` integer,
	PRIMARY KEY(`round_number`, `table_number`)
);
--> statement-breakpoint
CREATE TABLE `playermovementmap` (
	`id` text PRIMARY KEY NOT NULL,
	`pair` integer,
	FOREIGN KEY (`pair`) REFERENCES `pairs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player1` integer NOT NULL,
	`player2` integer NOT NULL,
	FOREIGN KEY (`player1`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player2`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pairs_player1_player2_unique` ON `pairs` (`player1`,`player2`);--> statement-breakpoint
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
