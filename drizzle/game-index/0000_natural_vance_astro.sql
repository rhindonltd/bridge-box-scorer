CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`director` text,
	`event_type` text,
	`game_id` text DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`session_name` text NOT NULL,
	`section_name` text NOT NULL,
	`event_date` text NOT NULL,
	`tables` integer NOT NULL,
	`status` text DEFAULT 'CREATED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
