'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../../hooks/useAdmin';
import { CategoryForm } from '../../../components/admin/CategoryForm';

export default function NewCategoryPage() {
   const router = useRouter();
   const { adminUser, adminLoading } = useAdmin();

   useEffect(() => {
     if (!adminLoading && !adminUser) router.push('/admin/login');
   }, [adminUser, adminLoading, router]);

   if (adminLoading || !adminUser) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Add New Category</h1>
          <p className="text-gray-600 text-sm mt-1">Create a new product category</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CategoryForm />
      </div>
    </div>
  );
}
