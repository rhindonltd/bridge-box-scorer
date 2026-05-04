CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`director` text,
	`event_type` text,
	`session_name` text NOT NULL,
	`section_name` text NOT NULL,
	`event_date` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
