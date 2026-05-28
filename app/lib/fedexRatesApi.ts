import {
  fetchFedexRatesForCheckout,
  type CartItemForShipping,
  type FedexRateOption,
} from '@/app/lib/fedexCheckout';

export type FedexRatesApiResponse = {
  /** Primary flag — true when FedEx returned at least one priced rate */
  success: boolean;
  /** Alias of success (legacy clients) */
  available: boolean;
  carrier: 'FedEx';
  rates: FedexRateOption[];
  packages: Awaited<ReturnType<typeof fetchFedexRatesForCheckout>>['packages'];
  /** Cheapest rate cost (USD) when success */
  amount: number;
  message?: string;
  error?: string;
  fallback?: boolean;
};

export type FedexRatesRequestBody = {
  items?: Array<{
    id?: string;
    quantity?: number;
    quotePayload?: CartItemForShipping['quotePayload'];
  }>;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    postalCode?: string;
    addressLines?: string[];
    stateOrProvinceCode?: string;
  };
  destination?: {
    address?: string;
    addressLines?: string[];
    city?: string;
    state?: string;
    stateOrProvinceCode?: string;
    zip?: string;
    postalCode?: string;
  };
  deliveryMethod?: string;
  shippingZip?: string;
  /** Legacy hook payload */
  packages?: unknown[];
  productId?: string;
  productIds?: string[];
};

function normalizeCartItems(body: FedexRatesRequestBody): CartItemForShipping[] {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items.map((item) => ({
      id: String(item.id || ''),
      quantity: Math.max(1, Number(item.quantity || 1)),
      quotePayload: item.quotePayload || null,
    }));
  }

  if (Array.isArray(body.packages) && body.packages.length > 0) {
    return body.packages.map((_, index) => ({
      id: String(body.productIds?.[index] || body.productId || ''),
      quantity: 1,
      quotePayload: null,
    }));
  }

  return [];
}

const PLACEHOLDER_CITIES = new Set(['customer city', 'city', '']);

/** Resolve US city/state from ZIP when estimate only provides a postal code. */
async function resolveCityStateFromZip(zip: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    return {
      city: String(place['place name'] || place.placeName || '').trim(),
      state: String(place['state abbreviation'] || place.stateAbbreviation || '')
        .slice(0, 2)
        .toUpperCase(),
    };
  } catch {
    return null;
  }
}

async function normalizeShippingAddress(body: FedexRatesRequestBody) {
  const shippingAddress = body.shippingAddress || body.destination || {};
  const zip = String(shippingAddress.zip || shippingAddress.postalCode || body.shippingZip || '').trim();
  let city = String(shippingAddress.city || '').trim();
  let state = String(
    shippingAddress.state || shippingAddress.stateOrProvinceCode || '',
  )
    .slice(0, 2)
    .toUpperCase();

  if (zip.length === 5 && (PLACEHOLDER_CITIES.has(city.toLowerCase()) || !state)) {
    const resolved = await resolveCityStateFromZip(zip);
    if (resolved) {
      if (PLACEHOLDER_CITIES.has(city.toLowerCase()) || !city) city = resolved.city;
      if (!state) state = resolved.state;
    }
  }

  if (!city) city = 'Memphis';
  if (!state) state = 'TN';

  return {
    address: String(
      shippingAddress.address || shippingAddress.addressLines?.[0] || '100 Main St',
    ),
    city,
    state,
    zip,
    residential: (shippingAddress as { residential?: boolean }).residential !== false,
  };
}

export async function handleFedexRatesRequest(
  body: FedexRatesRequestBody,
): Promise<{ status: number; data: FedexRatesApiResponse }> {
  const deliveryMethod = String(body.deliveryMethod || 'shipping');
  if (deliveryMethod !== 'shipping') {
    return {
      status: 200,
      data: {
        success: true,
        available: true,
        carrier: 'FedEx',
        rates: [],
        packages: [],
        amount: 0,
      },
    };
  }

  const items = normalizeCartItems(body);
  const address = await normalizeShippingAddress(body);

  if (items.length === 0 || !address.zip) {
    return {
      status: 400,
      data: {
        success: false,
        available: false,
        carrier: 'FedEx',
        rates: [],
        packages: [],
        amount: 0,
        message: 'Cart items and a valid shipping ZIP code are required.',
        error: 'Cart items and a valid shipping ZIP code are required.',
      },
    };
  }

  if (!/^\d{5}$/.test(address.zip)) {
    return {
      status: 400,
      data: {
        success: false,
        available: false,
        carrier: 'FedEx',
        rates: [],
        packages: [],
        amount: 0,
        message: 'ZIP code must be exactly 5 digits.',
        error: 'ZIP code must be exactly 5 digits.',
      },
    };
  }

  try {
    const result = await fetchFedexRatesForCheckout(items, address);

    if (!result.available || result.rates.length === 0) {
      const message =
        result.message || 'Unable to retrieve FedEx rates. Check your address and try again.';
      return {
        status: 422,
        data: {
          success: false,
          available: false,
          carrier: 'FedEx',
          rates: [],
          packages: result.packages,
          amount: 0,
          message,
          error: message,
        },
      };
    }

    const amount = Number(result.rates[0]?.cost || 0);

    return {
      status: 200,
      data: {
        success: true,
        available: true,
        carrier: 'FedEx',
        rates: result.rates,
        packages: result.packages,
        amount,
        fallback: Boolean(result.fallback),
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to retrieve FedEx rates.';
    console.error('handleFedexRatesRequest:', error);
    return {
      status: 500,
      data: {
        success: false,
        available: false,
        carrier: 'FedEx',
        rates: [],
        packages: [],
        amount: 0,
        message,
        error: message,
      },
    };
  }
}
