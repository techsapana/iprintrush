export function buildQuoteCartEntries(currentQuote, product) {
  if (!currentQuote || !currentQuote.summary) return [];
  const summary = currentQuote.summary;
  const breakdown = Array.isArray(summary.sizeBreakdown) ? summary.sizeBreakdown : [];
  const totalQty = Number(summary.totalQuantity || 1);
  const merchandiseSubtotal = Number(summary.merchandiseSubtotal || summary.grandTotal || 0);
  const shippingTierSubtotal = Number(summary.shippingTierSubtotal || summary.grandTotal || 0);

  if (breakdown.length <= 1) {
    return [
      {
        quantity: totalQty,
        quotePayload: currentQuote.payload,
        quoteSummary: summary,
        merchandiseSubtotal,
        shippingTierSubtotal,
        customizationsDisplay: currentQuote.customizationsDisplay,
        artworkReady: currentQuote.payload?.artworkReady === true,
        tempArtworkFiles: currentQuote.payload?.tempArtworkFiles || [],
        artworkFiles: currentQuote.payload?.artworkFiles || [],
        customSizeNote: currentQuote.payload?.customSizeNote || '',
      },
    ];
  }

  // Split one quote into per-size cart lines
  const unit = Number(summary.grandTotal || 0) / totalQty;
  const splitGroupId = `${product.id}-${Date.now()}`;
  let running = 0;
  let runningMerchandise = 0;
  let runningShippingTierSubtotal = 0;
  return breakdown
    .filter((s) => Number(s?.quantity || 0) > 0)
    .map((s, index, arr) => {
      const qty = Number(s.quantity || 0);
      let lineTotal = Number((unit * qty).toFixed(2));
      if (index === arr.length - 1) {
        lineTotal = Number((Number(summary.grandTotal || 0) - running).toFixed(2));
      } else {
        running = Number((running + lineTotal).toFixed(2));
      }
      let merchandiseLineTotal = Number(((merchandiseSubtotal / totalQty) * qty).toFixed(2));
      if (index === arr.length - 1) {
        merchandiseLineTotal = Number((merchandiseSubtotal - runningMerchandise).toFixed(2));
      } else {
        runningMerchandise = Number((runningMerchandise + merchandiseLineTotal).toFixed(2));
      }
      let shippingTierLineTotal = Number(((shippingTierSubtotal / totalQty) * qty).toFixed(2));
      if (index === arr.length - 1) {
        shippingTierLineTotal = Number((shippingTierSubtotal - runningShippingTierSubtotal).toFixed(2));
      } else {
        runningShippingTierSubtotal = Number((runningShippingTierSubtotal + shippingTierLineTotal).toFixed(2));
      }
      const splitDisplay = {
        ...(currentQuote.customizationsDisplay || {}),
        Size: s.sizeLabel || 'Selected size',
      };
      return {
        quantity: qty,
        quotePayload: currentQuote.payload,
        quoteSummary: {
          ...summary,
          totalQuantity: qty,
          unitPrice: qty > 0 ? lineTotal / qty : 0,
          grandTotal: lineTotal,
          merchandiseSubtotal: merchandiseLineTotal,
          shippingTierSubtotal: shippingTierLineTotal,
          sizeBreakdown: [{ sizeLabel: s.sizeLabel || 'Selected size', quantity: qty }],
        },
        merchandiseSubtotal: merchandiseLineTotal,
        shippingTierSubtotal: shippingTierLineTotal,
        customizationsDisplay: splitDisplay,
        artworkReady: currentQuote.payload?.artworkReady === true,
        tempArtworkFiles: currentQuote.payload?.tempArtworkFiles || [],
        artworkFiles: currentQuote.payload?.artworkFiles || [],
        customSizeNote: currentQuote.payload?.customSizeNote || '',
        splitQuote: true,
        splitSizeId: s.sizeId,
        splitSizeLabel: s.sizeLabel || 'Selected size',
        splitGroupId,
      };
    });
}
