'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminReviewsPage() {
  const router = useRouter();
  const { adminUser, loading: authLoading } = useAdmin();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !adminUser) {
      router.push('/admin/login');
    }
  }, [adminUser, authLoading, router]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews || []);
      } else {
        setError(data.error || 'Failed to fetch reviews');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      fetchReviews();
    }
  }, [adminUser]);

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (authLoading || loading) return <div className="p-8">Loading reviews...</div>;
  if (!adminUser) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Manage Product Reviews</h1>
          <p className="text-gray-600 text-sm mt-1">Approve, reject, or delete customer reviews before they appear on the site.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>}

        <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {review.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.customer_name}
                    <br />
                    <span className="text-xs text-gray-400">{review.customer_email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.rating} / 5
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={review.review_text}>
                    {review.review_text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${review.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        review.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {review.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusChange(review.id, 'approved')} className="text-green-600 hover:text-green-900 mr-3">Approve</button>
                        <button onClick={() => handleStatusChange(review.id, 'rejected')} className="text-red-600 hover:text-red-900 mr-3">Reject</button>
                      </>
                    )}
                    {review.status === 'rejected' && (
                      <button onClick={() => handleStatusChange(review.id, 'approved')} className="text-green-600 hover:text-green-900 mr-3">Approve</button>
                    )}
                    {review.status === 'approved' && (
                      <button onClick={() => handleStatusChange(review.id, 'rejected')} className="text-orange-600 hover:text-orange-900 mr-3">Revoke</button>
                    )}
                    <button onClick={() => handleDelete(review.id)} className="text-gray-500 hover:text-gray-900">Delete</button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">No reviews found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
