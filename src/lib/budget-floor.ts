/**
 * Per-platform minimum daily-budget floors.
 *
 * The wizard, server-side launch endpoint, and any future programmatic
 * caller all read from this single source of truth. If a platform's
 * minimum changes, edit it here once.
 *
 * Why floors at all: Meta rejects daily_budget < $5 USD on most account/
 * objective combos with `(#100, subcode 2446375) "This campaign's budget
 * is too small."` Even where a lower budget is technically accepted
 * (Google Ads at $1, LinkedIn at $10, etc.), sub-$5/day campaigns won't
 * get any meaningful reach — the platform's auction simply won't surface
 * them. So we enforce a sane floor at the user-facing layer + a safety
 * floor at the API layer rather than letting users discover it as a
 * confusing platform-side rejection mid-launch.
 */

export const MIN_DAILY_BUDGET_USD = 5;
export const DAYS_PER_MONTH = 30;

/**
 * Minimum monthly budget that produces at least MIN_DAILY_BUDGET_USD
 * per day, given our monthly-to-daily conversion (monthly / 30).
 *
 * 5 × 30 = $150/mo.
 */
export const MIN_MONTHLY_BUDGET_USD = MIN_DAILY_BUDGET_USD * DAYS_PER_MONTH;

export type BudgetCheck =
  | { ok: true }
  | { ok: false; reason: string; minMonthly: number; minDaily: number };

/**
 * Validate a monthly budget value (in major units, e.g. 150 = $150).
 * Currency-agnostic on the input side — caller is responsible for
 * passing a USD-equivalent value if rates need to be applied.
 */
export function checkMonthlyBudget(monthlyBudget: number, currency = "USD"): BudgetCheck {
  if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return {
      ok: false,
      reason: "Monthly budget must be a positive number.",
      minMonthly: MIN_MONTHLY_BUDGET_USD,
      minDaily: MIN_DAILY_BUDGET_USD,
    };
  }
  if (monthlyBudget < MIN_MONTHLY_BUDGET_USD) {
    return {
      ok: false,
      reason: `Minimum monthly budget is ${currency} ${MIN_MONTHLY_BUDGET_USD} (≈ ${currency} ${MIN_DAILY_BUDGET_USD}/day). Meta and other platforms reject lower amounts as sub-threshold.`,
      minMonthly: MIN_MONTHLY_BUDGET_USD,
      minDaily: MIN_DAILY_BUDGET_USD,
    };
  }
  return { ok: true };
}
