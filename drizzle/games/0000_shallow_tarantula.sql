CREATE TABLE `board_submissions` (
	`section` text NOT NULL,
	`round_number` integer NOT NULL,
	`table_number` integer NOT NULL,
	`board_number` integer NOT NULL,
	`side` text NOT NULL,
	`result` text,
	`lead` text,
	PRIMARY KEY(`section`, `round_number`, `table_number`, `side`)
);
--> statement-breakpoint
CREATE TABLE `boards` (
	`section` text NOT NULL,
	`round_number` integer NOT NULL,
	`table_number` integer NOT NULL,
	`board_number` integer NOT NULL,
	`copy` text DEFAULT 'A' NOT NULL,
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`confirmed_result` text,
	`confirmed_lead` text,
	`director_override_result` text,
	`director_override_lead` text,
	`match_id` integer NOT NULL,
	`status` text,
	PRIMARY KEY(`section`, `round_number`, `table_number`, `board_number`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`board_number` integer PRIMARY KEY NOT NULL,
	`pbn` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expected_late_seats` (
	`seat` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section` text NOT NULL,
	`round_number` integer NOT NULL,
	`kind` text NOT NULL,
	`scored_as_unit` integer NOT NULL,
	`home` text NOT NULL,
	`opponent` text,
	`group_id` text,
	`slot` integer,
	`vp_pool` integer,
	`board_start` integer NOT NULL,
	`board_end` integer NOT NULL,
	`ruling` text
);
--> statement-breakpoint
CREATE INDEX `matches_section_round_idx` ON `matches` (`section`,`round_number`);--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`national_id` text
);
--> statement-breakpoint
CREATE TABLE `seat_occupancy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seat` text NOT NULL,
	`anchor_id` text,
	`boards` text,
	`player1` integer NOT NULL,
	`player2` integer NOT NULL,
	`secret_key` text NOT NULL,
	`standing` text DEFAULT 'ACTIVE' NOT NULL,
	`withdrawn_in_round` integer,
	`withdrawal_treatment` text,
	`withdrawal_fine_percent` integer,
	FOREIGN KEY (`player1`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player2`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `seat_occupancy_seat_idx` ON `seat_occupancy` (`seat`);--> statement-breakpoint
CREATE INDEX `seat_occupancy_anchor_idx` ON `seat_occupancy` (`anchor_id`);--> statement-breakpoint
CREATE TABLE `sections` (
	`section` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`tables` integer NOT NULL,
	`selected_movement` text,
	`ordinal` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`team_id` text PRIMARY KEY NOT NULL,
	`team_name` text
);
