CREATE TABLE `deals` (
	`board_number` integer PRIMARY KEY NOT NULL,
	`pbn` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
