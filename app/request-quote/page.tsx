'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';

export default function RequestQuotePage() {
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    email: '',
    phone: '',
    
    product_category: '',
    reference_link: '',
    brand_model_sku: '',
    specifications: '',
    quantity: '',
    preferred_size: '',
    preferred_color: '',
    
    needs_customization: '',
    decoration_method: '',
    decoration_location: '',
    decoration_colors: '',
    
    timing_requirement: '',
    delivery_method: '',
    delivery_address: '',
    
    budget_range: '',
    additional_notes: '',
    
    agreed: false
  });

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large (max 5MB)`);
          return false;
        }
        return true;
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];
    
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    
    const res = await fetch('/api/custom-quotes/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload files');
    }
    
    const data = await res.json();
    return data.files; // Array of paths
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) {
      setError('Please agree to the terms before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      let uploadedFilePaths = [];
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        uploadedFilePaths = await uploadFiles();
        setIsUploading(false);
      }
      
      const payload = {
        ...formData,
        uploaded_files: uploadedFilePaths
      };
      
      const res = await fetch('/api/custom-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit quote request');
      }
      
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-20 flex flex-col items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-sm text-center max-w-lg mx-auto">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Request Received!</h2>
          <p className="text-gray-600 mb-8">
            Thank you for reaching out. We have received your custom quote request and our team will get back to you with pricing and availability shortly.
          </p>
          <Button onClick={() => router.push('/')} className="bg-[#29b6f6] hover:bg-[#1e8fc4] text-white">
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Request a Quote</h1>
          <p className="text-lg text-gray-600">
            Tell us what you're looking for. Share a photo, product link, or description, and we'll check availability and send you a quote.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 sm:p-12 space-y-12">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            {/* CONTACT INFORMATION */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input required type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company / Organization</label>
                  <input type="text" name="company" value={formData.company} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                </div>
              </div>
            </section>

            {/* PRODUCT DETAILS */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">Product Details</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Category *</label>
                  <select required name="product_category" value={formData.product_category} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border">
                    <option value="">Select a category</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Promotional Items">Promotional Items</option>
                    <option value="Print Materials">Print Materials</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Signage & Displays">Signage & Displays</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand / Model / SKU</label>
                    <input type="text" name="brand_model_sku" value={formData.brand_model_sku} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reference Product Link</label>
                    <input type="url" name="reference_link" placeholder="https://" value={formData.reference_link} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Required Features or Specifications *</label>
                  <textarea required name="specifications" rows={4} value={formData.specifications} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" placeholder="Please describe the product in detail..."></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Product Photo / Specification (Max 5MB)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                    <input type="file" multiple id="fileUpload" className="hidden" onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp,application/pdf" />
                    <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-[#29b6f6] font-medium">Click to upload files</span>
                      <span className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP, PDF</span>
                    </label>
                  </div>
                  {selectedFiles.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                          <span className="truncate max-w-[80%]">{file.name}</span>
                          <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                    <input required type="number" min="1" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Size(s)</label>
                    <input type="text" name="preferred_size" value={formData.preferred_size} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Color(s)</label>
                    <input type="text" name="preferred_color" value={formData.preferred_color} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                  </div>
                </div>
              </div>
            </section>

            {/* CUSTOMIZATION */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">Customization</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Do you need printing or customization? *</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="needs_customization" value="No" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> No
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="needs_customization" value="Yes" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Yes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="needs_customization" value="Not sure" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Not sure
                    </label>
                  </div>
                </div>

                {formData.needs_customization === 'Yes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Decoration Method</label>
                      <select name="decoration_method" value={formData.decoration_method} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border">
                        <option value="">Select method...</option>
                        <option value="Printing">Printing</option>
                        <option value="Embroidery">Embroidery</option>
                        <option value="Engraving">Engraving</option>
                        <option value="Not sure">Not sure — please advise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Decoration Location</label>
                      <input type="text" name="decoration_location" value={formData.decoration_location} onChange={handleInputChange} placeholder="e.g., Front chest, Back center" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Print or Thread Colors</label>
                      <input type="text" name="decoration_colors" value={formData.decoration_colors} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* TIMING & DELIVERY */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">Timing & Delivery</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">When do you need it? *</label>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="timing_requirement" value="Flexible" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Flexible
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="timing_requirement" value="Specific Date" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Required for a specific date
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="timing_requirement" value="Rush" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Rush requested
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">How would you like to receive it? *</label>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="delivery_method" value="Pickup" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Pickup
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="delivery_method" value="Local Delivery" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Local Delivery
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input required type="radio" name="delivery_method" value="Shipping" onChange={handleInputChange} className="text-[#29b6f6] focus:ring-[#29b6f6]" /> Shipping
                    </label>
                  </div>
                </div>

                {(formData.delivery_method === 'Shipping' || formData.delivery_method === 'Local Delivery') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery / Shipping Address</label>
                    <textarea name="delivery_address" rows={3} value={formData.delivery_address} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" placeholder="Enter full address..."></textarea>
                  </div>
                )}
              </div>
            </section>

            {/* ADDITIONAL INFORMATION */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b">Additional Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
                  <input type="text" name="budget_range" value={formData.budget_range} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border" placeholder="e.g., $500 - $1000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea name="additional_notes" rows={3} value={formData.additional_notes} onChange={handleInputChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#29b6f6] focus:border-[#29b6f6] p-3 border"></textarea>
                </div>
              </div>
            </section>

            <div className="pt-4 border-t">
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 rounded-lg">
                <input required type="checkbox" name="agreed" checked={formData.agreed} onChange={handleInputChange} className="mt-1 text-[#29b6f6] focus:ring-[#29b6f6] w-5 h-5 rounded border-gray-300" />
                <span className="text-sm text-gray-700">
                  I agree that iPrintRush may use this information to review and respond to my quote request. *
                </span>
              </label>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.agreed}
              className="w-full bg-[#29b6f6] hover:bg-[#1e8fc4] text-white font-bold text-lg py-6 rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isUploading ? 'Uploading Files...' : 'Submitting Request...'}
                </>
              ) : (
                'Request My Quote'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
