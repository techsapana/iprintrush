'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MailboxQuoteBuilder({ productId, productName, pricePerMonth, onQuoteReady }) {
  const [months, setMonths] = useState(1);
  const [quoteSummary, setQuoteSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async () => {
    setError('');
    setQuoteSummary(null);
    setHasCalculated(false);

    const parsedMonths = Number(months);
    if (!Number.isFinite(parsedMonths) || parsedMonths <= 0) {
      setError('Please enter a valid number of months (at least 1).');
      return;
    }

    try {
      setCalculating(true);
      const payload = {
        mode: 'mailbox',
        productId,
        months: parsedMonths,
      };

      const res = await fetch('/api/quote/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to calculate mailbox rental price');
      }

      setQuoteSummary(json);
      setHasCalculated(true);

      if (onQuoteReady && json) {
        const customizationsDisplay = {
          Service: 'Mailbox Rental',
          Duration: `${parsedMonths} month${parsedMonths === 1 ? '' : 's'}`,
        };
        onQuoteReady({
          mode: 'mailbox',
          payload,
          summary: json,
          customizationsDisplay,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate mailbox rental price');
    } finally {
      setCalculating(false);
    }
  };

  const handleMonthsChange = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      setMonths('');
      setHasCalculated(false);
      return;
    }
    setMonths(num);
    setHasCalculated(false);
  };

  const effectivePricePerMonth = Number(pricePerMonth || 0);

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Mailbox Rental – Calculate Your Plan
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose how many months you would like to rent your mailbox and we&apos;ll apply
          automatic discounts for longer terms.
        </p>

        <div className="mb-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Discount Schedule</h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>1–5 months: <span className="font-semibold">No discount</span></li>
            <li>6–10 months: <span className="font-semibold">10% off total</span></li>
            <li>11–20 months: <span className="font-semibold">15% off total</span></li>
            <li>21+ months: <span className="font-semibold">25% off total (maximum)</span></li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Months
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={months}
              onChange={(e) => handleMonthsChange(e.target.value)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
            />
          </div>

          <div className="flex-1 text-sm text-gray-700">
            <div>
              Base price per month:{' '}
              <span className="font-semibold text-gray-900">
                ${effectivePricePerMonth.toFixed(2)}
              </span>
            </div>
          </div>

          {!hasCalculated && Number(months) > 0 && (
            <Button
              type="button"
              className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white"
              onClick={handleCalculate}
              disabled={calculating}
            >
              {calculating ? 'Calculating...' : 'Calculate My Price'}
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {quoteSummary && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {productName} – Mailbox Rental Summary
            </h3>
            <div className="text-sm text-gray-800 mb-2">
              <div>
                Duration:{' '}
                <span className="font-semibold">
                  {quoteSummary.totalQuantity} month{quoteSummary.totalQuantity === 1 ? '' : 's'}
                </span>
              </div>
              <div>
                Total:{' '}
                <span className="font-bold text-[#29b6f6]">
                  ${quoteSummary.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                Effective rate:{' '}
                ${quoteSummary.unitPrice.toFixed(2)} per month
              </div>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              {quoteSummary.lineItems.map((item, idx) => (
                <li key={`${item.label}-${idx}`} className="flex justify-between">
                  <span>{item.label}</span>
                  <span>
                    {item.amount >= 0 ? '' : '-'}${Math.abs(item.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

