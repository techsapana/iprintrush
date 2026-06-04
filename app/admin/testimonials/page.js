'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminTestimonialsPage() {
   const router = useRouter();
   const { adminUser, adminLoading } = useAdmin();
   const [testimonials, setTestimonials] = useState([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [message, setMessage] = useState('');
   const [form, setForm] = useState({
     name: '',
     company: '',
     quote: '',
     rating: 5,
     imageUrl: '',
     enabled: true,
     displayOrder: 0,
   });

   useEffect(() => {
     if (!adminLoading && !adminUser) router.push('/admin/login');
   }, [adminUser, adminLoading, router]);

   const loadTestimonials = async () => {
     try {
       setLoading(true);
       const res = await fetch('/api/admin/testimonials', { cache: 'no-store' });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(data?.error || 'Failed to load testimonials');
       setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
     } catch (err) {
       setMessage(err?.message || 'Failed to load testimonials');
     } finally {
       setLoading(false);
     }
   };

  useEffect(() => {
    if (adminUser) loadTestimonials();
  }, [adminUser]);

  if (adminLoading || !adminUser) return null;

  const onUploadImage = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'testimonials');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) throw new Error(json?.error || 'Upload failed');
    setForm((prev) => ({ ...prev, imageUrl: json.url }));
  };

  const createTestimonial = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      const res = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to add testimonial');
      setForm({ name: '', company: '', quote: '', rating: 5, imageUrl: '', enabled: true, displayOrder: 0 });
      setMessage('Testimonial added.');
      await loadTestimonials();
    } catch (err) {
      setMessage(err?.message || 'Failed to add testimonial');
    } finally {
      setSaving(false);
    }
  };

  const updateTestimonial = async (item) => {
    const res = await fetch(`/api/admin/testimonials/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.name,
        company: item.company,
        quote: item.quote,
        rating: item.rating,
        imageUrl: item.imageUrl || item.image_url,
        enabled: item.enabled,
        displayOrder: item.displayOrder || item.display_order,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to update testimonial');
  };

  const deleteTestimonial = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to delete testimonial');
    await loadTestimonials();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Testimonials Management</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <form onSubmit={createTestimonial} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Testimonial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="Quote/Testimonial text"
            value={form.quote}
            onChange={(e) => setForm((prev) => ({ ...prev, quote: e.target.value }))}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={form.rating}
              onChange={(e) => setForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  Rating: {r} Star{r > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Display order"
              value={form.displayOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: Number(e.target.value || 0) }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                try {
                  await onUploadImage(e.target.files?.[0]);
                } catch (err) {
                  setMessage(err?.message || 'Upload failed');
                }
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            placeholder="Image URL (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Enabled (visible on homepage)</span>
          </label>
          {form.imageUrl ? <img src={form.imageUrl} alt="Preview" className="h-28 rounded border object-cover" /> : null}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#29b6f6] text-white px-4 py-2 rounded-lg hover:bg-[#1e8fc4] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add Testimonial'}
          </button>
          {message ? <p className="text-sm text-gray-600">{message}</p> : null}
        </form>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Testimonials</h2>
          {loading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : testimonials.length === 0 ? (
            <p className="text-sm text-gray-500">No testimonials yet.</p>
          ) : (
            <div className="space-y-4">
              {testimonials.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-5 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          setTestimonials((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, name: e.target.value } : x))
                          )
                        }
                        placeholder="Name"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={item.company}
                        onChange={(e) =>
                          setTestimonials((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, company: e.target.value } : x))
                          )
                        }
                        placeholder="Company"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={item.quote}
                      onChange={(e) =>
                        setTestimonials((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, quote: e.target.value } : x))
                        )
                      }
                      placeholder="Quote"
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex gap-4">
<select
                        value={item.rating}
                        onChange={(e) =>
                          setTestimonials((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, rating: Number(e.target.value) } : x))
                          )
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>
                            {r} Star{r > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.displayOrder ?? item.display_order ?? ''}
                        onChange={(e) =>
                          setTestimonials((prev) =>
                            prev.map((x) =>
                              x.id === item.id ? { ...x, displayOrder: Number(e.target.value || 0) } : x
                            )
                          )
                        }
                        placeholder="Display order"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.imageUrl ?? item.image_url ?? ''}
                      onChange={(e) =>
                        setTestimonials((prev) =>
                          prev.map((x) => (x.id === item.id ? { ...x, imageUrl: e.target.value } : x))
                        )
                      }
                      placeholder="Image URL"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          setTestimonials((prev) =>
                            prev.map((x) => (x.id === item.id ? { ...x, enabled: e.target.checked } : x))
                          )
                        }
                        className="rounded"
                      />
                      <span className="text-xs text-gray-700">Enabled</span>
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateTestimonial(item);
                          setMessage('Testimonial updated.');
                          await loadTestimonials();
                        } catch (err) {
                          setMessage(err?.message || 'Failed to update testimonial');
                        }
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteTestimonial(item.id);
                          setMessage('Testimonial deleted.');
                        } catch (err) {
                          setMessage(err?.message || 'Failed to delete testimonial');
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}