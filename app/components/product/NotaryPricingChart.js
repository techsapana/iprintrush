'use client';

import { useEffect, useState } from 'react';

export function NotaryPricingChart() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/notary/config');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load notary configuration');
        if (cancelled) return;
        setConfig(json);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load notary configuration');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !config) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <p className="text-gray-600 text-sm">Loading notary pricing...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 shadow-sm p-6">
        <p className="text-red-700 text-sm">
          {error || 'Notary services are temporarily unavailable.'}
        </p>
      </div>
    );
  }

  // Calculate pricing examples
  const calculatePrice = (count) => {
    const baseAmount = count * Number(config.pricePerSignature || 0);
    
    let discountPercent = 0;
    if (Array.isArray(config.discountRules)) {
      for (const r of config.discountRules) {
        const min = Number(r.minSignatures);
        const max = r.maxSignatures != null ? Number(r.maxSignatures) : null;
        if (count >= min && (max == null || count <= max)) {
          discountPercent = Number(r.discountPercent || 0);
          break;
        }
      }
    }
    discountPercent = Math.min(Math.max(discountPercent, 0), 25);

    const discountAmount = (baseAmount * discountPercent) / 100;
    const totalAmount = baseAmount - discountAmount;

    return {
      count,
      baseAmount,
      discountPercent,
      discountAmount,
      totalAmount,
    };
  };

  const pricingExamples = [1, 5, 10, 15, 25, 50].map(count => calculatePrice(count));

  return (
    <section className="mt-10">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Notary Services Pricing</h2>
          <p className="text-sm text-gray-600 mt-1">
            Professional notary services for real estate and other documents. Pricing is per signature
            with automatic discounts for higher counts.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Discount Schedule</h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>1–5 signatures: <span className="font-semibold">No discount</span></li>
            <li>6–10 signatures: <span className="font-semibold">10% off total</span></li>
            <li>11–20 signatures: <span className="font-semibold">15% off total</span></li>
            <li>21+ signatures: <span className="font-semibold">25% off total (maximum)</span></li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.documentTypes.map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <div className="font-semibold text-gray-900">{doc.name}</div>
                {doc.description && (
                  <div className="text-xs text-gray-600">{doc.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Examples</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-900">Signatures</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Base Price</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Discount</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {pricingExamples.map((example, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-900">{example.count}</td>
                    <td className="text-right py-2 px-3 text-gray-700">
                      ${example.baseAmount.toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-700">
                      {example.discountPercent > 0 ? (
                        <span className="text-green-600">
                          -{example.discountPercent}% (${example.discountAmount.toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="text-right py-2 px-3 font-semibold text-[#29b6f6]">
                      ${example.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/contact" 
            className="inline-block bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-semibold py-3 px-8 rounded-lg transition"
          >
            Contact Us for Notary Services
          </a>
          <p className="text-xs text-gray-500 mt-3">
            Contact our team to schedule your notary appointment and get personalized service.
          </p>
        </div>
      </div>
    </section>
  );
}
