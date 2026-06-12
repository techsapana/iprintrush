import { QuoteSummary } from '../quoteConfigTypes';

/**
 * Extended quote summary with explicit breakdown sections.
 * This provides a consistent output format regardless of flow mode.
 */
export type UnifiedQuoteSummary = QuoteSummary & {
  /** All customization selections with labels */
  customizations: Record<string, string | string[]>;
  /** Addon breakdown details */
  addonDetails: { label: string; perUnit: number; total: number }[];
};

/**
 * Build a unified quote summary from the quote calculation result.
 * Ensures identical output structure for both apparel and print product flows.
 */
export function buildUnifiedQuoteSummary(
  baseSummary: QuoteSummary,
  customizations: Record<string, string | string[]>,
  addonDetails: { label: string; perUnit: number; total: number }[] = []
): UnifiedQuoteSummary {
  return {
    ...baseSummary,
    customizations,
    addonDetails,
  };
}

/**
 * Transform size-based breakdown to total format.
 * Used when print products need to show "Total" instead of per-size breakdown.
 */
export function buildSizeBreakdownForSummary(
  quantityBreakdown: { key: string; label: string; quantity: number }[]
): { sizeLabel: string; quantity: number }[] {
  const totalQuantity = quantityBreakdown.reduce((sum, q) => sum + q.quantity, 0);
  
  if (quantityBreakdown.length === 0) {
    return [];
  }
  
  // If only one entry or mixed (print product style)
  if (quantityBreakdown.length === 1 || quantityBreakdown.some(q => q.label === 'Total')) {
    return [{ sizeLabel: 'Total', quantity: totalQuantity }];
  }
  
  // Multiple sizes (apparel style) - return as-is
  return quantityBreakdown.map(q => ({ sizeLabel: q.label, quantity: q.quantity }));
}