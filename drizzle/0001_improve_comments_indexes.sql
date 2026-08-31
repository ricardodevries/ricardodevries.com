DROP INDEX IF EXISTS `Comments_createdAt_postSlug_status_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `Comments_createdAt_parentId_postSlug_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `Comments_postSlug_status_createdAt_idx` ON `Comments` (`postSlug`,`status`,`createdAt`);
