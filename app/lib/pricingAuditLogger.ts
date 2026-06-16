type PricingAuditLog = {
  timestamp: string;
  productId: string;
  tierId?: string;
  quantity: number;
  effectiveUnitPrice: number; // price after discount per unit
  baseTotal: number;
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: number;
  discountApplied: number;
  finalTotal: number;
  source: 'quote_calculation' | 'stripe_session';
};

export function logPricingCalculation(log: PricingAuditLog): void {
  // Production: send to logging service or database
  // Development: console log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PRICING_AUDIT]', JSON.stringify(log));
  }

  // In production, you could:
  // - Send to a dedicated pricing_audit_log table
  // - Send to external logging service (Datadog, etc.)
  // - Send to monitoring/alerting system for anomaly detection
}

// Helper to log from quote engine results
export function createAuditLog(
  productId: string,
  params: {
    tierId?: string;
    quantity: number;
    effectiveUnitPrice: number;
    baseTotal: number;
    discountType: 'NONE' | 'PERCENT' | 'FIXED';
    discountValue: number;
    discountApplied: number;
    finalTotal: number;
  },
  source: 'quote_calculation' | 'stripe_session'
): PricingAuditLog {
  return {
    timestamp: new Date().toISOString(),
    productId,
    ...params,
    source,
  };
}