'use client';

import { usePathname } from 'next/navigation';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { Navbar } from './components/shared/Navbar';
import { Footer } from './components/shared/Footer';

export function RootLayoutClient({ children }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <AdminProvider>
      <CartProvider>
        <WishlistProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              {!isAdminRoute && <Navbar />}
              <main className="flex-1">{children}</main>
              {!isAdminRoute && <Footer />}
            </div>
            
          </AuthProvider>
        </WishlistProvider>
      </CartProvider>
    </AdminProvider>
  );
}
