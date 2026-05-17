CREATE TABLE `boardplays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round_number` integer,
	`table_number` integer,
	`board_number` integer,
	`status` text
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
	`start_board` integer,
	`end_board` integer,
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
	`player1` integer,
	`player2` integer,
	FOREIGN KEY (`player1`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player2`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text,
	`last_name` text,
	`national_id` text
);
--> statement-breakpoint
CREATE TABLE `results` (
	`board_play_id` integer PRIMARY KEY NOT NULL,
	`result` text,
	FOREIGN KEY (`board_play_id`) REFERENCES `boardplays`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `startingpositions` (
	`table_number` integer,
	`direction` text,
	`player` integer,
	PRIMARY KEY(`table_number`, `direction`),
	FOREIGN KEY (`player`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
