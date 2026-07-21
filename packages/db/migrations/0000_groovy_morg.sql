CREATE TABLE `mu_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creator_id` int NOT NULL,
	`class_id` int,
	`student_id` int,
	`surah_id` int NOT NULL,
	`start_ayah` int NOT NULL,
	`end_ayah` int NOT NULL,
	`target_loops` int NOT NULL,
	`due_at` text,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT `mu_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mu_ayah_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`ayah_id` int NOT NULL,
	`mastery` varchar(30) NOT NULL,
	`repetitions` int NOT NULL DEFAULT 0,
	`last_practiced_at` text,
	CONSTRAINT `mu_ayah_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `progress_user_ayah` UNIQUE(`user_id`,`ayah_id`)
);
--> statement-breakpoint
CREATE TABLE `mu_ayahs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surah_id` int NOT NULL,
	`number` int NOT NULL,
	`arabic` text NOT NULL,
	`transliteration` text,
	`translation` text NOT NULL,
	`audio_url` text NOT NULL,
	CONSTRAINT `mu_ayahs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ayah_surah_number` UNIQUE(`surah_id`,`number`)
);
--> statement-breakpoint
CREATE TABLE `mu_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	CONSTRAINT `mu_badges_id` PRIMARY KEY(`id`),
	CONSTRAINT `mu_badges_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `mu_class_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`student_id` int NOT NULL,
	CONSTRAINT `mu_class_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_student` UNIQUE(`class_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `mu_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`teacher_id` int NOT NULL,
	`join_code` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT `mu_classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `mu_classes_join_code_unique` UNIQUE(`join_code`)
);
--> statement-breakpoint
CREATE TABLE `mu_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `mu_credentials_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `mu_credentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `mu_encouragements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_id` int NOT NULL,
	`child_id` int NOT NULL,
	`message` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_encouragements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mu_oauth_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_account_id` varchar(191) NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_oauth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_provider_account` UNIQUE(`provider`,`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `mu_parent_children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_id` int NOT NULL,
	`child_id` int NOT NULL,
	CONSTRAINT `mu_parent_children_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_child` UNIQUE(`parent_id`,`child_id`)
);
--> statement-breakpoint
CREATE TABLE `mu_password_reset_tokens` (
	`token` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_password_reset_tokens_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `mu_practice_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`surah_id` int NOT NULL,
	`start_ayah` int NOT NULL,
	`end_ayah` int NOT NULL,
	`loops` int NOT NULL,
	`duration` int NOT NULL,
	`status` varchar(20) NOT NULL,
	`client_id` varchar(64),
	`completed_at` varchar(30) DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_practice_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mu_practice_sessions_client_id_unique` UNIQUE(`client_id`)
);
--> statement-breakpoint
CREATE TABLE `mu_refresh_tokens` (
	`token` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	`device_info` text,
	CONSTRAINT `mu_refresh_tokens_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `mu_sessions` (
	`token` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`active_user_id` int NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_sessions_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `mu_surahs` (
	`id` int NOT NULL,
	`latin_name` text NOT NULL,
	`arabic_name` text NOT NULL,
	`meaning` text NOT NULL,
	`ayah_count` int NOT NULL,
	CONSTRAINT `mu_surahs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mu_user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`badge_id` int NOT NULL,
	`earned_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_user_badges_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_badge` UNIQUE(`user_id`,`badge_id`)
);
--> statement-breakpoint
CREATE TABLE `mu_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`role` enum('student','teacher','parent','admin') NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`daily_target` int NOT NULL DEFAULT 10,
	`preferences` text,
	`gender` enum('L','P'),
	`birth_date` varchar(10),
	`managed_by` int,
	`all_sessions_revoked_at` text,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mu_xp_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`source` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_xp_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `mu_xp_ledger_source_unique` UNIQUE(`source`)
);
--> statement-breakpoint
ALTER TABLE `mu_assignments` ADD CONSTRAINT `mu_assignments_creator_id_mu_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_assignments` ADD CONSTRAINT `mu_assignments_class_id_mu_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `mu_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_assignments` ADD CONSTRAINT `mu_assignments_student_id_mu_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_assignments` ADD CONSTRAINT `mu_assignments_surah_id_mu_surahs_id_fk` FOREIGN KEY (`surah_id`) REFERENCES `mu_surahs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_ayah_progress` ADD CONSTRAINT `mu_ayah_progress_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_ayah_progress` ADD CONSTRAINT `mu_ayah_progress_ayah_id_mu_ayahs_id_fk` FOREIGN KEY (`ayah_id`) REFERENCES `mu_ayahs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_ayahs` ADD CONSTRAINT `mu_ayahs_surah_id_mu_surahs_id_fk` FOREIGN KEY (`surah_id`) REFERENCES `mu_surahs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_class_members` ADD CONSTRAINT `mu_class_members_class_id_mu_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `mu_classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_class_members` ADD CONSTRAINT `mu_class_members_student_id_mu_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_classes` ADD CONSTRAINT `mu_classes_teacher_id_mu_users_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_credentials` ADD CONSTRAINT `mu_credentials_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_encouragements` ADD CONSTRAINT `mu_encouragements_parent_id_mu_users_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_encouragements` ADD CONSTRAINT `mu_encouragements_child_id_mu_users_id_fk` FOREIGN KEY (`child_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_oauth_accounts` ADD CONSTRAINT `mu_oauth_accounts_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_parent_children` ADD CONSTRAINT `mu_parent_children_parent_id_mu_users_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_parent_children` ADD CONSTRAINT `mu_parent_children_child_id_mu_users_id_fk` FOREIGN KEY (`child_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_password_reset_tokens` ADD CONSTRAINT `mu_password_reset_tokens_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_practice_sessions` ADD CONSTRAINT `mu_practice_sessions_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_practice_sessions` ADD CONSTRAINT `mu_practice_sessions_surah_id_mu_surahs_id_fk` FOREIGN KEY (`surah_id`) REFERENCES `mu_surahs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_refresh_tokens` ADD CONSTRAINT `mu_refresh_tokens_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_sessions` ADD CONSTRAINT `mu_sessions_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_sessions` ADD CONSTRAINT `mu_sessions_active_user_id_mu_users_id_fk` FOREIGN KEY (`active_user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_user_badges` ADD CONSTRAINT `mu_user_badges_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_user_badges` ADD CONSTRAINT `mu_user_badges_badge_id_mu_badges_id_fk` FOREIGN KEY (`badge_id`) REFERENCES `mu_badges`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_users` ADD CONSTRAINT `mu_users_managed_by_mu_users_id_fk` FOREIGN KEY (`managed_by`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mu_xp_ledger` ADD CONSTRAINT `mu_xp_ledger_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `session_user_date` ON `mu_practice_sessions` (`user_id`,`completed_at`);