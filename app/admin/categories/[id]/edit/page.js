'use client';

import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '../../../../hooks/useAdmin';
import { CategoryForm } from '../../../../components/admin/CategoryForm';
import { useEffect, useState } from 'react';

export default function EditCategoryPage() {
   const router = useRouter();
   const params = useParams();
   const { adminUser, adminLoading, categories } = useAdmin();
   const [category, setCategory] = useState(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
     if (!adminLoading && !adminUser) {
       router.push('/admin/login');
       return;
     }
     if (adminLoading) return;

    const foundCategory = categories.find(c => c.id === params.id);
    if (foundCategory) {
      setCategory(foundCategory);
    } else {
      router.push('/admin/categories');
    }
    setLoading(false);
  }, [adminUser, adminLoading, params.id, categories, router]);

  if (loading || !category) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Edit Category</h1>
          <p className="text-gray-600 text-sm mt-1">{category.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CategoryForm initialCategory={category} />
      </div>
    </div>
  );
}
