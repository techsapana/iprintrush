export type UUID = string;

export type DecorationOption = {
  id: UUID;
  name: string;
  description?: string;
  priceModifier: number; // flat per-unit adder
  enabled: boolean;
};

export type ColorOption = {
  id: UUID;
  name: string;
  hex?: string;
  enabled: boolean;
};

export type QuantityTier = {
  id: UUID;
  minQty: number;
  maxQty: number | null; // null = no upper bound
  unitPrice: number;
  /**
   * Unified discount rule for tier pricing:
   * - 'NONE': No discount, use unitPrice only
   * - 'PERCENT': Apply discount_value % off base total
   * - 'FIXED': Subtract discount_value dollars from base total
   */
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: number; // percentage (e.g. 10 = 10%) or fixed dollar amount
  enabled: boolean;
};

export type SizeOption = {
  id: UUID;
  label: string; // e.g. "S", "M", "L", "2XL"
  baseEnabled: boolean;
  priceAddon: number; // per-unit surcharge for this size
};

export type PrintLocationOption = {
  id: UUID;
  name: string; // e.g. "Front"
  priceModifier: number; // per-unit or per-order, treated as per-unit in calc
  enabled: boolean;
};

export type TurnaroundOption = {
  id: UUID;
  name: string; // "2 Hours (Rush)", "Same Day"
  description?: string;
  priceModifier: number; // per-order surcharge
  enabled: boolean;
  pricingType?: 'flat' | 'percentage';
  percentageValue?: number | null;
};

export type DesignerHelpOption = {
  id: UUID;
  name: string;
  description?: string;
  priceModifier: number; // per-order surcharge
  enabled: boolean;
};

export type ShippingMode = 'flat' | 'state' | 'zip';

export type ShippingRule = {
  id: UUID;
  mode: ShippingMode;
  state?: string;
  zipPrefix?: string;
  flatRate: number;
  enabled: boolean;
};

export type ShippingConfig = {
  enabled: boolean;
  defaultFlatRate: number;
  oversizedWidthThresholdIn: number;
  under100Rate: number;
  between100And199Rate: number;
  over200Rate: number;
  localUnder100Rate: number;
  localBetween100And199Rate: number;
  localOver200Rate: number;
  rules: ShippingRule[];
};

export type ProductQuoteSettings = {
  productId: string;
  enabled: boolean;
  decorationOptionIds: UUID[];
  colorOptionIds: UUID[];
  sizeOptionIds: UUID[];
  printLocationOptionIds: UUID[];
  turnaroundOptionIds: UUID[];
  designerHelpOptionIds: UUID[];
  quantityTierIds: UUID[];
};

export type QuoteConfigStore = {
  decorations: DecorationOption[];
  colors: ColorOption[];
  quantityTiers: QuantityTier[];
  sizes: SizeOption[];
  printLocations: PrintLocationOption[];
  turnarounds: TurnaroundOption[];
  designerHelp: DesignerHelpOption[];
  shipping: ShippingConfig;
  productSettings: ProductQuoteSettings[];
  baseUnitPrice?: number | null; // Product's base price for print products
};

export type QuoteLineItem = {
  label: string;
  amount: number;
};

export type SizeQuantitySelection = {
  sizeId: UUID;
  quantity: number;
};

export type QuoteRequestPayload = {
  productId: string;
  decorationOptionId: UUID | null;
  colorOptionId: UUID | null;
  quantities: SizeQuantitySelection[];
  printLocationIds: UUID[];
  turnaroundOptionId: UUID | null;
  designerHelpOptionId: UUID | null;
  deliveryMethod: 'pickup' | 'local_delivery' | 'standard_shipping';
  shippingState?: string;
  shippingZip?: string;
  shippingCity?: string;
  /**
   * Full street address (first line) for shipping destination.
   */
  shippingStreet?: string;
  /**
   * When true, customer is supplying their own garments (\"use my cloth\").
   * In this mode we should not charge size-based surcharges for larger sizes.
   */
  useMyCloth?: boolean;
  /**
   * True when product belongs to Custom Apparels flow.
   * Used for turnaround/rush pricing behavior.
   */
  isCustomApparels?: boolean;
};

export type QuoteSummary = {
  productId: string;
  totalQuantity: number;
  unitPrice: number;
  sizeBreakdown: {
    sizeLabel: string;
    quantity: number;
  }[];
  lineItems: QuoteLineItem[];
  subtotal: number;
  merchandiseSubtotal: number;
  shipping: number;
  grandTotal: number;
};

// ============ Dynamic Print Product Customization ============

export type CustomizationSchemaMode = 'apparel' | 'print_product';

export type CustomizationGroupConfig = {
  poolKey: string;
  label: string;
  required?: boolean;
  selectionType: 'single' | 'multi' | 'quantity';
  useTiers?: boolean;
};

export type CategoryCustomizationSchema = {
  mode: CustomizationSchemaMode;
  groups?: CustomizationGroupConfig[];
};

export type CustomizationOption = {
  id: string;
  label: string;
  value?: string;
  priceModifier: number;
  enabled: boolean;
  pricingType?: 'flat' | 'percentage';
  percentageValue?: number | null;
};

export type CustomizationPool = {
  id: string;
  key: string;
  name: string;
  selectionType: string;
  priceType: string;
  options: CustomizationOption[];
  quantityTiers?: { minQty: number; maxQty: number | null; unitPrice: number; discountType?: 'NONE' | 'PERCENT' | 'FIXED'; discountValue?: number; label?: string }[];
};

export type DynamicQuoteRequestPayload = {
  productId: string;
  mode: 'print_product';
  selections: Record<string, string | string[] | number>; // poolKey -> optionId | optionIds[] | quantity
  deliveryMethod: 'pickup' | 'local_delivery' | 'standard_shipping';
  shippingState?: string;
  shippingZip?: string;
  shippingCity?: string;
  /**
   * Full street address (first line) for shipping destination.
   */
  shippingStreet?: string;
  /** Customer artwork (temp upload ids), same contract as apparel quotes. */
  artworkReady?: boolean;
  tempArtworkFiles?: string[];
};

export type DynamicQuoteSummary = QuoteSummary;
