-- Row-Level Security policies for tenant isolation.
-- Apply after `prisma migrate deploy`. The application sets
-- `SET app.current_org_id = '...'` at the start of every request.
--
-- NOTE: This file is idempotent-ish; drop/recreate policies on schema changes.

ALTER TABLE "Organization"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandDna"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdSet"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ad"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetricDaily"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRun"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experiment"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExperimentVariant"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"            ENABLE ROW LEVEL SECURITY;

-- Example policy: org-scoped rows visible only when current_org matches.
CREATE POLICY brand_isolation ON "Brand"
  USING ("orgId" = current_setting('app.current_org_id', true));

CREATE POLICY campaign_isolation ON "Campaign"
  USING ("orgId" = current_setting('app.current_org_id', true));

CREATE POLICY integration_isolation ON "Integration"
  USING ("orgId" = current_setting('app.current_org_id', true));

CREATE POLICY agent_run_isolation ON "AgentRun"
  USING ("orgId" = current_setting('app.current_org_id', true));

CREATE POLICY experiment_isolation ON "Experiment"
  USING ("orgId" = current_setting('app.current_org_id', true));

-- Repeat for remaining tables (Report, AuditLog, etc.) at migration time.
