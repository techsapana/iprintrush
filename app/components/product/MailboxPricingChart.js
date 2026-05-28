'use client';

export function MailboxPricingChart({ pricePerMonth = 0 }) {
  const monthly = Number(pricePerMonth) || 0;
  const per3 = monthly * 3 * 0.97; // small discount example
  const per6 = monthly * 6 * 0.95;
  const per12 = monthly * 12 * 0.9;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-3">Mailbox Pricing</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-gray-600">Monthly</div>
          <div className="text-[#29b6f6] font-semibold">${monthly.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-gray-600">3 Months</div>
          <div className="text-[#29b6f6] font-semibold">${per3.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-gray-600">6 Months</div>
          <div className="text-[#29b6f6] font-semibold">${per6.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-gray-600">12 Months</div>
          <div className="text-[#29b6f6] font-semibold">${per12.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

