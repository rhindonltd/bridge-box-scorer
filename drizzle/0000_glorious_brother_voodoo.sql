CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`event_date` text NOT NULL,
	`director` text NOT NULL,
	`scoring_type` text NOT NULL,
	`created_at` text NOT NULL
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
	`ns_pair` integer,
	`ew_pair` integer,
	`start_board` integer,
	`end_board` integer,
	PRIMARY KEY(`section_id`, `round_number`, `table_number`),
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
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
