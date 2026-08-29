CREATE TABLE `Analytics` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`path` text NOT NULL,
	`referrer` text,
	`botName` text,
	`flag` text,
	`country` text,
	`city` text,
	`fingerprint` text
);
--> statement-breakpoint
CREATE TABLE `AuthAccount` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`issuer` text,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` text,
	`refreshTokenExpiresAt` text,
	`scope` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `AuthAccount_userId_idx` ON `AuthAccount` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `AuthAccount_accountId_issuer_idx` ON `AuthAccount` (`accountId`,`issuer`);--> statement-breakpoint
CREATE TABLE `AuthSession` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` text NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AuthSession_token_unique` ON `AuthSession` (`token`);--> statement-breakpoint
CREATE INDEX `AuthSession_userId_idx` ON `AuthSession` (`userId`);--> statement-breakpoint
CREATE TABLE `AuthUser` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AuthUser_email_unique` ON `AuthUser` (`email`);--> statement-breakpoint
CREATE TABLE `AuthVerification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `AuthVerification_identifier_idx` ON `AuthVerification` (`identifier`);--> statement-breakpoint
CREATE TABLE `Comments` (
	`id` text PRIMARY KEY NOT NULL,
	`postSlug` text NOT NULL,
	`parentId` text,
	`authorUserId` text NOT NULL,
	`authorName` text NOT NULL,
	`authorImage` text,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`moderatedByUserId` text,
	`moderatedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Comments_createdAt_postSlug_status_idx` ON `Comments` (`createdAt`,`postSlug`,`status`);--> statement-breakpoint
CREATE INDEX `Comments_createdAt_parentId_postSlug_idx` ON `Comments` (`createdAt`,`parentId`,`postSlug`);--> statement-breakpoint
CREATE INDEX `Comments_authorUserId_createdAt_idx` ON `Comments` (`authorUserId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `Views` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`postId` text NOT NULL,
	`fingerprint` text,
	`date` text NOT NULL
);
