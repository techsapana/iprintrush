'use client';

import React, { useEffect, useState } from 'react';
import ReviewForm from './ReviewForm';
import { Star } from 'lucide-react';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/reviews`);
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 0);
          setTotalReviews(data.totalReviews || 0);
        }
      } catch (err) {
        console.error('Failed to fetch reviews', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mt-16 pt-10 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="col-span-1 bg-gray-50 p-6 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">{averageRating.toFixed(1)}</div>
          {renderStars(averageRating)}
          <p className="text-gray-500 mt-2 text-sm">Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
        </div>
        
        <div className="col-span-2 flex flex-col justify-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Share your thoughts</h3>
          <p className="text-gray-600 mb-4 text-sm">
            If you've used this product, we'd love to hear about your experience. Your feedback helps others make better decisions.
          </p>
          <div>
            <ReviewForm productId={productId} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <p className="text-gray-500">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500 italic">No reviews yet. Be the first to review this product!</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900">{review.customer_name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {renderStars(review.rating)}
              </div>
              <p className="text-gray-700 leading-relaxed text-sm">{review.review_text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
