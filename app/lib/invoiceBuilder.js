'use client';

const formatAmount = (amount) => {
  const abs = Math.abs(amount).toFixed(2);
  return amount < 0 ? `- $${abs}` : `$${abs}`;
};

const getLineItemType = (item) => {
  const label = (item.label || '').toLowerCase();
  if (item.amount < 0) return 'discount';
  if (label.includes('rush') || label.includes('2 hour') || label.includes('turnaround')) {
    return 'rush';
  }
  return 'normal';
};

const buildInvoiceHTML = (quoteSummary, productInfo) => {
  if (!quoteSummary) return '<div>No quote data available</div>';

  const {
    productName = 'Product Quote',
    totalQuantity = 0,
    unitPrice = 0,
    subtotal = 0,
    shipping = 0,
    grandTotal = 0,
    lineItems = [],
    selections = {},
    deliveryMethod = 'pickup',
  } = quoteSummary;

  const selectionEntries = Object.entries(selections || {})
    .map(([key, value]) => `<div class="flex justify-between py-1"><span class="text-gray-600">${key}:</span><span class="text-gray-900">${value}</span></div>`)
    .join('');

  const lineItemsHTML = lineItems
    .map((item) => {
      const type = getLineItemType(item);
      const colorClass =
        type === 'discount' ? 'text-emerald-700' :
        type === 'rush' ? 'text-amber-700' : 'text-gray-900';
      return `<div class="flex justify-between py-1"><span class="${colorClass}">${item.label}:</span><span class="${colorClass}">${formatAmount(item.amount)}</span></div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quote - ${productName}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.5in; }
    * { box-shadow: none !important; border-radius: 0 !important; text-shadow: none !important; }
    body { padding: 0 !important; margin: 0 !important; background: #fff !important; color: #000 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; }
    .invoice-container { max-width: 8.5in; margin: 0 auto; padding: 0.5in; }
    .invoice-header { border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .invoice-title { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 0.5rem 0; }
    .invoice-meta { font-size: 14px; color: #6b7280; }
    .invoice-section { margin-bottom: 1.5rem; }
    .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin: 0 0 0.75rem 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
    .totals-row { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 14px; }
    .totals-row.final { border-top: 2px solid #e5e7eb; font-weight: 600; font-size: 16px; }
    .discount { color: #059669; }
    .rush { color: #d97706; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
    .print-hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <h1 class="invoice-title">Quote Summary</h1>
      <div class="invoice-meta">Product: ${productName}</div>
    </div>

    <div class="invoice-section">
      <div class="section-title">Order Summary</div>
      <div class="totals-row"><span>Total Quantity:</span><span>${totalQuantity} pcs</span></div>
      <div class="totals-row"><span>Unit Price:</span><span>$${Number(unitPrice).toFixed(2)} per piece</span></div>
    </div>

    ${selectionEntries ? `<div class="invoice-section"><div class="section-title">Selections</div>${selectionEntries}</div>` : ''}

    <div class="invoice-section">
      <div class="section-title">Charges Breakdown</div>
      ${lineItemsHTML}
    </div>

    <div class="invoice-section">
      <div class="section-title">Price Summary</div>
      ${!lineItems.some(item => item.amount < 0) ? `<div class="totals-row"><span>Subtotal:</span><span>$${Number(subtotal).toFixed(2)}</span></div>` : ''}
      <div class="totals-row"><span>Shipping:</span><span>$${Number(shipping).toFixed(2)}</span></div>
      <div class="totals-row final"><span>Grand Total:</span><span>$${Number(grandTotal).toFixed(2)}</span></div>
    </div>

    <div class="footer">
      Generated from Print & Shipping System
    </div>
  </div>
</body>
</html>`;
};

const buildInvoiceText = (quoteSummary, productInfo) => {
  if (!quoteSummary) return 'No quote data available';

  const {
    productName = 'Product',
    totalQuantity = 0,
    unitPrice = 0,
    subtotal = 0,
    shipping = 0,
    grandTotal = 0,
    lineItems = [],
    selections = {},
    deliveryMethod = 'pickup',
  } = quoteSummary;

  const quoteLines = [
    `Quote for: ${productName}`,
    `Total Quantity: ${totalQuantity} pcs`,
    `Unit Price: $${Number(unitPrice).toFixed(2)}`,
    `Subtotal: $${Number(subtotal).toFixed(2)}`,
    `Shipping: $${Number(shipping).toFixed(2)}`,
    `Grand Total: $${Number(grandTotal).toFixed(2)}`,
    '',
    'Selections:',
  ];

  if (selections && Object.keys(selections).length > 0) {
    Object.entries(selections).forEach(([key, value]) => {
      quoteLines.push(`- ${key}: ${value}`);
    });
  }

  quoteLines.push('', 'Charges Breakdown:');

  lineItems.forEach((item) => {
    quoteLines.push(`- ${item.label}: ${formatAmount(item.amount)}`);
  });

  quoteLines.push('', `Store Location: ${deliveryMethod === 'pickup' ? 'Fair Oaks, CA' : '—'}`);
  quoteLines.push('', 'Generated from Print & Shipping System');

  return quoteLines.join('\n');
};

const buildInvoiceSharePayload = (quoteSummary, productInfo) => {
  const text = buildInvoiceText(quoteSummary, productInfo);
  const encoded = btoa(encodeURIComponent(JSON.stringify({
    ...quoteSummary,
    ...productInfo,
  })));
  return {
    title: `Quote - ${productInfo?.productName || 'Product'}`,
    text,
    url: `${window.location.origin}/quote/share?data=${encoded}`,
    fallbackText: text,
  };
};

export { buildInvoiceHTML, buildInvoiceText, buildInvoiceSharePayload };