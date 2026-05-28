'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { ProductCard } from '../components/shared/ProductCard';
import { useAdmin } from '../hooks/useAdmin';
import { useSearchParams } from 'next/navigation';
import { SAME_DAY_PRINTING_CATEGORY_SLUG, isSameDayPrintingProduct } from '../lib/siteConstants';

const PRODUCTS_PER_PAGE = 16;

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const businessCategoryParam = searchParams.get('businessCategory');
  const qParam = (searchParams.get('q') || searchParams.get('search') || '').trim();
  const { products, categories } = useAdmin();

  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'all');
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [businessCategoryProducts, setBusinessCategoryProducts] = useState([]);
  const [businessCategoryName, setBusinessCategoryName] = useState('');
  const [loadingBusinessCategory, setLoadingBusinessCategory] = useState(false);
  const [notaryImageUrl, setNotaryImageUrl] = useState('');
  const [mailboxImageUrl, setMailboxImageUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const selectedCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const selectedCategoryName = String(selectedCategoryObj?.name || '').toLowerCase();
  const selectedCategorySlug = String(selectedCategoryObj?.slug || selectedCategory || '').toLowerCase();
  const sidebarCategories = useMemo(
    () =>
      (categories || []).filter((cat) => {
        const slug = String(cat?.slug || '').toLowerCase();
        const name = String(cat?.name || '').toLowerCase().trim();
        // "All products" is already rendered as a static radio option above.
        return slug !== 'all-products' && slug !== 'all' && name !== 'all products';
      }),
    [categories],
  );
  const isSameDayPrintingView =
    selectedCategory === SAME_DAY_PRINTING_CATEGORY_SLUG ||
    categoryParam === SAME_DAY_PRINTING_CATEGORY_SLUG;
  const isMailboxNotaryCategory =
    selectedCategoryName.includes('mailbox') ||
    selectedCategoryName.includes('notary') ||
    selectedCategorySlug.includes('mailbox') ||
    selectedCategorySlug.includes('notary');

  useEffect(() => {
    if (categoryParam && categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
    }
    if (!categoryParam && qParam && selectedCategory !== 'all') {
      setSelectedCategory('all');
    }
    if (!categoryParam && !qParam && selectedCategory !== 'all') {
      setSelectedCategory('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam, qParam]);

  useEffect(() => {
    if (businessCategoryParam) {
      setLoadingBusinessCategory(true);
      fetch(`/api/business-categories/${businessCategoryParam}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.category) {
            setBusinessCategoryProducts(json.category.products || []);
            setBusinessCategoryName(json.category.name);
          }
        })
        .catch((err) => {
          console.error('Failed to load business category:', err);
        })
        .finally(() => {
          setLoadingBusinessCategory(false);
        });
    } else {
      setBusinessCategoryProducts([]);
      setBusinessCategoryName('');
    }
  }, [businessCategoryParam]);

  useEffect(() => {
    const loadSiteVisuals = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        setNotaryImageUrl(String(json.notaryImageUrl || ''));
        setMailboxImageUrl(String(json.mailboxImageUrl || ''));
      } catch {
        // ignore
      }
    };
    loadSiteVisuals();
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by business category if specified
    if (businessCategoryParam && businessCategoryProducts.length > 0) {
      const productIds = businessCategoryProducts.map((p) => p.id);
      filtered = filtered.filter((p) => productIds.includes(p.id));
    }

    // Filter by search query
    const q = qParam.toLowerCase();
    if (q) {
      filtered = filtered.filter((p) => {
        const haystack = [
          p.name,
          p.description,
          p.category,
          Array.isArray(p.features) ? p.features.join(' ') : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // Filter by category (slug from URL works even before categories[] hydrates from context)
    if (selectedCategory !== 'all') {
      if (selectedCategory === SAME_DAY_PRINTING_CATEGORY_SLUG) {
        filtered = filtered.filter((p) => isSameDayPrintingProduct(p));
      } else {
      const categoryObj = categories.find((c) => c.slug === selectedCategory);
        filtered = filtered.filter((p) => {
          if (p.categorySlug && p.categorySlug === selectedCategory) return true;
          if (
            p.categorySlug === SAME_DAY_PRINTING_CATEGORY_SLUG &&
            p.linkedCategorySlug &&
            p.linkedCategorySlug === selectedCategory
          ) {
            return true;
          }
          if (categoryObj && p.category === categoryObj.name) return true;
          return false;
        });
      }
    }

    // Sort
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, businessCategoryParam, businessCategoryProducts, qParam, selectedCategory, sortBy, priceRange, categories]);

  const totalPages =
    filteredProducts.length === 0
      ? 0
      : Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryParam, businessCategoryParam, qParam, selectedCategory, sortBy]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const showingFrom =
    filteredProducts.length === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar - Filters */}
      <aside className="lg:col-span-1">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {/* Category Filter */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Categories</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="all"
                  checked={selectedCategory === 'all'}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded"
                />
                <span className="text-gray-700">All products</span>
              </label>
              {sidebarCategories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={cat.slug}
                    checked={selectedCategory === cat.slug}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded"
                  />
                  <span className="text-gray-700">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Sort By</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700"
            >
              <option value="featured">Featured</option>
              <option value="name">Name (A-Z)</option>
              <option value="price-low">Price (Low to High)</option>
              <option value="price-high">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content - Product Grid */}
      <main className="lg:col-span-3">
        {loadingBusinessCategory && (
          <div className="mb-4 p-4 bg-gray-100 rounded-lg text-center text-gray-600">
            Loading products...
          </div>
        )}
        {businessCategoryName && !loadingBusinessCategory && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
            <span className="text-gray-800 font-medium">
              Products for: <span className="text-blue-700">{businessCategoryName}</span>
            </span>
            <Link href="/products" className="text-[#29b6f6] hover:underline font-medium text-sm">
              View all products →
            </Link>
          </div>
        )}
        {isSameDayPrintingView && (
          <div className="mb-4 p-4 bg-[#29b6f6]/10 border border-[#29b6f6]/30 rounded-lg flex items-center justify-between flex-wrap gap-2">
            <span className="text-gray-700">
              Order before 2:00 PM for same-day completion.
            </span>
            <Link href="/products" className="text-[#29b6f6] hover:underline font-medium text-sm">
              View all products →
            </Link>
          </div>
        )}
        {filteredProducts.length > 0 ? (
          <>
            <div className="mb-6 text-gray-600">
              Showing {showingFrom}–{showingTo} of {filteredProducts.length} product
              {filteredProducts.length !== 1 ? 's' : ''}
              {qParam ? (
                <span className="ml-2">
                  for "<span className="font-medium text-gray-900">{qParam}</span>"
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                aria-label="Product list pagination"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 px-2 tabular-nums">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
                {totalPages <= 12 ? (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCurrentPage(n)}
                        aria-label={`Go to page ${n}`}
                        aria-current={currentPage === n ? 'page' : undefined}
                        className={`min-w-[2.25rem] px-2 py-2 rounded-lg text-sm font-medium transition ${
                          currentPage === n
                            ? 'bg-[#29b6f6] text-white shadow-sm'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : (
          <div className="bg-white p-12 rounded-lg text-center">
            <p className="text-gray-600 text-lg">
              {isSameDayPrintingView
                ? 'No same-day products found.'
                : qParam
                  ? 'No products found for this search.'
                  : 'No products found in this category.'}
            </p>
            {isSameDayPrintingView ? (
              <Link href="/products" className="mt-4 inline-block text-[#29b6f6] hover:underline font-semibold">
                View All Products
              </Link>
            ) : (
              <button
                onClick={() => { setSelectedCategory('all'); setPriceRange([0, 200]); }}
                className="mt-4 text-[#29b6f6] hover:underline font-semibold"
              >
                View All Products
              </button>
            )}
          </div>
        )}
        
        {/* Mailbox/Notary dynamic images - Show only when mailbox-notary category is selected */}
        {isMailboxNotaryCategory && (
          <div className="lg:col-span-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {mailboxImageUrl ? (
              <img src={mailboxImageUrl} alt="Mailbox details" className="w-full rounded-xl border border-gray-200 shadow-sm" />
            ) : null}
            {notaryImageUrl ? (
              <img src={notaryImageUrl} alt="Notary details" className="w-full rounded-xl border border-gray-200 shadow-sm" />
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function ProductsLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1">
        <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </aside>
      <main className="lg:col-span-3">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
              <div className="h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ProductsPageTitle({ isSameDayPrintingCategory }) {
  return (
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
      {isSameDayPrintingCategory ? 'Same Day Printing' : 'All Products'}
    </h1>
  );
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<ProductsLoading />}>
          <ProductsPageInner />
        </Suspense>
      </div>
    </div>
  );
}

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const isSameDayPrintingCategory = categoryParam === SAME_DAY_PRINTING_CATEGORY_SLUG;
  return (
    <>
      <ProductsPageTitle isSameDayPrintingCategory={isSameDayPrintingCategory} />
      <ProductsContent />
    </>
  );
}
