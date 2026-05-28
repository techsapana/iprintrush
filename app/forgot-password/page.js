'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/shared/PasswordInput';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestForgotOtp, verifyForgotOtp, isLoading, error, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('request');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/my-orders');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'request') {
      const ok = await requestForgotOtp(email);
      if (ok) setStep('verify');
      return;
    }

    const ok = await verifyForgotOtp({ email, otp, newPassword });
    if (ok) router.push('/my-orders');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password</h1>
          <p className="text-sm text-gray-600">
            We’ll email you a one-time code to reset your password.
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
              disabled={step !== 'request'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29b6f6]"
              placeholder="you@example.com"
            />
          </div>

          {step === 'verify' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email OTP</label>
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
              </div>
              <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new password"
                  label="New Password"
                  required
                  disabled={step !== 'verify'}
                />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => {
                    setStep('request');
                    setOtp('');
                    setNewPassword('');
                  }}
                  disabled={isLoading}
                >
                  Change email
                </button>
                <button
                  type="button"
                  className="text-xs text-[#29b6f6] hover:text-[#1e8fc4] font-medium"
                  onClick={async () => {
                    const ok = await requestForgotOtp(email);
                    if (ok) setStep('verify');
                  }}
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </div>
            </>
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
              : (isLoading ? 'Resetting...' : 'Verify & Reset Password')}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center">
          Remembered your password?{' '}
          <Link href="/login" className="text-[#29b6f6] hover:text-[#1e8fc4] font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
