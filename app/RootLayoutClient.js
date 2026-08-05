'use client';

import { usePathname } from 'next/navigation';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { Navbar } from './components/shared/Navbar';
import { Footer } from './components/shared/Footer';
import { GlobalPopupModal } from './components/shared/GlobalPopupModal';
import { Toaster } from 'sonner';

export function RootLayoutClient({ children }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isPrintRoute = pathname === '/quote/print';

  return (
    <AdminProvider>
      <CartProvider>
        <WishlistProvider>
          <AuthProvider>
            <Toaster position="bottom-right" richColors />
            <div className="flex flex-col min-h-screen">
              {!isAdminRoute && !isPrintRoute && <Navbar />}
              <main className="flex-1">{children}</main>
              {!isAdminRoute && !isPrintRoute && <Footer />}
            </div>
            {!isAdminRoute && !isPrintRoute && <GlobalPopupModal />}
          </AuthProvider>
        </WishlistProvider>
      </CartProvider>
    </AdminProvider>
  );
}
