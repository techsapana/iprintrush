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

// Helper to render card brand logos based on payment method string
function getCardBrandIcon(methodString) {
  if (!methodString) return null;
  const str = methodString.toLowerCase();
  
  if (str.includes('visa')) {
    return (
      <svg className="w-8 h-auto" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="32" y="8" rx="4" fill="#1434CB" />
        <path fill="#fff" d="M19.7 27.6h3L24.5 17h-2.9c-.5 0-.9.3-1.1.8l-3.8 9.8h3.2l.6-1.7h3.9l.3 1.7h2.8l-3.8-10.6h-3.1l-4 10.6zm2.3-3.7l1.3-3.6 1 3.6h-2.3zM32.8 17.5c-1.3-.4-2.3-.6-3.2-.6-3.5 0-6 1.8-6 4.4 0 2 1.8 3 3 3.6 1.3.6 1.7 1 1.7 1.6 0 .9-1.1 1.4-2.2 1.4-1.5 0-2.3-.2-3.4-.7l-.4-.2-.5 3c1 .5 2.6.9 4.3.9 3.8 0 6.2-1.9 6.2-4.6 0-1.5-1-2.6-3.4-3.8-1.1-.6-1.8-1-1.8-1.6 0-.6.7-1.2 2-1.2 1 0 1.9.2 2.6.5l.4.2.4-2.9zM36.1 17h-2.4c-.6 0-1 .4-1.2.9l-4.1 9.7h3.1l.6-1.8h3.8l.4 1.8h2.9l-3.1-10.6zm.5 2.6l1 3.1h-2l1-3.1zM11.9 17L9.5 24.3l-.3-1.5c-.5-1.9-2-3.6-4.1-4.3l2.7 9.1h3.3l4.9-10.6h-4.1z" />
        <path fill="#F2A900" d="M5.1 17h-.3L2 17.4v.6c2.6.7 5.1 2.5 6 4.6l-2.9-5.6z" />
      </svg>
    );
  }
  if (str.includes('mastercard')) {
    return (
      <svg className="w-8 h-auto" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="32" y="8" rx="4" fill="#241F20" />
        <circle cx="20" cy="24" r="8" fill="#EB001B" />
        <circle cx="28" cy="24" r="8" fill="#F79E1B" fillOpacity="0.8" />
      </svg>
    );
  }
  if (str.includes('amex') || str.includes('american express')) {
    return (
      <svg className="w-8 h-auto" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="32" y="8" rx="4" fill="#006FCF" />
        <path fill="#fff" d="M16 27h-2l-3-7-3 7H6l4.5-10h2l4.5 10zm-3-2.5l-2-4.5-2 4.5h4zm11-7.5l-2.5 6-2.5-6h-2v10h2v-6l2.5 6h1l2.5-6v6h2v-10h-3zm14 0h-5v10h5v-2h-3v-2h2.5v-2H35v-2h3v-2zm-6.5 6l2-6h-2.5l-1.5 4-1.5-4h-2.5l2 6-2.5 4h2.5l1.5-4 1.5 4h2.5l-2-4z" />
      </svg>
    );
  }
  if (str.includes('discover')) {
    return (
      <svg className="w-8 h-auto" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="32" y="8" rx="4" fill="#F5F5F5" />
        <path fill="#F9A021" d="M24 16c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 13c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" />
        <path fill="#333" d="M12.5 20.5h2.5c1.1 0 2 .9 2 2s-.9 2-2 2h-2.5v-4zm-2-2v8h4.5c2.2 0 4-1.8 4-4s-1.8-4-4-4h-4.5zM38.5 24.5v-6h-2v10h2v-2h2v2h2v-10h-2v6h-2z" />
      </svg>
    );
  }
  
  // Generic Card
  return (
    <svg className="w-8 h-auto text-gray-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z" />
    </svg>
  );
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
            <div className="text-sm font-medium text-gray-800 capitalize flex items-center gap-2">
              {order.status === 'paid' ? (
                <>
                  {getCardBrandIcon(order.paymentMethod || '')}
                  {order.paymentMethod ? order.paymentMethod.replace(/_/g, ' ') : (order.paidAt ? 'Credit Card' : 'N/A')}
                </>
              ) : (
                <span className="text-gray-500 italic">Pending Checkout</span>
              )}
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
