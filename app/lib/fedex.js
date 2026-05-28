// FedEx API Configuration (REST v1 ready)
export const fedexConfig = {
  apiKey: process.env.FEDEX_API_KEY || process.env.FEDEX_CLIENT_ID,
  password: process.env.FEDEX_PASSWORD || process.env.FEDEX_CLIENT_SECRET,
  accountNumber: process.env.FEDEX_ACCOUNT_NUMBER,
  meterNumber: process.env.FEDEX_METER_NUMBER,
  environment: process.env.FEDEX_ENVIRONMENT || 'sandbox',
  baseUrl:
    process.env.FEDEX_ENVIRONMENT === 'production'
      ? 'https://apis.fedex.com'
      : 'https://apis-sandbox.fedex.com',
  defaultPackage: {
    weight: 1,
    length: 12,
    width: 12,
    height: 4,
  },
  defaultShipper: {
    company: process.env.FEDEX_SHIPPER_COMPANY || 'iPrintRush',
    phone: process.env.FEDEX_SHIPPER_PHONE || '916-458-1139',
    address: {
      streetLines: Array.isArray(process.env.FEDEX_SHIPPER_ADDRESS)
        ? process.env.FEDEX_SHIPPER_ADDRESS
        : [process.env.FEDEX_SHIPPER_ADDRESS || '8506 Madison Ave Ste.A'],
      city: process.env.FEDEX_SHIPPER_CITY || 'Fair Oaks',
      stateOrProvinceCode: process.env.FEDEX_SHIPPER_STATE || 'CA',
      postalCode: process.env.FEDEX_SHIPPER_ZIP || '95628',
      countryCode: process.env.FEDEX_SHIPPER_COUNTRY || 'US',
    },
  },
  services: {
    FEDEX_GROUND: 'FedEx Ground',
    GROUND_HOME_DELIVERY: 'FedEx Ground / Home Delivery',
    FEDEX_HOME_DELIVERY: 'FedEx Home Delivery',
    FEDEX_EXPRESS_SAVER: 'FedEx Express Saver',
    FEDEX_2_DAY: 'FedEx 2 Day',
    FEDEX_2_DAY_AM: 'FedEx 2 Day A.M.',
    STANDARD_OVERNIGHT: 'FedEx Standard Overnight',
    PRIORITY_OVERNIGHT: 'FedEx Priority Overnight',
    FIRST_OVERNIGHT: 'FedEx First Overnight',
  },
};

let tokenCache = {
  token: '',
  expiresAt: 0,
};

export function validateFedexConfig() {
  const required = ['apiKey', 'password', 'accountNumber'];
  const missing = required.filter((key) => !fedexConfig[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required FedEx environment variables: ${missing.join(', ')}`);
  }
  return true;
}

function normalizePackage(pkg = {}) {
  return {
    weight: Math.max(0.1, Number(pkg.weight || fedexConfig.defaultPackage.weight)),
    length: Math.max(1, Number(pkg.length || fedexConfig.defaultPackage.length)),
    width: Math.max(1, Number(pkg.width || fedexConfig.defaultPackage.width)),
    height: Math.max(1, Number(pkg.height || fedexConfig.defaultPackage.height)),
    packageType: String(pkg.packageType || 'YOUR_PACKAGING'),
  };
}

/** FedEx may return charges as { amount: n } or a plain number. */
function readMoneyField(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value.amount != null) {
    const n = Number(value.amount);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse FedEx rate reply charge (ACCOUNT rate preferred). */
function extractRateAmount(detail) {
  const rated = detail?.ratedShipmentDetails;
  if (!Array.isArray(rated) || rated.length === 0) {
    const row = detail?.ratedShipmentDetails?.[0];
    const n =
      readMoneyField(row?.totalNetCharge) ??
      readMoneyField(row?.totalNetFedExCharge) ??
      readMoneyField(row?.totalBaseCharge);
    return n != null && n > 0 ? n : 0;
  }

  const readCharge = (row) => {
    const raw =
      readMoneyField(row?.totalNetCharge) ??
      readMoneyField(row?.totalNetFedExCharge) ??
      readMoneyField(row?.totalBaseCharge) ??
      readMoneyField(row?.shipmentRateDetail?.totalNetCharge) ??
      readMoneyField(row?.shipmentRateDetail?.totalNetFedExCharge);
    return raw != null && raw > 0 ? raw : null;
  };

  const accountRow = rated.find((r) => String(r?.rateType || '').toUpperCase() === 'ACCOUNT');
  const accountAmount = accountRow ? readCharge(accountRow) : null;
  if (accountAmount != null) return accountAmount;

  const amounts = rated.map(readCharge).filter((n) => n != null);
  return amounts.length > 0 ? Math.min(...amounts) : 0;
}

function serviceDisplayName(serviceType, fallbackName) {
  if (!serviceType) return fallbackName || 'FedEx Service';
  return (
    fedexConfig.services[serviceType] ||
    String(fallbackName || serviceType)
      .replace(/_/g, ' ')
      .replace(/\bFedex\b/i, 'FedEx')
  );
}

function deliveryLabelFromDetail(detail) {
  const raw =
    detail?.commit?.dateDetail?.dayFormat ||
    detail?.commit?.commitDateTime ||
    detail?.operationalDetail?.deliveryDate ||
    null;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    return String(raw);
  }
  return detail?.commit?.transitTime || null;
}

async function getFedexAccessToken() {
  validateFedexConfig();
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 10_000) {
    return tokenCache.token;
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', fedexConfig.apiKey);
  params.set('client_secret', fedexConfig.password);

  const res = await fetch(`${fedexConfig.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data?.errors?.[0]?.message || data?.error_description || 'FedEx auth failed');
  }
  tokenCache = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 0) * 1000,
  };
  return tokenCache.token;
}

export async function getFedexRates(origin, destination, packages = []) {
  try {
    const token = await getFedexAccessToken();
    const normalizedPackages =
      Array.isArray(packages) && packages.length > 0
        ? packages.map(normalizePackage)
        : [normalizePackage()];

    const requestedPackageLineItems = normalizedPackages.map((pkg, index) => ({
      groupPackageCount: 1,
      weight: { units: 'LB', value: pkg.weight },
      dimensions: {
        length: Math.round(pkg.length),
        width: Math.round(pkg.width),
        height: Math.round(pkg.height),
        units: 'IN',
      },
      sequenceNumber: index + 1,
    }));

    const shipDateStamp =
      destination?.shipDateStamp || new Date().toISOString().slice(0, 10);
    const recipientResidential =
      destination?.residential === true || destination?.residential === false
        ? destination.residential
        : true;

    const payload = {
      accountNumber: { value: fedexConfig.accountNumber },
      rateRequestControlParameters: { returnTransitTimes: true },
      requestedShipment: {
        shipper: {
          address: {
            streetLines: origin?.addressLines || fedexConfig.defaultShipper.address.streetLines,
            city: origin?.city || fedexConfig.defaultShipper.address.city,
            stateOrProvinceCode:
              origin?.stateOrProvinceCode || fedexConfig.defaultShipper.address.stateOrProvinceCode,
            postalCode: origin?.postalCode || fedexConfig.defaultShipper.address.postalCode,
            countryCode: origin?.countryCode || fedexConfig.defaultShipper.address.countryCode,
          },
        },
        recipient: {
          address: {
            streetLines: destination?.addressLines || ['100 Main St'],
            city: destination?.city || 'Memphis',
            stateOrProvinceCode: destination?.stateOrProvinceCode || 'TN',
            postalCode: destination?.postalCode || '',
            countryCode: destination?.countryCode || 'US',
            residential: recipientResidential,
          },
        },
        shipDateStamp,
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        packagingType: normalizedPackages[0]?.packageType || 'YOUR_PACKAGING',
        rateRequestType: ['LIST', 'ACCOUNT'],
        requestedPackageLineItems,
      },
    };

    const res = await fetch(`${fedexConfig.baseUrl}/rate/v1/rates/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = data?.errors?.[0];
      const msg = err?.message || 'FedEx rate request failed';
      const code = err?.code ? ` (${err.code})` : '';
      throw new Error(`${msg}${code}`);
    }

    const details = Array.isArray(data?.output?.rateReplyDetails)
      ? data.output.rateReplyDetails
      : [];
    const rates = details
      .map((detail) => {
        const serviceType = detail?.serviceType || 'UNKNOWN';
        return {
          serviceType,
          serviceName: serviceDisplayName(serviceType, detail?.serviceName),
          cost: extractRateAmount(detail),
          transitTime: deliveryLabelFromDetail(detail) || detail?.commit?.transitTime || null,
        };
      })
      .filter((r) => Number.isFinite(r.cost) && r.cost > 0)
      .sort((a, b) => a.cost - b.cost);

    return { success: true, rates, raw: data };
  } catch (error) {
    return {
      success: false,
      rates: [],
      error: error?.message || 'FedEx rate fetch failed',
    };
  }
}

export async function createFedexShipment(shipmentDetails) {
  try {
    const token = await getFedexAccessToken();
    const packages =
      Array.isArray(shipmentDetails?.packages) && shipmentDetails.packages.length > 0
        ? shipmentDetails.packages.map(normalizePackage)
        : [normalizePackage()];

    const requestedPackageLineItems = packages.map((pkg, index) => ({
      sequenceNumber: index + 1,
      weight: { units: 'LB', value: pkg.weight },
      dimensions: {
        length: Math.round(pkg.length),
        width: Math.round(pkg.width),
        height: Math.round(pkg.height),
        units: 'IN',
      },
    }));

    const payload = {
      labelResponseOptions: 'LABEL',
      requestedShipment: {
        shipDatestamp: new Date().toISOString().slice(0, 10),
        serviceType: shipmentDetails?.serviceType || 'FEDEX_GROUND',
        packagingType: shipmentDetails?.packageType || 'YOUR_PACKAGING',
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        shipper: {
          contact: {
            personName:
              shipmentDetails?.shipper?.contact?.name || fedexConfig.defaultShipper.company,
            phoneNumber:
              shipmentDetails?.shipper?.contact?.phone || fedexConfig.defaultShipper.phone,
            emailAddress: shipmentDetails?.shipper?.contact?.email || undefined,
            companyName:
              shipmentDetails?.shipper?.contact?.company || fedexConfig.defaultShipper.company,
          },
          address: shipmentDetails?.shipper?.address || fedexConfig.defaultShipper.address,
        },
        recipients: [
          {
            contact: {
              personName:
                shipmentDetails?.recipient?.contact?.name ||
                shipmentDetails?.recipient?.name ||
                'Customer',
              phoneNumber:
                shipmentDetails?.recipient?.contact?.phone ||
                shipmentDetails?.recipient?.phone ||
                '',
              emailAddress:
                shipmentDetails?.recipient?.contact?.email || shipmentDetails?.recipient?.email,
              companyName:
                shipmentDetails?.recipient?.contact?.company ||
                shipmentDetails?.recipient?.company,
            },
            address: {
              ...(shipmentDetails?.recipient?.address || {}),
              residential:
                shipmentDetails?.recipient?.address?.residential !== false,
            },
          },
        ],
        labelSpecification: {
          labelFormatType: 'COMMON2D',
          imageType: shipmentDetails?.labelFormat || 'PDF',
          labelStockType: 'PAPER_85X11_TOP_HALF_LABEL',
        },
        shippingChargesPayment: {
          paymentType: 'SENDER',
          payor: {
            responsibleParty: {
              accountNumber: { value: fedexConfig.accountNumber },
            },
          },
        },
        requestedPackageLineItems: requestedPackageLineItems.map((pkg, idx) => ({
          ...pkg,
          itemDescription:
            shipmentDetails?.packages?.[idx]?.description || `Package ${idx + 1}`,
          customerReferences: shipmentDetails?.referenceId
            ? [
                {
                  customerReferenceType: 'CUSTOMER_REFERENCE',
                  value: String(shipmentDetails.referenceId),
                },
              ]
            : [],
        })),
      },
      accountNumber: { value: fedexConfig.accountNumber },
    };

    const res = await fetch(`${fedexConfig.baseUrl}/ship/v1/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.errors?.[0]?.message || 'FedEx shipment creation failed');
    }

    const trk = data?.output?.transactionShipments?.[0];
    const piece = trk?.pieceResponses?.[0];
    const trackingNumber =
      piece?.trackingNumber ||
      trk?.masterTrackingNumber?.trackingNumber ||
      trk?.masterTrackingNumber ||
      '';
    return {
      success: true,
      shipmentId: trackingNumber || data?.transactionId || '',
      trackingNumber,
      label:
        piece?.packageDocuments?.find((d) => d?.encodedLabel)?.encodedLabel ||
        piece?.packageDocuments?.[0]?.encodedLabel ||
        '',
      labelFormat: shipmentDetails?.labelFormat || 'PDF',
      labelUrl: piece?.packageDocuments?.find((d) => d?.url)?.url || '',
      cost: Number(trk?.shipmentDocuments?.[0]?.charges || 0),
      estimatedDelivery: trk?.operationalDetail?.deliveryDate || null,
      raw: data,
    };
  } catch (error) {
    return { success: false, error: error?.message || 'FedEx shipment creation error' };
  }
}

export async function trackFedexPackage(trackingNumber) {
  try {
    const token = await getFedexAccessToken();
    const res = await fetch(`${fedexConfig.baseUrl}/track/v1/trackingnumbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        includeDetailedScans: true,
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.errors?.[0]?.message || 'FedEx tracking failed');
    }

    const result = data?.output?.completeTrackResults?.[0]?.trackResults?.[0];
    const events = Array.isArray(result?.scanEvents) ? result.scanEvents : [];
    return {
      success: true,
      trackingNumber,
      status: result?.latestStatusDetail?.description || result?.latestStatusDetail?.statusByLocale || 'Unknown',
      estimatedDelivery: result?.dateAndTimes?.find((x) => x?.type === 'ACTUAL_DELIVERY')?.dateTime || null,
      events: events.map((ev) => ({
        timestamp: ev?.date,
        description: ev?.eventDescription || ev?.derivedStatus || '',
        location: [ev?.scanLocation?.city, ev?.scanLocation?.stateOrProvinceCode]
          .filter(Boolean)
          .join(', '),
      })),
      raw: data,
    };
  } catch (error) {
    return { success: false, error: error?.message || 'FedEx tracking error' };
  }
}
