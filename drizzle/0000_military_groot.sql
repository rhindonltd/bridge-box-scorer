CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`event_date` text NOT NULL,
	`director` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `individualmovements` (
	`section_id` text,
	`round_number` integer,
	`table_number` integer,
	`n` text,
	`s` text,
	`e` text,
	`w` text,
	`start_board` integer,
	`end_board` integer,
	PRIMARY KEY(`section_id`, `round_number`, `table_number`),
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `loginsessions` (
	`token` text PRIMARY KEY NOT NULL,
	`director` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`section_id` text,
	`round_number` integer,
	`table_number` integer,
	`ns` text,
	`ew` text,
	`start_board` integer,
	`end_board` integer,
	PRIMARY KEY(`section_id`, `round_number`, `table_number`),
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `pairs` (
	`section_id` text,
	`pair_number` integer,
	`player1` text,
	`player2` text,
	`direction` text,
	PRIMARY KEY(`section_id`, `pair_number`, `direction`),
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `results` (
	`section_id` text,
	`round_number` integer,
	`board_number` integer,
	`table_number` integer,
	`ns_pair` integer,
	`ew_pair` integer,
	`contract` text,
	`declarer` text,
	`tricks` integer,
	`score` text,
	`created_at` text,
	PRIMARY KEY(`section_id`, `round_number`, `board_number`, `table_number`),
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sectionmovements` (
	`id` text PRIMARY KEY NOT NULL,
	`movement_type` text NOT NULL,
	`boards_per_round` integer NOT NULL,
	`rounds` integer NOT NULL,
	`bridge_tables` integer NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`section_name` text NOT NULL,
	`started` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`session_name` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`setting_key` text PRIMARY KEY NOT NULL,
	`setting_value` text NOT NULL
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
