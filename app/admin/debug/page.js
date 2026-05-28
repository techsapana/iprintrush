'use client';

import { useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminDebugPage() {
  const { adminUser, loading, checkAdminAuth } = useAdmin();
  const [testResult, setTestResult] = useState('');

  const testAuth = async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult('Error: ' + err.message);
    }
  };

  const testCookies = () => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie;
      setTestResult('Cookies: ' + cookies);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Auth Status</h2>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Admin User:</strong> {adminUser ? JSON.stringify(adminUser) : 'Not logged in'}</p>
            <p><strong>Is Admin:</strong> {adminUser ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={checkAdminAuth}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Check Auth
            </button>
            <button
              onClick={testAuth}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test /api/admin/me
            </button>
            <button
              onClick={testCookies}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Show Cookies
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Test Result</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {testResult}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Login Credentials</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Default Email:</strong> admin@iprintrush.com</p>
            <p><strong>Default Password:</strong> admin123</p>
            <p><strong>Environment Variables:</strong> ADMIN_EMAIL_I, ADMIN_PASSWORD_I</p>
          </div>
        </div>
      </div>
    </div>
  );
}
