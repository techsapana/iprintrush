'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildInvoiceHTML } from '../../lib/invoiceBuilder';

function QuoteShareContent() {
  const searchParams = useSearchParams();
  const [quoteData, setQuoteData] = useState(null);
  const [error, setError] = useState('');
  const [productInfo, setProductInfo] = useState({ productName: 'Quote' });

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
  }, [searchParams]);

  useEffect(() => {
    if (quoteData && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quoteData, error]);

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
    <div dangerouslySetInnerHTML={{ __html: buildInvoiceHTML(quoteData, productInfo) }} />
  );
}

export default function QuoteSharePage() {
  return (
    <Suspense>
      <QuoteShareContent />
    </Suspense>
  );
}