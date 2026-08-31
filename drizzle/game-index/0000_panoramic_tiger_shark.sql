CREATE TABLE `games` (
	`game_id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`event_name` text NOT NULL,
	`director` text,
	`game_type` text NOT NULL,
	`scoring_type` text DEFAULT 'MP' NOT NULL,
	`session_name` text NOT NULL,
	`section_name` text NOT NULL,
	`event_date` text NOT NULL,
	`tables` integer NOT NULL,
	`lead_card_required` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
