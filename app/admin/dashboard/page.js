'use client';

import { useEffect } from 'react';
import { isSameDayPrintingProduct } from '../../lib/siteConstants';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminDashboardPage() {
   const router = useRouter();
   const { adminUser, adminLoading, logoutAdmin, products, categories } = useAdmin();
   const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [promoHeadline, setPromoHeadline] = useState('');
  const [promoSubheadline, setPromoSubheadline] = useState('');
  const [promoBannerImageUrl, setPromoBannerImageUrl] = useState('');
  const [notaryImageUrl, setNotaryImageUrl] = useState('');
  const [mailboxImageUrl, setMailboxImageUrl] = useState('');
  const [logoImageUrl, setLogoImageUrl] = useState('');
  const [heroDesktopImageUrl, setHeroDesktopImageUrl] = useState('');
  const [heroMobileImageUrl, setHeroMobileImageUrl] = useState('');
  const [openingDay, setOpeningDay] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactFaqs, setContactFaqs] = useState([
    { question: '', answer: '' },
  ]);

useEffect(() => {
     if (!adminLoading && !adminUser) {
       router.push('/admin/login');
     }
   }, [adminUser, adminLoading, router]);

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setAnnouncementText(data.announcementText || '');
        setAnnouncementEnabled(data.announcementEnabled !== false);
        setTaxRatePercent(Number(data.taxRatePercent || 0));
        setPromoHeadline(data.promoHeadline || '');
        setPromoSubheadline(data.promoSubheadline || '');
        setPromoBannerImageUrl(data.promoBannerImageUrl || '');
        setNotaryImageUrl(data.notaryImageUrl || '');
        setMailboxImageUrl(data.mailboxImageUrl || '');
        setLogoImageUrl(data.logoImageUrl || '');
        setHeroDesktopImageUrl(data.heroDesktopImageUrl || '');
        setHeroMobileImageUrl(data.heroMobileImageUrl || '');
        setOpeningDay(data.openingDay || '');
        setClosingDay(data.closingDay || '');
        setOpeningTime(data.openingTime || '');
        setClosingTime(data.closingTime || '');
        setContactPhone(data.contactPhone || '');
        setContactEmail(data.contactEmail || '');
        setContactFaqs(
          Array.isArray(data.contactFaqs) && data.contactFaqs.length
            ? data.contactFaqs
            : [{ question: '', answer: '' }],
        );
      } catch {
      }
    };
    loadAnnouncement();
  }, []);

  if (adminLoading || !adminUser) return null;

  const handleLogout = () => {
    logoutAdmin();
    router.push('/admin/login');
  };

  const uploadSiteImage = async (file, targetSetter, folder = 'site-settings') => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) throw new Error(json?.error || 'Upload failed');
    targetSetter(json.url);
  };

  const saveAnnouncement = async () => {
    try {
      setAnnouncementLoading(true);
      setAnnouncementMessage('');
      const res = await fetch('/api/site-settings/announcement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementText,
          announcementEnabled,
          taxRatePercent,
          promoHeadline,
          promoSubheadline,
          promoBannerImageUrl,
          notaryImageUrl,
          mailboxImageUrl,
          logoImageUrl,
          heroDesktopImageUrl,
          heroMobileImageUrl,
          openingDay,
          closingDay,
          openingTime,
          closingTime,
          contactPhone,
          contactEmail,
          contactFaqs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save announcement settings');
      setAnnouncementMessage('Announcement bar updated successfully.');
    } catch (err) {
      setAnnouncementMessage(err?.message || 'Failed to save announcement settings.');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm mt-1">Welcome, {adminUser.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Total Products</h3>
            <p className="text-4xl font-bold text-[#29b6f6]">{products.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Total Categories</h3>
            <p className="text-4xl font-bold text-green-600">{categories.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Same-day category products</h3>
            <p className="text-4xl font-bold text-purple-600">
              {products.filter((p) => isSameDayPrintingProduct(p)).length}
            </p>
          </div>
        </div>

        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Announcement Bar</h2>
          <p className="text-sm text-gray-600 mb-4">
            Control the black announcement bar text shown below the navbar.
          </p>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Enable announcement bar</span>
            </label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              rows={3}
              placeholder="Enter announcement text..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
            />
            <div className="max-w-xs">
              <label className="block text-sm text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Branding Assets</h3>
              <p className="text-xs text-gray-500 mb-3">
                Upload logo and hero images. Public site falls back to static assets when these are empty.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Logo Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadSiteImage(file, setLogoImageUrl);
                      } catch (err) {
                        setAnnouncementMessage(err?.message || 'Failed to upload image');
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {logoImageUrl && <img src={logoImageUrl} alt="Logo" className="mt-2 h-16 rounded object-contain border bg-white" />}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Hero Image (Desktop/Wide)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadSiteImage(file, setHeroDesktopImageUrl);
                      } catch (err) {
                        setAnnouncementMessage(err?.message || 'Failed to upload image');
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {heroDesktopImageUrl && <img src={heroDesktopImageUrl} alt="Hero desktop" className="mt-2 h-20 w-full rounded object-cover border" />}
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Hero Image (Mobile)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadSiteImage(file, setHeroMobileImageUrl);
                      } catch (err) {
                        setAnnouncementMessage(err?.message || 'Failed to upload image');
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {heroMobileImageUrl && <img src={heroMobileImageUrl} alt="Hero mobile" className="mt-2 h-20 w-full rounded object-cover border" />}
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Home Page Promo Banner</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={promoHeadline}
                    onChange={(e) => setPromoHeadline(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                    placeholder="Stock up on business essentials for the new year"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Subheadline</label>
                  <input
                    type="text"
                    value={promoSubheadline}
                    onChange={(e) => setPromoSubheadline(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                    placeholder="Get everything you need to start 2026 strong"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Leave blank to hide this promo text (banner will still render but without text).
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Promo Background Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadSiteImage(file, setPromoBannerImageUrl);
                      } catch (err) {
                        setAnnouncementMessage(err?.message || 'Failed to upload image');
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {promoBannerImageUrl && <img src={promoBannerImageUrl} alt="Promo" className="mt-2 h-24 rounded object-cover border" />}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Notary Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await uploadSiteImage(file, setNotaryImageUrl);
                        } catch (err) {
                          setAnnouncementMessage(err?.message || 'Failed to upload image');
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    {notaryImageUrl && <img src={notaryImageUrl} alt="Notary" className="mt-2 h-20 rounded object-cover border" />}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Mailbox Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await uploadSiteImage(file, setMailboxImageUrl);
                        } catch (err) {
                          setAnnouncementMessage(err?.message || 'Failed to upload image');
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    {mailboxImageUrl && <img src={mailboxImageUrl} alt="Mailbox" className="mt-2 h-20 rounded object-cover border" />}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Page Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Open From (Day)</label>
                  <input
                    type="text"
                    value={openingDay}
                    onChange={(e) => setOpeningDay(e.target.value)}
                    placeholder="Monday"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Open To (Day)</label>
                  <input
                    type="text"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    placeholder="Saturday"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Opening Time</label>
                  <input
                    type="text"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    placeholder="8:00 AM"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Closing Time</label>
                  <input
                    type="text"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    placeholder="6:00 PM"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="1-800-PRINT-24"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="info@iprintrush.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">Contact Page FAQs</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setContactFaqs((prev) => [...prev, { question: '', answer: '' }])
                    }
                    className="text-xs text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                  >
                    + Add FAQ
                  </button>
                </div>
                <div className="space-y-3">
                  {contactFaqs.map((faq, idx) => (
                    <div key={`faq-${idx}`} className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <input
                        type="text"
                        value={faq.question || ''}
                        onChange={(e) =>
                          setContactFaqs((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, question: e.target.value } : x)),
                          )
                        }
                        placeholder="Question"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <textarea
                        value={faq.answer || ''}
                        onChange={(e) =>
                          setContactFaqs((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)),
                          )
                        }
                        placeholder="Answer"
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setContactFaqs((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveAnnouncement}
                disabled={announcementLoading}
                className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg hover:bg-[#1e8fc4] transition disabled:opacity-60"
              >
                {announcementLoading ? 'Saving...' : 'Save'}
              </button>
              {announcementMessage && (
                <span className="text-sm text-gray-600">{announcementMessage}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-[#29b6f6] text-white p-6">
              <h2 className="text-xl font-bold">Products Management</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Manage your product catalog. Add, edit, or delete products.
              </p>
              <div className="space-y-3">
                <Link
                  href="/admin/products"
                  className="block w-full bg-[#29b6f6] text-white text-center py-2 rounded-lg hover:bg-[#1e8fc4] transition font-medium"
                >
                  View All Products
                </Link>
                <Link
                  href="/admin/products/new"
                  className="block w-full bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Add New Product
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-purple-600 text-white p-6">
              <h2 className="text-xl font-bold">Categories Management</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Manage product categories. Organize your catalog structure.
              </p>
              <div className="space-y-3">
                <Link
                  href="/admin/categories"
                  className="block w-full bg-purple-600 text-white text-center py-2 rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  View All Categories
                </Link>
                <Link
                  href="/admin/categories/new"
                  className="block w-full bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Add New Category
                </Link>
                <Link
                  href="/admin/category-customization"
                  className="block w-full bg-amber-600 text-white text-center py-2 rounded-lg hover:bg-amber-700 transition font-medium"
                >
                  Category Customizations
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-sky-700 text-white p-6">
              <h2 className="text-xl font-bold">Homepage hero — Same day strip</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-sm">
                Pick which same-day products appear in the carousel under the hero. If none are selected, the site
                shows the five latest same-day products automatically.
              </p>
              <Link
                href="/admin/hero-same-day"
                className="block w-full bg-sky-700 text-white text-center py-2 rounded-lg hover:bg-sky-800 transition font-medium"
              >
                Manage hero products
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-violet-700 text-white p-6">
              <h2 className="text-xl font-bold">Homepage Custom Apparels</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-sm">
                Choose which Custom Apparels products appear in the homepage slider.
              </p>
              <Link
                href="/admin/home-custom-apparel"
                className="block w-full bg-violet-700 text-white text-center py-2 rounded-lg hover:bg-violet-800 transition font-medium"
              >
                Manage homepage apparels
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-slate-700 text-white p-6">
              <h2 className="text-xl font-bold">Navbar category order</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4 text-sm">
                Swap the order of category links in the main navigation strip using up/down arrows.
              </p>
              <Link
                href="/admin/navbar-order"
                className="block w-full bg-slate-700 text-white text-center py-2 rounded-lg hover:bg-slate-800 transition font-medium"
              >
                Reorder navbar categories
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-emerald-600 text-white p-6">
              <h2 className="text-xl font-bold">Orders</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                View and manage customer orders from Stripe payments.
              </p>
              <Link
                href="/admin/orders"
                className="block w-full bg-emerald-600 text-white text-center py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
              >
                View All Orders
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-orange-600 text-white p-6">
              <h2 className="text-xl font-bold">Quote Configuration</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Fully customize all product features: sizes, colors, decorations, print locations, turnaround times, and more. Add, edit, or delete any option.
              </p>
              <Link
                href="/admin/quote-config"
                className="block w-full bg-orange-600 text-white text-center py-2 rounded-lg hover:bg-orange-700 transition font-medium"
              >
                Configure Quote Options
              </Link>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2 font-semibold">What you can customize:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Sizes (add custom sizes like "24x36", "Custom", etc.)</li>
                  <li>• Colors (add any color with hex codes)</li>
                  <li>• Print Types/Decorations (DTF, Screen Print, Embroidery, etc.)</li>
                  <li>• Print Locations (Front, Back, Sleeve, etc.)</li>
                  <li>• Turnaround Times (Rush, Standard, etc.)</li>
                  <li>• Designer Help Options</li>
                  <li>• Dynamic pools and options</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-cyan-600 text-white p-6">
              <h2 className="text-xl font-bold">Customer Users</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                View and manage registered customer accounts, their preferences, and saved items.
              </p>
              <div className="space-y-3">
                <Link
                  href="/admin/users"
                  className="block w-full bg-cyan-600 text-white text-center py-2 rounded-lg hover:bg-cyan-700 transition font-medium"
                >
                  View All Users
                </Link>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2 font-semibold">What you can see:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• User details (name, email, phone)</li>
                  <li>• Communication preferences</li>
                  <li>• Saved products and items</li>
                  <li>• Account status and registration date</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-indigo-600 text-white p-6">
              <h2 className="text-xl font-bold">Business Categories</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Manage "Shop by Business Needs" categories (Restaurants, Real Estate, etc.) and assign products to each category. Customers can browse products by their business type.
              </p>
              <Link
                href="/admin/business-categories"
                className="block w-full bg-indigo-600 text-white text-center py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Manage Business Categories
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-fuchsia-600 text-white p-6">
              <h2 className="text-xl font-bold">Portfolio Gallery</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Upload portfolio images with labels to show in the public gallery page.
              </p>
              <div className="space-y-3">
                <Link
                  href="/admin/portfolio"
                  className="block w-full bg-fuchsia-600 text-white text-center py-2 rounded-lg hover:bg-fuchsia-700 transition font-medium"
                >
                  Manage Portfolio
                </Link>
                <Link
                  href="/portfolio"
                  className="block w-full bg-gray-700 text-white text-center py-2 rounded-lg hover:bg-gray-800 transition font-medium"
                >
                  View Public Portfolio
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-rose-600 text-white p-6">
              <h2 className="text-xl font-bold">Testimonials Management</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Manage customer testimonials shown on the homepage. Add, edit, or delete testimonials.
              </p>
              <Link
                href="/admin/testimonials"
                className="block w-full bg-rose-600 text-white text-center py-2 rounded-lg hover:bg-rose-700 transition font-medium"
              >
                Manage Testimonials
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-teal-600 text-white p-6">
              <h2 className="text-xl font-bold">Shipping Zones</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Manage local delivery zones, ZIP codes, delivery fees, free delivery thresholds, and delivery windows.
              </p>
              <div className="space-y-3">
                <Link
                  href="/admin/shipping/zones"
                  className="block w-full bg-teal-600 text-white text-center py-2 rounded-lg hover:bg-teal-700 transition font-medium"
                >
                  Manage Shipping Zones
                </Link>
                <Link
                  href="/admin/shipping/zones"
                  className="block w-full bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Create New Zone
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-800 text-white p-6">
              <h2 className="text-xl font-bold">Recent Products</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Same-day cat.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.slice(0, 5).map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">${(product.price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isSameDayPrintingProduct(product)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isSameDayPrintingProduct(product) ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-[#29b6f6] hover:text-[#1a7ba3] font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}