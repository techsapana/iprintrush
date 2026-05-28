/** Category slug for products shown in Same Day Printing storefront sections. */
export const SAME_DAY_PRINTING_CATEGORY_SLUG = 'same-day-printing';

export function isSameDayPrintingProduct(product) {
  if (!product) return false;
  // New model: product keeps its main category and can be additionally displayed
  // under Same Day Printing via sameDayEligible flag. Keep slug support for legacy data.
  return (
    String(product.categorySlug || '').toLowerCase() === SAME_DAY_PRINTING_CATEGORY_SLUG ||
    product.sameDayEligible === true
  );
}
