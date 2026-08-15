'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function ReviewForm({ productId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (!name.trim() || !review.trim()) {
      setError('Name and review text are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          rating,
          review_text: review,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      setMessage('Thank you! Your review has been submitted and is pending approval.');
      setRating(0);
      setName('');
      setEmail('');
      setReview('');
      
      // Keep form open briefly so they can read the success message
      setTimeout(() => {
        setIsOpen(false);
        setMessage('');
      }, 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#29b6f6] hover:bg-[#0288d1] text-white px-6 py-2 rounded-lg font-semibold transition shadow-sm"
      >
        Write a Review
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-4 max-w-2xl">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Write a Review</h3>
      
      {message ? (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 text-sm font-medium">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
          <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => setRating(star)}
              >
                {star <= (hoverRating || rating) ? (
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                ) : (
                  <Star className="w-8 h-8 text-gray-300 hover:text-yellow-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent outline-none"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent outline-none"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Review *</label>
          <textarea
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29b6f6] focus:border-transparent outline-none resize-y"
            placeholder="What did you think about this product?"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#29b6f6] hover:bg-[#0288d1] text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
