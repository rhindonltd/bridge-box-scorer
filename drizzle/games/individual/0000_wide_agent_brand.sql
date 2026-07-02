CREATE TABLE `assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`initial_seat` text
);
--> statement-breakpoint
CREATE TABLE `boards` (
	`round_number` integer NOT NULL,
	`table_number` integer NOT NULL,
	`board_number` integer NOT NULL,
	`n` text NOT NULL,
	`s` text NOT NULL,
	`e` text NOT NULL,
	`w` text NOT NULL,
	`n_result` text,
	`s_result` text,
	`e_result` text,
	`w_result` text,
	`n_lead` text,
	`s_lead` text,
	`e_lead` text,
	`w_lead` text,
	`director_override_result` text,
	`director_override_lead` text,
	`status` text,
	PRIMARY KEY(`round_number`, `table_number`, `board_number`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participant` (
	`initial_seat` text PRIMARY KEY NOT NULL,
	`player` integer NOT NULL,
	`secret_key` text NOT NULL,
	FOREIGN KEY (`player`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`national_id` text
);
