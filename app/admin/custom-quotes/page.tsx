'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/app/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { FileText, Eye, MapPin, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomQuotesAdminPage() {
  const router = useRouter();
  const { adminUser, adminLoading } = useAdmin();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!adminLoading && !adminUser) {
      router.push('/admin');
    }
  }, [adminUser, adminLoading, router]);

  useEffect(() => {
    if (adminUser) {
      fetchQuotes();
    }
  }, [adminUser]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/custom-quotes');
      const data = await res.json();
      if (data.success) {
        setQuotes(data.quotes);
      }
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || loading) {
    return <div className="p-8">Loading quotes...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Custom Quote Requests</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">ID</th>
              <th className="p-4 font-semibold text-gray-600">Customer</th>
              <th className="p-4 font-semibold text-gray-600">Product</th>
              <th className="p-4 font-semibold text-gray-600">Date</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No custom quote requests yet.
                </td>
              </tr>
            ) : (
              quotes.map((quote) => {
                const isExpanded = expandedId === quote.id;
                let files = [];
                if (quote.uploaded_files) {
                  try {
                    files = typeof quote.uploaded_files === 'string' ? JSON.parse(quote.uploaded_files) : quote.uploaded_files;
                  } catch (e) {}
                }

                return (
                  <React.Fragment key={quote.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium">#{quote.id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{quote.full_name}</div>
                        <div className="text-sm text-gray-500">{quote.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{quote.product_category}</div>
                        <div className="text-sm text-gray-500">Qty: {quote.quantity}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold uppercase tracking-wide">
                          {quote.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {isExpanded ? 'Hide' : 'View'}
                        </Button>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-blue-50/30">
                        <td colSpan={6} className="p-6 border-b border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            
                            {/* Contact & Basics */}
                            <div>
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-4 h-4 text-[#29b6f6]" /> Contact Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p><span className="text-gray-500">Phone:</span> {quote.phone}</p>
                                {quote.company && <p><span className="text-gray-500">Company:</span> {quote.company}</p>}
                                {quote.budget_range && <p><span className="text-gray-500">Budget:</span> <span className="font-medium text-green-600">{quote.budget_range}</span></p>}
                                {quote.timing_requirement && <p><span className="text-gray-500">Timing:</span> {quote.timing_requirement}</p>}
                              </div>
                            </div>

                            {/* Product Specifications */}
                            <div>
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                                <Package className="w-4 h-4 text-[#29b6f6]" /> Specifications
                              </h4>
                              <div className="space-y-2 text-sm">
                                {quote.brand_model_sku && <p><span className="text-gray-500">Brand/SKU:</span> {quote.brand_model_sku}</p>}
                                {quote.preferred_size && <p><span className="text-gray-500">Size:</span> {quote.preferred_size}</p>}
                                {quote.preferred_color && <p><span className="text-gray-500">Color:</span> {quote.preferred_color}</p>}
                                <p><span className="text-gray-500 block mb-1">Details:</span></p>
                                <p className="bg-white p-3 rounded border text-gray-700 whitespace-pre-wrap">{quote.specifications}</p>
                                
                                {quote.reference_link && (
                                  <p className="mt-2">
                                    <a href={quote.reference_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                      View Reference Link ↗
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Customization & Delivery */}
                            <div>
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
                                <MapPin className="w-4 h-4 text-[#29b6f6]" /> Customization & Delivery
                              </h4>
                              <div className="space-y-2 text-sm">
                                <p><span className="text-gray-500">Needs Customization:</span> {quote.needs_customization}</p>
                                {quote.needs_customization === 'Yes' && (
                                  <div className="bg-white p-3 rounded border mb-4">
                                    <p><span className="text-gray-500">Method:</span> {quote.decoration_method}</p>
                                    <p><span className="text-gray-500">Location:</span> {quote.decoration_location}</p>
                                    <p><span className="text-gray-500">Colors:</span> {quote.decoration_colors}</p>
                                  </div>
                                )}
                                
                                <p className="mt-4"><span className="text-gray-500">Delivery Method:</span> {quote.delivery_method}</p>
                                {quote.delivery_address && (
                                  <p className="bg-white p-3 rounded border text-gray-700 whitespace-pre-wrap">{quote.delivery_address}</p>
                                )}
                              </div>
                            </div>

                          </div>

                          {/* Notes and Files Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-200">
                            {quote.additional_notes && (
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2">Additional Notes</h4>
                                <p className="bg-white p-3 rounded border text-gray-700 text-sm whitespace-pre-wrap">{quote.additional_notes}</p>
                              </div>
                            )}

                            {files.length > 0 && (
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2">Attached Files</h4>
                                <div className="flex flex-wrap gap-2">
                                  {files.map((fileUrl: string, idx: number) => (
                                    <a 
                                      key={idx} 
                                      href={fileUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-[#29b6f6] transition-colors shadow-sm"
                                    >
                                      <Download className="w-4 h-4" />
                                      Attachment {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
