export const ORDER_WORKFLOW_OPTIONS = [
  'order_review',
  'artwork_pending',
  'artwork_approved',
  'in_production',
  'ready_for_shipping',
  'shipped',
] as const;

export type OrderWorkflowStatus = (typeof ORDER_WORKFLOW_OPTIONS)[number];

const READ_NORMALIZE_MAP: Record<string, OrderWorkflowStatus> = {
  order_review: 'order_review',
  pending: 'order_review',
  artwork_pending: 'artwork_pending',
  artwork_approval_pending: 'artwork_pending',
  proof_pending: 'artwork_pending',
  artwork_approved: 'artwork_approved',
  proof_approved: 'artwork_approved',
  in_production: 'in_production',
  ready_for_shipping: 'ready_for_shipping',
  completed: 'ready_for_shipping',
  shipped: 'shipped',
};

const WRITE_FALLBACK_MAP: Record<OrderWorkflowStatus, string[]> = {
  order_review: ['pending'],
  artwork_pending: ['artwork_approval_pending', 'proof_pending'],
  artwork_approved: ['proof_approved'],
  in_production: [],
  ready_for_shipping: ['completed'],
  shipped: [],
};

export function normalizeWorkflowStatus(status: unknown): OrderWorkflowStatus {
  const key = typeof status === 'string' ? status : '';
  return READ_NORMALIZE_MAP[key] || 'order_review';
}

export function getWorkflowWriteCandidates(status: unknown): string[] {
  const normalized = normalizeWorkflowStatus(status);
  return [normalized, ...(WRITE_FALLBACK_MAP[normalized] || [])];
}
