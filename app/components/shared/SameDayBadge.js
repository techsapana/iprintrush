'use client';

import { Badge } from '@/components/ui/badge';

export function SameDayBadge({ className = '' }) {
  return (
    <Badge className={`bg-green-500 text-white hover:bg-green-600 ${className}`}>
      ✓ Same-Day Available
    </Badge>
  );
}
