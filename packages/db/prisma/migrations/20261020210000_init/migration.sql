-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('owner', 'admin', 'operator', 'viewer');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'pending', 'canceled');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'expired', 'failed');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('received', 'processed', 'failed', 'replayed');

-- CreateEnum
CREATE TYPE "TelegramAccountStatus" AS ENUM ('active', 'warming', 'flood_wait', 'disconnected', 'banned', 'error');

-- CreateEnum
CREATE TYPE "AccountCapability" AS ENUM ('discovery', 'broadcast', 'dm');

-- CreateEnum
CREATE TYPE "DiscoverySourceStatus" AS ENUM ('active', 'paused', 'errored');

-- CreateEnum
CREATE TYPE "DiscoveredLinkKind" AS ENUM ('public_username', 'private_invite', 'public_mention');

-- CreateEnum
CREATE TYPE "DiscoveredLinkStatus" AS ENUM ('pending', 'valid', 'invalid', 'duplicate', 'expired');

-- CreateEnum
CREATE TYPE "GroupKind" AS ENUM ('group', 'supergroup', 'channel');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('member', 'left', 'kicked', 'banned', 'pending');

-- CreateEnum
CREATE TYPE "JoinJobStatus" AS ENUM ('queued', 'joining', 'joined', 'failed', 'approval_required', 'skipped');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('draft', 'queued', 'sending', 'completed', 'failed', 'paused', 'canceled');

-- CreateEnum
CREATE TYPE "BroadcastTargetStatus" AS ENUM ('queued', 'sending', 'sent', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "DmTriggerType" AS ENUM ('keyword_match', 'new_dm', 'mention', 'group_join_event');

-- CreateEnum
CREATE TYPE "DmResponseType" AS ENUM ('template_text', 'template_media', 'tag_only', 'forward_to_bot');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('info', 'warn', 'critical');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'id',
    "totp_secret_cipher" TEXT,
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "plan_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_idr" INTEGER NOT NULL,
    "period" "BillingPeriod" NOT NULL DEFAULT 'monthly',
    "max_telegram_accounts" INTEGER NOT NULL,
    "max_concurrent_campaigns" INTEGER NOT NULL,
    "max_broadcasts_per_day" INTEGER NOT NULL,
    "max_discovery_sources" INTEGER NOT NULL,
    "auto_discovery_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_join_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_broadcast_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_dm_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "pakasir_invoice_id" TEXT NOT NULL,
    "amount_idr" INTEGER NOT NULL,
    "period" "BillingPeriod" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "checkout_url" TEXT,
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'received',
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "telegram_user_id" TEXT,
    "phone_last4" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "username" TEXT,
    "session_cipher" TEXT,
    "session_key_version" INTEGER,
    "two_fa_cipher" TEXT,
    "device_model" TEXT NOT NULL,
    "system_version" TEXT NOT NULL,
    "app_version" TEXT NOT NULL,
    "status" "TelegramAccountStatus" NOT NULL DEFAULT 'disconnected',
    "capabilities" "AccountCapability"[],
    "disabled_by_plan_limit" BOOLEAN NOT NULL DEFAULT false,
    "flood_wait_until" TIMESTAMP(3),
    "last_error" TEXT,
    "last_health_check_at" TIMESTAMP(3),
    "warmup_started_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_bots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "token_cipher" TEXT NOT NULL,
    "token_key_version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_sources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mention_enabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_limit" INTEGER NOT NULL DEFAULT 500,
    "status" "DiscoverySourceStatus" NOT NULL DEFAULT 'active',
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_links" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_id" TEXT,
    "raw_url" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "kind" "DiscoveredLinkKind" NOT NULL,
    "status" "DiscoveredLinkStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovered_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "kind" "GroupKind" NOT NULL,
    "member_count" INTEGER,
    "allow_promotion" BOOLEAN NOT NULL DEFAULT false,
    "first_discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'pending',
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_exclusions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "group_id" TEXT,
    "raw_target" TEXT NOT NULL,
    "status" "JoinJobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "retry_after" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "join_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "media_url" TEXT,
    "media_kind" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "template_id" TEXT,
    "campaign_run_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "media_url" TEXT,
    "media_kind" TEXT,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "total_targets" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "min_delay_sec" INTEGER NOT NULL DEFAULT 20,
    "max_delay_sec" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_targets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "status" "BroadcastTargetStatus" NOT NULL DEFAULT 'queued',
    "error_code" TEXT,
    "error_message" TEXT,
    "message_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "template_id" TEXT,
    "account_ids" TEXT[],
    "target_group_ids" TEXT[],
    "total_planned" INTEGER NOT NULL DEFAULT 0,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_failed" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_schedules" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_runs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_type" "DmTriggerType" NOT NULL,
    "keywords" TEXT[],
    "response_type" "DmResponseType" NOT NULL,
    "response_body" TEXT,
    "response_media" TEXT,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 60,
    "active_hours_start" INTEGER,
    "active_hours_end" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dm_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_responses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "telegram_peer" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "queue_name" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "job_id" TEXT,
    "result" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenant_members_user_id_idx" ON "tenant_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_members_tenant_id_user_id_key" ON "tenant_members"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_ends_at_idx" ON "subscriptions"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_pakasir_invoice_id_key" ON "invoices"("pakasir_invoice_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_status_expires_at_idx" ON "invoices"("status", "expires_at");

-- CreateIndex
CREATE INDEX "webhook_events_tenant_id_idx" ON "webhook_events"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "telegram_accounts_tenant_id_status_idx" ON "telegram_accounts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_accounts_tenant_id_telegram_user_id_key" ON "telegram_accounts"("tenant_id", "telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_bots_tenant_id_username_key" ON "tenant_bots"("tenant_id", "username");

-- CreateIndex
CREATE INDEX "discovery_sources_tenant_id_status_idx" ON "discovery_sources"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "discovered_links_tenant_id_status_idx" ON "discovered_links"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_links_tenant_id_normalized_key" ON "discovered_links"("tenant_id", "normalized");

-- CreateIndex
CREATE INDEX "groups_tenant_id_allow_promotion_idx" ON "groups"("tenant_id", "allow_promotion");

-- CreateIndex
CREATE UNIQUE INDEX "groups_tenant_id_telegram_chat_id_key" ON "groups"("tenant_id", "telegram_chat_id");

-- CreateIndex
CREATE INDEX "group_memberships_tenant_id_status_idx" ON "group_memberships"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "group_memberships_group_id_account_id_key" ON "group_memberships"("group_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_exclusions_tenant_id_group_id_key" ON "group_exclusions"("tenant_id", "group_id");

-- CreateIndex
CREATE INDEX "join_jobs_tenant_id_status_idx" ON "join_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "join_jobs_account_id_status_idx" ON "join_jobs"("account_id", "status");

-- CreateIndex
CREATE INDEX "broadcast_templates_tenant_id_idx" ON "broadcast_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "broadcasts_tenant_id_status_idx" ON "broadcasts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "broadcasts_account_id_status_idx" ON "broadcasts"("account_id", "status");

-- CreateIndex
CREATE INDEX "broadcasts_campaign_run_id_idx" ON "broadcasts"("campaign_run_id");

-- CreateIndex
CREATE INDEX "broadcast_targets_tenant_id_status_idx" ON "broadcast_targets"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_targets_broadcast_id_group_id_key" ON "broadcast_targets"("broadcast_id", "group_id");

-- CreateIndex
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "campaign_runs_campaign_id_status_idx" ON "campaign_runs"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "dm_rules_tenant_id_is_active_idx" ON "dm_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "dm_responses_tenant_id_created_at_idx" ON "dm_responses"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "dm_responses_rule_id_telegram_peer_idx" ON "dm_responses"("rule_id", "telegram_peer");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_tenant_id_status_idx" ON "support_tickets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "processed_jobs_tenant_id_idx" ON "processed_jobs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "processed_jobs_queue_name_idempotency_key_key" ON "processed_jobs"("queue_name", "idempotency_key");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_accounts" ADD CONSTRAINT "telegram_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_bots" ADD CONSTRAINT "tenant_bots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_sources" ADD CONSTRAINT "discovery_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_links" ADD CONSTRAINT "discovered_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_links" ADD CONSTRAINT "discovered_links_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "discovery_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "telegram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_exclusions" ADD CONSTRAINT "group_exclusions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_exclusions" ADD CONSTRAINT "group_exclusions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_jobs" ADD CONSTRAINT "join_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_jobs" ADD CONSTRAINT "join_jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "telegram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_jobs" ADD CONSTRAINT "join_jobs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_templates" ADD CONSTRAINT "broadcast_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "telegram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "broadcast_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_campaign_run_id_fkey" FOREIGN KEY ("campaign_run_id") REFERENCES "campaign_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_targets" ADD CONSTRAINT "broadcast_targets_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_targets" ADD CONSTRAINT "broadcast_targets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_runs" ADD CONSTRAINT "campaign_runs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_rules" ADD CONSTRAINT "dm_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_responses" ADD CONSTRAINT "dm_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_responses" ADD CONSTRAINT "dm_responses_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "dm_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_responses" ADD CONSTRAINT "dm_responses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "telegram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_jobs" ADD CONSTRAINT "processed_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
