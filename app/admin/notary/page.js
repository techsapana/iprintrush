'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminNotaryPage() {
  const router = useRouter();
  const { adminUser, logoutAdmin } = useAdmin();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!adminUser) router.push('/admin/login');
  }, [adminUser, router]);

  useEffect(() => {
    if (adminUser) fetchRequests();
  }, [adminUser]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/notary-requests', {
        credentials: 'include' // Ensure cookies are sent
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setRequests(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    if (!confirm(`Are you sure you want to ${status} this request?`)) return;
    try {
      const res = await fetch(`/api/admin/notary-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (!adminUser) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notary Requests</h1>
            <p className="text-gray-600 text-sm mt-1">Manage customer notary requests</p>
          </div>
          <button
            onClick={() => { logoutAdmin(); router.push('/admin/login'); }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Request #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Signatures</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">No notary requests found.</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.request_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{req.customer_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{req.customer_email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{req.customer_phone || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{req.signature_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">${req.total_amount}</td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(req.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, 'approved')}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateStatus(req.id, 'cancelled')}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button
                              onClick={() => updateStatus(req.id, 'completed')}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Mark Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
