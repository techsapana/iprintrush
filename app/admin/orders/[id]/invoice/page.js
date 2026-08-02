'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '@/app/hooks/useAdmin';
import InvoiceTemplate from '@/app/components/order/InvoiceTemplate';

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

  return <InvoiceTemplate order={order} />;
}
