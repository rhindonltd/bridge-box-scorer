ALTER TABLE `participant` ADD `standing` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `participant` ADD `withdrawn_in_round` integer;--> statement-breakpoint
ALTER TABLE `participant` ADD `withdrawal_treatment` text;--> statement-breakpoint
ALTER TABLE `participant` ADD `withdrawal_fine_percent` integer;