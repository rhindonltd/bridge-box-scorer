CREATE TABLE `club` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`club_number` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loginsessions` (
	`token` text PRIMARY KEY NOT NULL,
	`gameId` text,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`setting_key` text PRIMARY KEY NOT NULL,
	`setting_value` text NOT NULL
);
