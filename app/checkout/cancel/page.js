'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-6">✕</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Cancelled</h1>
          <p className="text-gray-600 text-lg mb-8">
            No worries—your card was not charged. You can try again anytime.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/checkout">
              <Button className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold">
                Return to Checkout
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="outline" className="border-[#29b6f6] text-[#29b6f6] hover:bg-[rgba(41,182,246,0.1)]">
                Back to Cart
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

