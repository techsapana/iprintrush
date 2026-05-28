'use client';

import { usePathname } from 'next/navigation';
import { AdminBackToDashboard } from '../components/admin/AdminBackToDashboard';

export default function AdminLayout({ children }) {
  const pathname = usePathname() || '';
  const showBack =
    pathname !== '/admin/login' && pathname !== '/admin/dashboard';

  return (
    <>
      {showBack && <AdminBackToDashboard />}
      {children}
    </>
  );
}
