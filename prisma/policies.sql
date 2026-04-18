-- Row-Level Security policies for tenant isolation.
--
-- Apply after `prisma db push` (idempotent — safe to re-run).
-- The application sets `SET LOCAL app.current_org_id = '<uuid>'` at the
-- start of each request inside a transaction; policies compare that to
-- the row's `orgId`.
--
-- Usage:
--   railway run psql $DATABASE_URL -f prisma/policies.sql
-- Then:
--   railway variables --set ENABLE_RLS=true
--
-- A policy-level bypass role (e.g. migrations) should use a Postgres role
-- with BYPASSRLS; in Railway Postgres the default user already has it.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- Enable + FORCE RLS on every org-scoped table.
-- Railway's default Postgres user is a superuser; superusers bypass RLS
-- unless FORCE is set on the table. FORCE applies RLS to every role —
-- including migrations, which must run under a BYPASSRLS role or reset
-- the current_org_id GUC (see scripts/apply-rls.ts).
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE "Brand"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"              FORCE  ROW LEVEL SECURITY;
ALTER TABLE "BrandDna"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandDna"           FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Integration"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration"        FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Campaign"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign"           FORCE  ROW LEVEL SECURITY;
ALTER TABLE "AdSet"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdSet"              FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Ad"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ad"                 FORCE  ROW LEVEL SECURITY;
ALTER TABLE "MetricDaily"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetricDaily"        FORCE  ROW LEVEL SECURITY;
ALTER TABLE "AgentRun"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRun"           FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Experiment"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experiment"         FORCE  ROW LEVEL SECURITY;
ALTER TABLE "ExperimentVariant"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExperimentVariant"  FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Report"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report"             FORCE  ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"           FORCE  ROW LEVEL SECURITY;
ALTER TABLE "Membership"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership"         FORCE  ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- Drop any stale policies from previous runs
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS brand_isolation       ON "Brand";
DROP POLICY IF EXISTS brand_dna_isolation   ON "BrandDna";
DROP POLICY IF EXISTS integration_isolation ON "Integration";
DROP POLICY IF EXISTS campaign_isolation    ON "Campaign";
DROP POLICY IF EXISTS ad_set_isolation      ON "AdSet";
DROP POLICY IF EXISTS ad_isolation          ON "Ad";
DROP POLICY IF EXISTS metric_isolation      ON "MetricDaily";
DROP POLICY IF EXISTS agent_run_isolation   ON "AgentRun";
DROP POLICY IF EXISTS experiment_isolation  ON "Experiment";
DROP POLICY IF EXISTS variant_isolation     ON "ExperimentVariant";
DROP POLICY IF EXISTS report_isolation      ON "Report";
DROP POLICY IF EXISTS audit_log_isolation   ON "AuditLog";
DROP POLICY IF EXISTS membership_isolation  ON "Membership";

-- ─────────────────────────────────────────────────────────────────
-- Direct org-scoped tables
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY brand_isolation       ON "Brand"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY integration_isolation ON "Integration"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY campaign_isolation    ON "Campaign"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY agent_run_isolation   ON "AgentRun"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY experiment_isolation  ON "Experiment"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY report_isolation      ON "Report"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY audit_log_isolation   ON "AuditLog"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

CREATE POLICY membership_isolation  ON "Membership"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "orgId" = current_setting('app.current_org_id', true)
  );

-- ─────────────────────────────────────────────────────────────────
-- Indirect org-scoped tables (via FK join)
-- These use subquery-based predicates because they don't carry orgId directly.
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY brand_dna_isolation ON "BrandDna"
  USING (EXISTS (
    SELECT 1 FROM "Brand" b
    WHERE b.id = "BrandDna"."brandId"
      AND (
        current_setting('app.current_org_id', true) = '*'
        OR b."orgId" = current_setting('app.current_org_id', true)
      )
  ));

CREATE POLICY ad_set_isolation ON "AdSet"
  USING (EXISTS (
    SELECT 1 FROM "Campaign" c
    WHERE c.id = "AdSet"."campaignId"
      AND (
        current_setting('app.current_org_id', true) = '*'
        OR c."orgId" = current_setting('app.current_org_id', true)
      )
  ));

CREATE POLICY ad_isolation ON "Ad"
  USING (EXISTS (
    SELECT 1 FROM "AdSet" s
    JOIN "Campaign" c ON c.id = s."campaignId"
    WHERE s.id = "Ad"."adSetId"
      AND (
        current_setting('app.current_org_id', true) = '*'
        OR c."orgId" = current_setting('app.current_org_id', true)
      )
  ));

CREATE POLICY metric_isolation ON "MetricDaily"
  USING (
    current_setting('app.current_org_id', true) = '*'
    OR "campaignId" IS NULL
    OR EXISTS (
      SELECT 1 FROM "Campaign" c
      WHERE c.id = "MetricDaily"."campaignId"
        AND c."orgId" = current_setting('app.current_org_id', true)
    )
  );

CREATE POLICY variant_isolation ON "ExperimentVariant"
  USING (EXISTS (
    SELECT 1 FROM "Experiment" e
    WHERE e.id = "ExperimentVariant"."experimentId"
      AND e."orgId" = current_setting('app.current_org_id', true)
  ));

COMMIT;
