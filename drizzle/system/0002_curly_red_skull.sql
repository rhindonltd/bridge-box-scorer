CREATE TABLE `seat_transfer_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`seat` text NOT NULL,
	`expires_at` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
