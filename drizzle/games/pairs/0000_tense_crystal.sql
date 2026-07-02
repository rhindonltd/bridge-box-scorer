CREATE TABLE `assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`initial_seat` text
);
--> statement-breakpoint
CREATE TABLE `boardplays` (
	`round_number` integer,
	`table_number` integer,
	`board_number` integer,
	`status` text,
	PRIMARY KEY(`round_number`, `table_number`, `board_number`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
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
CREATE TABLE `participant` (
	`initial_seat` text PRIMARY KEY NOT NULL,
	`player1` integer NOT NULL,
	`player2` integer NOT NULL,
	`secret_key` text NOT NULL,
	FOREIGN KEY (`player1`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player2`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participant_player1_player2_unique` ON `participant` (`player1`,`player2`);--> statement-breakpoint
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
