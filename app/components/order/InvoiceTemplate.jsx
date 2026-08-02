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
    <div className="bg-white text-black min-h-screen">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; }
        }
      `}} />

      <div className="max-w-4xl mx-auto p-8 font-sans">
        {/* Header Controls */}
        <div className="mb-6 flex justify-between items-center no-print">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#29b6f6] text-white rounded font-medium hover:bg-[#1e8fc4] shadow-sm"
          >
            Print Invoice
          </button>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 shadow-sm"
          >
            Go Back
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-12 max-w-[250px] object-contain mb-1" />
            ) : (
              <h1 className="text-3xl font-black text-[#29b6f6] tracking-tight uppercase">
                iPrintRush
              </h1>
            )}
            <div className="text-sm text-gray-500 mt-1">
              www.iprintrush.com
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800">
              Invoice of Order {order.orderNumber}
            </h2>
            <div className="text-gray-600 mt-1">
              Invoice Date: {formatDate(order.createdAt)}
            </div>
          </div>
        </div>

        {/* Addresses & Payment Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border rounded">
            <div className="bg-gray-100 px-3 py-2 border-b font-bold text-sm text-gray-800">
              Payment Method
            </div>
            <div className="p-3 text-sm text-gray-700 h-24 flex flex-col justify-center capitalize">
              {order.paymentMethod ? order.paymentMethod.replace(/_/g, ' ') : 'N/A'}
              <div className="mt-1 text-gray-500">
                {order.paidAt ? `Paid on ${formatDate(order.paidAt)}` : 'Payment Pending'}
              </div>
            </div>
          </div>
          
          <div className="border rounded">
            <div className="bg-gray-100 px-3 py-2 border-b font-bold text-sm text-gray-800">
              Billing Address
            </div>
            <div className="p-3 text-sm text-gray-700 h-24 overflow-hidden">
              {order.customerName && <div className="font-semibold mb-1">{order.customerName}</div>}
              {formatAddress(order.billingAddress)}
            </div>
          </div>

          <div className="border rounded">
            <div className="bg-gray-100 px-3 py-2 border-b font-bold text-sm text-gray-800">
              Shipping Drop Ship
            </div>
            <div className="p-3 text-sm text-gray-700 h-24 overflow-hidden">
              <div className="font-semibold mb-1">{order.deliveryMethod === 'pickup' ? 'Local Pickup' : 'Shipping'}</div>
              {order.deliveryMethod !== 'pickup' && formatAddress(order.shippingAddress)}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border rounded mb-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-800">
                <th className="px-3 py-2 font-bold border-b">Job ID</th>
                <th className="px-3 py-2 font-bold border-b">Item Details</th>
                <th className="px-3 py-2 font-bold border-b text-center">Qty</th>
                <th className="px-3 py-2 font-bold border-b text-right">Unit Price</th>
                <th className="px-3 py-2 font-bold border-b text-right">Sub-Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={item.id} className={idx !== order.items.length - 1 ? 'border-b' : ''}>
                  <td className="px-3 py-3 align-top font-medium text-gray-700">
                    #{item.id}
                  </td>
                  <td className="px-3 py-3 align-top text-gray-600">
                    <div className="font-bold text-gray-800 mb-1">{item.name}</div>
                    
                    {/* Customization output */}
                    {item.customization && Object.entries(item.customization).map(([k, v]) => {
                      if (v && typeof v === 'object' && v.name) {
                        return (
                          <div key={k} className="text-xs mb-0.5">
                            <span className="font-medium text-gray-700 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> {v.name}
                          </div>
                        );
                      }
                      if (v && typeof v === 'string') {
                        return (
                          <div key={k} className="text-xs mb-0.5">
                            <span className="font-medium text-gray-700 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> {v}
                          </div>
                        );
                      }
                      return null;
                    })}
                    {item.customSizeNote && (
                      <div className="text-xs mt-1 text-gray-500 italic">
                        Note: {item.customSizeNote}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-center text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-3 align-top text-right text-gray-700">
                    ${parseFloat(item.unitPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 align-top text-right font-medium text-gray-800">
                    ${parseFloat(item.lineTotal || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sub-Total</span>
              <span>${parseFloat(order.amountSubtotal || 0).toFixed(2)}</span>
            </div>
            {parseFloat(order.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span>-${parseFloat(order.discountAmount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>${parseFloat(order.shippingAmount || 0).toFixed(2)}</span>
            </div>
            {parseFloat(order.amountTax || 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${parseFloat(order.amountTax || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t pt-2 text-base">
              <span>Total</span>
              <span>${parseFloat(order.amountTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div>
          <div className="bg-gray-100 px-3 py-2 border font-bold text-sm text-gray-800">
            Payment History
          </div>
          <div className="border border-t-0 p-4 text-sm text-gray-600">
            {order.paidAt ? (
              <div className="flex gap-4">
                <span>{formatDate(order.paidAt)}</span>
                <span className="capitalize">{order.paymentMethod ? order.paymentMethod.replace(/_/g, ' ') : 'Card'}</span>
                <span className="font-medium text-gray-900">${parseFloat(order.amountTotal || 0).toFixed(2)}</span>
                <span className="text-green-600 font-medium">Successful</span>
              </div>
            ) : (
              <div>No payment history found or payment is pending.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
