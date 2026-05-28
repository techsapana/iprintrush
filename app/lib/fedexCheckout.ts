import { query } from '@/app/lib/db';
import { fedexConfig, getFedexRates } from '@/app/lib/fedex';

export type CartItemForShipping = {
  id: string;
  quantity: number;
  quotePayload?: {
    mode?: string;
    selections?: Record<string, unknown>;
  } | null;
};

export type ShippingAddressInput = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  residential?: boolean;
};

export type FedexRateOption = {
  serviceType: string;
  serviceName: string;
  cost: number;
  estimatedDeliveryDate: string | null;
  estimatedDeliveryLabel: string;
  transitTime: string | null;
};

function parseDimensionInches(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Use customer width/height from quote when provided; otherwise product package dimensions. */
export function resolvePackageSpecs(
  product: Record<string, unknown> | null | undefined,
  item: CartItemForShipping,
) {
  const qty = Math.max(1, Number(item.quantity || 1));
  const unitWeight = Math.max(0.1, Number(product?.weight_lb || 1));
  const packageType = String(product?.package_type || 'YOUR_PACKAGING');
  const selections = item.quotePayload?.selections || {};
  const widthIn = parseDimensionInches(selections.width_in);
  const heightIn = parseDimensionInches(selections.height_in);

  if (widthIn != null && heightIn != null) {
    const length = Math.max(widthIn, heightIn);
    const width = Math.min(widthIn, heightIn);
    const defaultHeight = Math.max(1, Number(product?.package_height_in || 2));
    return {
      weight: Math.max(0.1, unitWeight * qty),
      length: Math.max(1, Math.ceil(length)),
      width: Math.max(1, Math.ceil(width)),
      height: defaultHeight,
      packageType,
    };
  }

  return {
    weight: Math.max(0.1, unitWeight * qty),
    length: Math.max(1, Number(product?.package_length_in || 12)),
    width: Math.max(1, Number(product?.package_width_in || 12)),
    height: Math.max(1, Number(product?.package_height_in || 4)),
    packageType,
  };
}

function formatDeliveryLabel(detail: {
  commit?: {
    dateDetail?: { dayFormat?: string };
    commitDateTime?: string;
    transitTime?: string;
  };
  operationalDetail?: { deliveryDate?: string };
  serviceType?: string;
}): { iso: string | null; label: string } {
  const raw =
    detail?.commit?.dateDetail?.dayFormat ||
    detail?.commit?.commitDateTime ||
    detail?.operationalDetail?.deliveryDate ||
    null;
  if (!raw) {
    const transit = detail?.commit?.transitTime;
    return {
      iso: null,
      label: transit ? String(transit) : 'Delivery date pending',
    };
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      iso: parsed.toISOString().slice(0, 10),
      label: parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    };
  }
  return { iso: null, label: String(raw) };
}

export async function buildPackagesFromCartItems(items: CartItemForShipping[]) {
  const productIds = [...new Set(items.map((i) => String(i.id || '')).filter(Boolean))];
  if (productIds.length === 0) return [];

  let productRows: Record<string, unknown>[] = [];
  try {
    productRows = (await query(
      `SELECT id, weight_lb, package_length_in, package_width_in, package_height_in, package_type
       FROM products
       WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds,
    )) as Record<string, unknown>[];
  } catch {
    productRows = (await query(
      `SELECT id, weight_lb, package_length_in, package_width_in, package_height_in
       FROM products
       WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds,
    )) as Record<string, unknown>[];
  }

  const productMap = new Map(productRows.map((p) => [String(p.id), p]));

  return items.map((item) => {
    const product = productMap.get(String(item.id || ''));
    return resolvePackageSpecs(product, item);
  });
}

export function getDefaultShipperOrigin() {
  const addr = fedexConfig.defaultShipper.address;
  return {
    addressLines: addr.streetLines,
    city: addr.city,
    stateOrProvinceCode: addr.stateOrProvinceCode,
    postalCode: addr.postalCode,
    countryCode: addr.countryCode,
  };
}

export async function fetchFedexRatesForCheckout(
  items: CartItemForShipping[],
  shippingAddress: ShippingAddressInput,
): Promise<{
  available: boolean;
  rates: FedexRateOption[];
  packages: Awaited<ReturnType<typeof buildPackagesFromCartItems>>;
  message?: string;
  fallback?: boolean;
}> {
  const zip = String(shippingAddress.zip || '').trim();
  if (items.length === 0 || !zip) {
    return {
      available: false,
      rates: [],
      packages: [],
      message: 'Cart items and shipping ZIP are required.',
    };
  }

  const packages = await buildPackagesFromCartItems(items);
  const destination = {
    addressLines: [String(shippingAddress.address || '100 Main St')],
    city: String(shippingAddress.city || 'Memphis'),
    stateOrProvinceCode: String(shippingAddress.state || 'TN').slice(0, 2).toUpperCase(),
    postalCode: zip,
    countryCode: 'US',
    residential: shippingAddress.residential !== false,
  };

  const result = await getFedexRates(getDefaultShipperOrigin(), destination, packages);

  if (!result?.success || !Array.isArray(result.rates) || result.rates.length === 0) {
    return {
      available: false,
      rates: [],
      packages,
      message: result?.error || 'Unable to retrieve FedEx rates. Check your address and try again.',
    };
  }

  const rawDetails = Array.isArray(result.raw?.output?.rateReplyDetails)
    ? result.raw.output.rateReplyDetails
    : [];

  const rates: FedexRateOption[] = result.rates
    .map((r: { serviceType: string; serviceName: string; cost: number; transitTime?: string | null }) => {
      const detail = rawDetails.find((d: { serviceType?: string }) => d?.serviceType === r.serviceType);
      const delivery = detail
        ? formatDeliveryLabel(detail)
        : { iso: null, label: r.transitTime || 'Delivery date pending' };
      return {
        serviceType: r.serviceType,
        serviceName: r.serviceName,
        cost: Number(r.cost || 0),
        estimatedDeliveryDate: delivery.iso,
        estimatedDeliveryLabel: delivery.label,
        transitTime: r.transitTime || null,
      };
    })
    .filter((r) => Number.isFinite(r.cost) && r.cost > 0)
    .sort((a, b) => a.cost - b.cost);

  if (rates.length === 0) {
    return {
      available: false,
      rates: [],
      packages,
      message: 'FedEx returned no priced shipping options for this address.',
    };
  }

  return {
    available: true,
    rates,
    packages,
    fallback: Boolean(result.fallback),
  };
}

export async function resolveSelectedShippingRate(
  items: CartItemForShipping[],
  shippingAddress: ShippingAddressInput,
  selected: { serviceType: string; cost?: number },
) {
  const fetched = await fetchFedexRatesForCheckout(items, shippingAddress);
  if (!fetched.available) {
    return { ok: false as const, error: fetched.message || 'Shipping rates unavailable' };
  }
  const match = fetched.rates.find((r) => r.serviceType === selected.serviceType);
  if (!match) {
    return {
      ok: false as const,
      error: 'Selected shipping method is no longer available. Please calculate shipping again.',
    };
  }
  return { ok: true as const, rate: match, packages: fetched.packages };
}
