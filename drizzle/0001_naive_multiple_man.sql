CREATE TABLE `feed_settings` (
	`feed_id` integer PRIMARY KEY NOT NULL,
	`relevance_blurbs_enabled` integer DEFAULT false,
	`digest_mode` text DEFAULT 'realtime',
	`auto_mark_read_days` integer,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `item_state` ADD `engagement_tier` text DEFAULT 'unseen';--> statement-breakpoint
ALTER TABLE `item_state` ADD `triage_action` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `triage_at` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `queued_at` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `is_pinned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `item_state` ADD `pinned_at` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `queue_position` integer;--> statement-breakpoint
ALTER TABLE `item_state` ADD `scroll_depth` real;--> statement-breakpoint
ALTER TABLE `item_state` ADD `dwell_time_seconds` integer;--> statement-breakpoint
ALTER TABLE `item_state` ADD `is_completed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `item_state` ADD `shared_at` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `sent_at` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `saved_at` text;--> statement-breakpoint
ALTER TABLE `item_state` ADD `fueled_at` text;