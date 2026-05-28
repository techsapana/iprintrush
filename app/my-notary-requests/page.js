'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

export default function MyNotaryRequestsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRequests();
    }
  }, [isAuthenticated, user]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/notary/my-requests');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setRequests(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  if (!isAuthenticated) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Notary Requests</h1>
              <p className="text-gray-600 text-sm mt-1">View the status of your notary service requests</p>
            </div>
            <Link
              href="/profile"
              className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
            >
              ← Back to Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">Loading your notary requests...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Request #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Signatures</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document Types</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        You haven't submitted any notary requests yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.request_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{req.signature_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{req.document_types || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">${req.total_amount}</td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(req.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={req.notes}>
                          {req.notes || '—'}
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
