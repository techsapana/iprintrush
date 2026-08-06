'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '@/app/hooks/useAdmin';
import InvoiceTemplate from '@/app/components/order/InvoiceTemplate';
import Link from 'next/link';

export default function AdminOrderInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { adminUser, adminLoading } = useAdmin();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !adminUser) router.push('/admin/login');
  }, [adminUser, adminLoading, router]);

  useEffect(() => {
    if (!adminUser || !params?.id) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/orders/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch order');
        const data = await res.json();
        if (data.order) {
          setOrder({ ...data.order, items: data.items || [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [adminUser, params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading invoice...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Invoice not found.</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-[#29b6f6] hover:text-[#1e8fc4] flex items-center gap-1 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Order
        </Link>
      </div>
      <InvoiceTemplate order={order} />
    </div>
  );
}
