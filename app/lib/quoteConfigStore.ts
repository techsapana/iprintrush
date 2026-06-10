import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  QuoteConfigStore,
  UUID,
  QuantityTier,
  ShippingConfig,
} from './quoteConfigTypes';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'quoteConfig.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createDefaultConfig(): QuoteConfigStore {
  const id = () => randomUUID() as UUID;

  const defaultTiers: QuantityTier[] = [
    { id: id(), minQty: 1, maxQty: 5, unitPrice: 25, enabled: true },
    { id: id(), minQty: 6, maxQty: 11, unitPrice: 20, enabled: true },
    { id: id(), minQty: 12, maxQty: 23, unitPrice: 18, enabled: true },
    { id: id(), minQty: 24, maxQty: 35, unitPrice: 16, enabled: true },
    { id: id(), minQty: 36, maxQty: 71, unitPrice: 14, enabled: true },
  ];

  const shipping: ShippingConfig = {
    enabled: true,
    defaultFlatRate: 15,
    under100Rate: 0,
    between100And199Rate: 0,
    over200Rate: 0,
    rules: [],
  };

  return {
    decorations: [
      { id: id(), name: 'DTF Printed', priceModifier: 0, enabled: true },
      { id: id(), name: 'Screen Printed', priceModifier: 0, enabled: true },
      { id: id(), name: 'Embroidery', priceModifier: 5, enabled: true },
    ],
    colors: [
      { id: id(), name: 'White', hex: '#ffffff', enabled: true },
      { id: id(), name: 'Black', hex: '#000000', enabled: true },
      { id: id(), name: 'Red', hex: '#ef4444', enabled: true },
      { id: id(), name: 'Royal Blue', hex: '#2563eb', enabled: true },
    ],
    quantityTiers: defaultTiers,
    sizes: [
      { id: id(), label: 'S', baseEnabled: true, priceAddon: 0 },
      { id: id(), label: 'M', baseEnabled: true, priceAddon: 0 },
      { id: id(), label: 'L', baseEnabled: true, priceAddon: 0 },
      { id: id(), label: 'XL', baseEnabled: true, priceAddon: 0 },
      { id: id(), label: '2XL', baseEnabled: true, priceAddon: 3 },
      { id: id(), label: '3XL', baseEnabled: true, priceAddon: 5 },
      { id: id(), label: '4XL', baseEnabled: true, priceAddon: 5 },
    ],
    printLocations: [
      { id: id(), name: 'Front', priceModifier: 5, enabled: true },
      { id: id(), name: 'Back', priceModifier: 5, enabled: true },
      { id: id(), name: 'Sleeve', priceModifier: 5, enabled: true },
    ],
    turnarounds: [
      { id: id(), name: '2 Hours (Rush)', priceModifier: 25, enabled: true },
      { id: id(), name: 'Same Day', priceModifier: 0, enabled: true },
      { id: id(), name: 'Next Day', priceModifier: 0, enabled: true },
      { id: id(), name: 'Standard', priceModifier: 0, enabled: true },
    ],
    designerHelp: [
      { id: id(), name: 'Basic Help', priceModifier: 0, enabled: true },
      { id: id(), name: 'Standard Help', priceModifier: 10, enabled: true },
      { id: id(), name: 'Premium Help', priceModifier: 25, enabled: true },
    ],
    shipping,
    productSettings: [],
  };
}

export function readQuoteConfig(): QuoteConfigStore {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaults = createDefaultConfig();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw) as QuoteConfigStore;
}

export function writeQuoteConfig(config: QuoteConfigStore): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export function upsertProductSettings(
  config: QuoteConfigStore,
  settings: QuoteConfigStore['productSettings'][number],
): QuoteConfigStore {
  const existingIndex = config.productSettings.findIndex(
    (p) => p.productId === settings.productId,
  );
  if (existingIndex >= 0) {
    config.productSettings[existingIndex] = settings;
  } else {
    config.productSettings.push(settings);
  }
  return config;
}

