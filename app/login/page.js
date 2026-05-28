'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/shared/PasswordInput';
import { safeCheckoutReturnPath } from '../lib/checkoutFlow';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const returnPath = safeCheckoutReturnPath(searchParams.get('returnUrl') || '/my-orders');

  useEffect(() => {
    if (isAuthenticated) {
      router.push(returnPath);
    }
  }, [isAuthenticated, router, returnPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) {
      router.push(returnPath);
    }
  };

  const signupHref = `/signup?returnUrl=${encodeURIComponent(returnPath)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Login</h1>
          <p className="text-sm text-gray-600">
            Log in to proceed to payment or view your orders.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              placeholder="you@example.com"
            />
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            label="Password"
            required
          />
          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#29b6f6] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1e8fc4] transition disabled:bg-gray-400"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-[#29b6f6] hover:text-[#1e8fc4] font-medium">
              Forgot password?
            </Link>
          </div>
        </form>
        <div className="space-y-2 text-center">
          <p className="text-xs text-gray-500">
            Don&apos;t have an account yet?{' '}
            <Link href={signupHref} className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium">
              Create an account
            </Link>
          </p>
        </div>
        <div className="text-center text-xs text-gray-400">
          <Link href="/products" className="text-[#29b6f6] hover:text-[#1e8fc4]">
            ← Back to shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
