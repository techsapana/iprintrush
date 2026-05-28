import { Suspense } from 'react';
import CheckoutClient from './checkout-client';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading checkout…</p>
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
