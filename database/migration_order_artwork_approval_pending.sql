-- Add artwork approval pending workflow state
USE iprintrush;

ALTER TABLE orders
MODIFY COLUMN workflow_status ENUM(
  'pending',
  'in_production',
  'proof_pending',
  'proof_approved',
  'artwork_approval_pending',
  'completed',
  'shipped',
  'cancelled',
  'on_hold'
) NOT NULL DEFAULT 'pending';

