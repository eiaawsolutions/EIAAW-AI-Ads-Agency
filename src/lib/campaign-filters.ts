import type { Prisma } from "@prisma/client";

/**
 * Synthetic Campaign rows are created by the platform-insights ingest
 * (`src/integrations/{meta,google}/insights.ts`) as data anchors for
 * MetricDaily.campaignId, which is non-nullable. They MUST exist for
 * account-level metrics to land somewhere, but they are NOT real
 * campaigns the operator launched and should never appear in
 * operator-facing campaign lists, counts, or detail pages.
 *
 * Filter strategy: match the two well-known anchor names exactly. Both
 * insights modules also set `strategy.synthetic = true`, but Prisma's
 * JSON-path filters can't cleanly express "path missing OR equals false"
 * across all engines — name-based filtering is dependable, and the
 * names are constants in the insights modules, not user input.
 *
 * Use this as the WHERE-clause spread in any query that surfaces
 * campaigns to the operator. Audit/insights/internal queries that need
 * the anchors (e.g., MetricDaily aggregations) read directly without
 * this filter.
 */
const SYNTHETIC_NAMES = ["Account totals (Meta)", "Account totals (Google)"];

export const EXCLUDE_SYNTHETIC: Prisma.CampaignWhereInput = {
  name: { notIn: SYNTHETIC_NAMES },
};

/** True if a Campaign row is the synthetic ingest anchor (not operator-launched). */
export function isSyntheticCampaign(c: { name: string }): boolean {
  return SYNTHETIC_NAMES.includes(c.name);
}
