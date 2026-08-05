'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { adminUser, adminLoading } = useAdmin();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !adminUser) {
      router.push('/admin/login');
    }
  }, [adminUser, adminLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    if (adminUser) fetchData();
  }, [adminUser]);

  if (adminLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b6f6]"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Statistics</h1>
          <p className="text-gray-500 mt-1">Overview of your sales, products, and customers</p>
        </div>
        <Link href="/admin/dashboard" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Overall Revenue</h2>
          <div className="mt-2 text-4xl font-bold text-gray-900">
            ${data.totalRevenue?.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Monthly Revenue (Last 30 Days)</h2>
          <div className="mt-2 text-4xl font-bold text-[#29b6f6]">
            ${data.salesByMonth?.[data.salesByMonth.length - 1]?.revenue?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Sales & Revenue by Month</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.salesByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#29b6f6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 13, fontWeight: 500}} 
                dy={10} 
                tickFormatter={(val) => {
                  try {
                    return format(parseISO(`${val}-01`), 'MMM yyyy');
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis 
                yAxisId="left" 
                tickFormatter={(value) => `$${value}`} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 12}} 
                dx={-10} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickFormatter={(value) => `${value}`} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 12}} 
                dx={10} 
              />
              <Tooltip 
                cursor={{fill: 'rgba(243, 244, 246, 0.4)'}}
                contentStyle={{
                  borderRadius: '12px', 
                  border: '1px solid #E5E7EB', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  padding: '12px 16px'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                labelFormatter={(val) => {
                  try {
                    return format(parseISO(`${val}-01`), 'MMMM yyyy');
                  } catch {
                    return val;
                  }
                }}
                formatter={(value, name) => [
                  name === 'revenue' ? `$${value.toFixed(2)}` : value, 
                  name === 'revenue' ? 'Total Revenue' : 'Total Orders'
                ]}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="revenue" 
                fill="url(#colorRevenue)" 
                radius={[6, 6, 0, 0]} 
                name="revenue" 
                maxBarSize={60} 
              />
              <Bar 
                yAxisId="right" 
                dataKey="sales" 
                fill="url(#colorSales)" 
                radius={[6, 6, 0, 0]} 
                name="sales" 
                maxBarSize={60} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Top Purchasing Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Product Name</th>
                  <th className="px-6 py-3 font-semibold text-right">Quantity Sold</th>
                  <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topProducts?.map((product, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 truncate max-w-[200px]">{product.productName}</td>
                    <td className="px-6 py-4 text-right">{product.totalQuantity}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">${product.totalRevenue?.toFixed(2)}</td>
                  </tr>
                ))}
                {(!data.topProducts || data.topProducts.length === 0) && (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No product data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Top 10 Customers (By Spend)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Customer</th>
                  <th className="px-6 py-3 font-semibold text-right">Total Orders</th>
                  <th className="px-6 py-3 font-semibold text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topCustomers?.map((customer, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{customer.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4 text-right">{customer.totalOrders}</td>
                    <td className="px-6 py-4 text-right font-medium text-[#29b6f6]">${customer.totalSpent?.toFixed(2)}</td>
                  </tr>
                ))}
                {(!data.topCustomers || data.topCustomers.length === 0) && (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No customer data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
