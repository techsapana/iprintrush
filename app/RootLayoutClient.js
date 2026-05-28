'use client';

import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { Navbar } from './components/shared/Navbar';
import { Footer } from './components/shared/Footer';

export function RootLayoutClient({ children }) {
  return (
    <AdminProvider>
      <CartProvider>
        <WishlistProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </WishlistProvider>
      </CartProvider>
    </AdminProvider>
  );
}
