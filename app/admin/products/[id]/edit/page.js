'use client';

import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '../../../../hooks/useAdmin';
import { ProductForm } from '../../../../components/admin/ProductForm';
import { useEffect, useState, useRef } from 'react';

export default function EditProductPage() {
   const router = useRouter();
   const params = useParams();
   const { adminUser, adminLoading, getProductById } = useAdmin();
   const [product, setProduct] = useState(null);
   const [loading, setLoading] = useState(true);
   const getProductByIdRef = useRef(getProductById);
   getProductByIdRef.current = getProductById;

   useEffect(() => {
     if (!adminLoading && !adminUser) {
       router.push('/admin/login');
       return;
     }
     if (adminLoading) return;

    const loadProduct = async () => {
      try {
        // Only show the full-page spinner on the very first load (no product yet).
        // On subsequent runs (e.g. triggered by adminUser/adminLoading changes after
        // an upload), we skip setLoading(true) so ProductForm is never unmounted —
        // that was causing all form state (images, gallery, videos) to reset.
        setLoading((prev) => (prev === true && product === null ? true : false));

        // Prefer fresh server data (includes videos)
        const res = await fetch(`/api/products/${params.id}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.product) {
            setProduct(data.product);
            return;
          }
        }

        // Fallback to cached context list
        const foundProduct = getProductByIdRef.current(params.id);
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          router.push('/admin/products');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [adminUser, adminLoading, params.id, router]);

  if (loading || !product) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-600 text-sm mt-1">{product.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductForm key={String(product.id)} initialProduct={product} />
      </div>
    </div>
  );
}