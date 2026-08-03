import React, { useEffect, useState } from 'react';

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAddress(addressObj) {
  if (!addressObj) return 'N/A';
  const parts = [
    addressObj.name,
    addressObj.address,
    addressObj.apartmentOrSuite,
    addressObj.city && addressObj.state ? `${addressObj.city}, ${addressObj.state} ${addressObj.zip || ''}` : '',
    addressObj.country
  ];
  return parts.filter(Boolean).map((p, i) => <div key={i}>{p}</div>);
}

export default function InvoiceTemplate({ order }) {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement');
        if (res.ok) {
          const data = await res.json();
          if (data.logoImageUrl) {
            setLogoUrl(data.logoImageUrl);
          }
        }
      } catch (err) {
        console.error('Failed to fetch logo:', err);
      }
    };
    fetchLogo();
  }, []);

  if (!order) return null;

  return (
    <div className="bg-gray-100 text-gray-900 min-h-screen py-8 print:py-0 print:bg-white">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          .no-print { display: none !important; }
          header, footer, nav, [role="navigation"] { display: none !important; }
          @page { margin: 0.5in; }
        }
      `}} />

      <div className="max-w-4xl mx-auto bg-white p-10 shadow-xl rounded-xl print:shadow-none print:p-0 print:rounded-none font-sans">
        {/* Header Controls */}
        <div className="mb-8 flex justify-between items-center no-print border-b border-gray-200 pb-4">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 bg-[#29b6f6] text-white rounded-lg font-semibold hover:bg-[#1e8fc4] shadow-md transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-14 max-w-[250px] object-contain mb-2" />
            ) : (
              <h1 className="text-4xl font-black text-[#29b6f6] tracking-tight uppercase mb-2">
                iPrintRush
              </h1>
            )}
            <div className="text-sm text-gray-500 font-medium space-y-0.5">
              <div>www.iprintrush.com</div>
              <div>support@iprintrush.com</div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-light text-gray-400 uppercase tracking-widest mb-2">
              Invoice
            </h2>
            <div className="text-lg font-bold text-gray-800">
              # {order.orderNumber}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Date: {formatDate(order.createdAt)}
            </div>
            <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 uppercase tracking-wide border border-blue-100">
              {order.workflowStatus ? order.workflowStatus.replace(/_/g, ' ') : 'Processing'}
            </div>
          </div>
        </div>

        {/* Addresses & Payment Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Payment Method
            </div>
            <div className="text-sm font-medium text-gray-800 capitalize">
              {order.paymentMethod ? order.paymentMethod.replace(/_/g, ' ') : (order.paidAt ? 'Stripe / Credit Card' : 'N/A')}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {order.paidAt ? (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Paid on {formatDate(order.paidAt)}
                </span>
              ) : (
                <span className="text-amber-600 font-medium">Payment Pending</span>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Billing Address
            </div>
            <div className="text-sm text-gray-700">
              {order.customerName && <div className="font-semibold text-gray-900 mb-1">{order.customerName}</div>}
              {formatAddress(
                order.billingAddress && Object.keys(order.billingAddress).length > 0 
                  ? order.billingAddress 
                  : order.shippingAddress
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              {order.deliveryMethod === 'pickup' ? 'Local Pickup' : 'Shipping Drop Ship'}
            </div>
            <div className="text-sm text-gray-700">
              <div className="font-semibold text-gray-900 mb-1">{order.deliveryMethod === 'pickup' ? 'Local Pickup' : 'Shipping'}</div>
              {order.deliveryMethod !== 'pickup' && formatAddress(order.shippingAddress)}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-10 overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 font-bold text-gray-600 border-b">Job ID</th>
                <th className="px-5 py-4 font-bold text-gray-600 border-b">Item Details</th>
                <th className="px-5 py-4 font-bold text-gray-600 border-b text-center">Qty</th>
                <th className="px-5 py-4 font-bold text-gray-600 border-b text-right">Price</th>
                <th className="px-5 py-4 font-bold text-gray-600 border-b text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items?.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-5 py-5 align-top font-semibold text-gray-500">
                    #{item.id}
                  </td>
                  <td className="px-5 py-5 align-top">
                    <div className="font-bold text-gray-900 text-base mb-1">{item.name}</div>
                    
                    {/* Customization output */}
                    <div className="space-y-0.5 mt-2">
                      {(() => {
                        const cust = item.customization || {};
                        const displaySource = cust.customizationsDisplay || cust;
                        const hiddenKeys = ['quotePayload', 'quoteSummary', 'mode', 'splitGroupId', 'splitSizeLabel', 'customizationsDisplay', 'artworkFiles', 'tempArtworkFiles', 'artworkReady', 'customSizeNote', 'splitQuote', 'customLineTotal', 'extraPrice', 'merchandiseSubtotal', 'shippingTierSubtotal', 'lineItems'];

                        return Object.entries(displaySource).map(([k, v]) => {
                          if (hiddenKeys.includes(k)) return null;
                          if (/size\s*breakdown/i.test(String(k))) return null;

                          let displayValue = '';
                          if (v && typeof v === 'object') {
                            if (Array.isArray(v)) {
                              displayValue = v.map(item => (typeof item === 'object' ? item.name || item.label : item)).join(', ');
                            } else {
                              displayValue = v.name || v.label;
                            }
                          } else if (v !== null && v !== undefined) {
                            displayValue = String(v);
                          }
                          
                          if (!displayValue || displayValue === '[object Object]') return null;
                          
                          return (
                            <div key={k} className="text-xs text-gray-600">
                              <span className="font-medium text-gray-700 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> {displayValue}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    {item.customization && item.customization.lineItems && item.customization.lineItems.length > 0 && (
                      <div className="mt-3 text-xs text-gray-600">
                        <strong className="uppercase text-[10px] text-gray-500 mb-1 block tracking-wider">Quote Breakdown</strong>
                        <ul className="space-y-1">
                          {item.customization.lineItems.map((line, i) => (
                            <li key={i} className="flex justify-between w-full sm:w-3/4">
                              <span>{line.label}</span>
                              <span>${Number(line.amount || 0).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.customSizeNote && (
                      <div className="text-xs mt-3 p-2 bg-amber-50 text-amber-800 rounded border border-amber-100 inline-block">
                        <span className="font-semibold">Note:</span> {item.customSizeNote}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-5 align-top text-center font-medium text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-5 align-top text-right text-gray-600">
                    ${parseFloat(item.unitPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-5 align-top text-right font-bold text-gray-900">
                    ${parseFloat(item.lineTotal || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">${parseFloat(order.amountSubtotal || 0).toFixed(2)}</span>
            </div>
            {parseFloat(order.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-green-600 bg-green-50 px-2 py-1 -mx-2 rounded">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span className="font-medium">-${parseFloat(order.discountAmount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className="font-medium">${parseFloat(order.shippingAmount || 0).toFixed(2)}</span>
            </div>
            {parseFloat(order.amountTax || 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="font-medium">${parseFloat(order.amountTax || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-gray-900 border-t-2 border-gray-900 pt-3 mt-3 text-xl">
              <span>Total</span>
              <span>${parseFloat(order.amountTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-gray-200 pt-8 mt-12 text-center text-xs text-gray-400">
          <p>Thank you for choosing iPrintRush!</p>
          <p className="mt-1">If you have any questions about this invoice, please contact support@iprintrush.com</p>
        </div>

      </div>
    </div>
  );
}
