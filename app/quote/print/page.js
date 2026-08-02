'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildInvoiceHTML } from '../../lib/invoiceBuilder';

function QuotePrintContent() {
  const searchParams = useSearchParams();
  const [quoteData, setQuoteData] = useState(null);
  const [error, setError] = useState('');
  const [productInfo, setProductInfo] = useState({ productName: 'Quote' });
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const encoded = searchParams.get('data');
    if (encoded) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        setQuoteData(decoded);
        if (decoded.productName) {
          setProductInfo({ productName: decoded.productName });
        }
      } catch (e) {
        setError('Invalid quote data');
      }
    } else {
      setError('No quote data provided');
    }

    // Fetch logo
    const fetchLogo = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement');
        if (res.ok) {
          const data = await res.json();
          if (data.logoImageUrl) {
            setLogoUrl(data.logoImageUrl);
          }
        }
      } catch (err) {
        console.error('Failed to fetch logo', err);
      }
    };
    fetchLogo();
  }, [searchParams]);

  useEffect(() => {
    if (quoteData && !error) {
      // Small delay to ensure logo renders before print dialog
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [quoteData, error, logoUrl]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: buildInvoiceHTML(quoteData, productInfo, logoUrl) }} />
  );
}

export default function QuotePrintPage() {
  return (
    <Suspense>
      <QuotePrintContent />
    </Suspense>
  );
}