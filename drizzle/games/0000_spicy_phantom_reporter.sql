CREATE TABLE `assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`initial_seat` text
);
--> statement-breakpoint
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
	`ns` text NOT NULL,
	`ew` text NOT NULL,
	`confirmed_result` text,
	`confirmed_lead` text,
	`director_override_result` text,
	`director_override_lead` text,
	`status` text,
	PRIMARY KEY(`section`, `round_number`, `table_number`, `board_number`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
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
CREATE TABLE `sections` (
	`section` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`tables` integer NOT NULL,
	`selected_movement` text,
	`ordinal` integer NOT NULL
);
