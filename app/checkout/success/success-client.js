'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/stripe/order?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (res.ok) setOrder(data.order);
      } catch {
        // ignore
      }
    })();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-6">✓</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-gray-600 text-lg mb-8">
            Thanks—your order is confirmed.
          </p>

{order && (
            <div className="bg-[rgba(41,182,246,0.1)] border border-[rgba(41,182,246,0.3)] rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-[#155d7a] mb-4">Order Details</h2>
              {order.shippingReviewRequired && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  <span className="font-semibold">Shipping cost pending review</span>
                  <p className="mt-1">Our team will contact you with shipping options and costs.</p>
                </div>
              )}
              <ul className="space-y-2 text-sm text-[#1a7ba3]">
                <li>Order #: {order.orderNumber}</li>
                <li>Status: {order.status}</li>
                <li>Total: ${Number(order.amountTotal || 0).toFixed(2)}</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold">
                Back to Home
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="border-[#29b6f6] text-[#29b6f6] hover:bg-[rgba(41,182,246,0.1)]">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

