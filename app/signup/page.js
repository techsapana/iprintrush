'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/shared/PasswordInput';

export default function SignupPage() {
  const router = useRouter();
  const { requestSignupOtp, verifySignupOtp, isLoading, error, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('request');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/my-orders');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'request') {
      const ok = await requestSignupOtp(email);
      if (ok) {
        setStep('verify');
      }
      return;
    }

    const ok = await verifySignupOtp({ name, email, phone, password, otp });
    if (ok) router.push('/my-orders');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an Account</h1>
          <p className="text-sm text-gray-600">
            Sign up to save your details and easily view your order history.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={step !== 'request'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={step !== 'request'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step !== 'request'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              placeholder="you@example.com"
            />
          </div>

          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
            label="Password"
            required
            disabled={step !== 'request'}
          />

          {step === 'verify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
                placeholder="Enter the 6-digit code"
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => {
                    setStep('request');
                    setOtp('');
                  }}
                  disabled={isLoading}
                >
                  Change email
                </button>
                <button
                  type="button"
                  className="text-xs text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                  onClick={async () => {
                    const ok = await requestSignupOtp(email);
                    if (ok) setStep('verify');
                  }}
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#29b6f6] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1e8fc4] transition disabled:bg-gray-400"
          >
            {step === 'request'
              ? (isLoading ? 'Sending OTP...' : 'Send OTP')
              : (isLoading ? 'Verifying...' : 'Verify & Create Account')}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

