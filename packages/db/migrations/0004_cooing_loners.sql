CREATE TABLE `mu_password_reset_tokens` (
	`token` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
	CONSTRAINT `mu_password_reset_tokens_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
ALTER TABLE `mu_password_reset_tokens` ADD CONSTRAINT `mu_password_reset_tokens_user_id_mu_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `mu_users`(`id`) ON DELETE no action ON UPDATE no action;