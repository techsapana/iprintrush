'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import InvoiceTemplate from '@/app/components/order/InvoiceTemplate';

export default function CustomerOrderInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.email || !params?.orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/orders/user?email=${encodeURIComponent(user.email)}&orderId=${params.orderId}`
        );
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
  }, [user?.email, params?.orderId]);

  if (authLoading || loading) {
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
