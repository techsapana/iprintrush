import { Suspense } from 'react';
import SuccessClient from './success-client';

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading order…</div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}

