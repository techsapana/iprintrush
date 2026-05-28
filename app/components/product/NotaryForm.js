'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function NotaryForm() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [signatureCount, setSignatureCount] = useState(1);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [notes, setNotes] = useState('');

  const [quote, setQuote] = useState(null);

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

  const toggleDoc = (id) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const computeLocalQuote = () => {
    if (!config) return null;
    const count = Number(signatureCount || 0);
    if (!Number.isFinite(count) || count <= 0) return null;

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
      signatureCount: count,
      baseAmount,
      discountPercent,
      discountAmount,
      totalAmount,
    };
  };

  useEffect(() => {
    setQuote(computeLocalQuote());
  }, [signatureCount, config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const count = Number(signatureCount || 0);
    if (!Number.isFinite(count) || count <= 0) {
      setError('Please enter a valid number of signatures (at least 1).');
      return;
    }
    if (!selectedDocs.length) {
      setError('Please select at least one document type.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/notary/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          signatureCount: count,
          documentTypeIds: selectedDocs,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit notary request');
      }

      setQuote(json.summary || null);
      setSuccess(
        `Your notary request has been submitted. Reference number: ${json.requestNumber}`,
      );
    } catch (err) {
      setError(err.message || 'Failed to submit notary request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <p className="text-gray-600 text-sm">Loading notary options...</p>
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

  return (
    <section className="mt-10">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notary Services Request</h2>
            <p className="text-sm text-gray-600 mt-1">
              Submit a notary request for real estate and other documents. Pricing is per signature
              with automatic discounts for higher counts.
            </p>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">
              ${Number(config.pricePerSignature || 0).toFixed(2)}
            </span>{' '}
            per signature
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Discount Schedule</h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>1–5 signatures: <span className="font-semibold">No discount</span></li>
            <li>6–10 signatures: <span className="font-semibold">10% off total</span></li>
            <li>11–20 signatures: <span className="font-semibold">15% off total</span></li>
            <li>21+ signatures: <span className="font-semibold">25% off total (maximum)</span></li>
          </ul>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name (optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Signatures *
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={signatureCount}
                onChange={(e) => setSignatureCount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              />
            </div>

            {quote && (
              <div className="md:col-span-2 text-sm text-gray-800 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <div>
                  Estimated total:{' '}
                  <span className="font-bold text-[#29b6f6]">
                    ${quote.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Base: ${quote.baseAmount.toFixed(2)} · Discount:{' '}
                  {quote.discountPercent.toFixed(2)}% (
                  ${quote.discountAmount.toFixed(2)})
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Types *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config.documentTypes.map((doc) => {
                const checked = selectedDocs.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                      checked
                        ? 'border-[#29b6f6] bg-[#29b6f6]/5'
                        : 'border-gray-200 hover:border-[#29b6f6]/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#29b6f6] focus:ring-[#29b6f6]"
                      checked={checked}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{doc.name}</div>
                      {doc.description && (
                        <div className="text-xs text-gray-600">{doc.description}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Special Instructions (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              placeholder="Preferred appointment time, additional details, etc."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="text-xs text-gray-500">
              This form submits a notary request. A team member will confirm your appointment and
              finalize details before signing.
            </div>
            <Button
              type="submit"
              className="bg-[#0f172a] hover:bg-[#020617] text-white"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Notary Request'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

