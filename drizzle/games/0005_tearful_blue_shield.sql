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
ALTER TABLE `boards` ADD `match_id` integer NOT NULL REFERENCES matches(id);