CREATE TABLE `individualmovements` (
	`round_number` integer,
	`table_number` integer,
	`n` integer,
	`s` integer,
	`e` integer,
	`w` integer,
	`start_board` integer,
	`end_board` integer,
	PRIMARY KEY(`round_number`, `table_number`)
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`movement_type` text NOT NULL,
	`boards_per_round` integer NOT NULL,
	`rounds` integer NOT NULL,
	`bridge_tables` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`initialTable` integer,
	`initialDirection` text,
	`ebu_number` integer,
	`first_name` text,
	`last_name` text,
	PRIMARY KEY(`initialTable`, `initialDirection`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`round_number` integer,
	`table_number` integer,
	`n` integer,
	`s` integer,
	`e` integer,
	`w` integer,
	`board_number` integer,
	`contract` text,
	`declarer` text,
	`tricks` integer,
	`score` text,
	`created_at` text,
	PRIMARY KEY(`round_number`, `board_number`, `table_number`)
);
