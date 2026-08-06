'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
          <div className="mb-4">
            <button onClick={() => router.back()} className="text-sm font-medium text-[#29b6f6] hover:text-[#1e8fc4] flex items-center gap-1 w-fit bg-transparent border-none cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Categories
            </button>
          </div>
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
