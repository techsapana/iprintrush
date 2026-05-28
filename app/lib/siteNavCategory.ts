import { SAME_DAY_PRINTING_CATEGORY_SLUG } from './siteConstants';

/** Categories shown in the horizontal navbar strip (matches `Navbar` filter). */
export function isNavbarStripCategory(category: { slug?: string; name?: string } | null | undefined) {
  if (!category) return false;
  const slug = String(category.slug || '').toLowerCase();
  const name = String(category.name || '').toLowerCase();
  if (slug === 'all-products' || name === 'all products') return false;
  if (slug === SAME_DAY_PRINTING_CATEGORY_SLUG) return false;
  return true;
}
