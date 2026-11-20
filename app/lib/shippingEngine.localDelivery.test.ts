import { describe, it, expect } from 'vitest';
import {
  computeLocalDeliveryCost,
  getShippingTierSubtotalFromCartItems,
} from './shippingEngine';

describe('computeLocalDeliveryCost', () => {
  it('charges delivery fee when free_delivery_minimum is 0 (disabled)', () => {
    expect(computeLocalDeliveryCost(50, 15, 0)).toBe(15);
    expect(computeLocalDeliveryCost(0, 15, 0)).toBe(15);
  });

  it('charges delivery fee when subtotal is below free_delivery_minimum', () => {
    expect(computeLocalDeliveryCost(99.99, 15, 100)).toBe(15);
  });

  it('waives delivery fee when free_delivery_minimum > 0 and subtotal meets or exceeds minimum', () => {
    expect(computeLocalDeliveryCost(100, 15, 100)).toBe(0);
    expect(computeLocalDeliveryCost(250, 15, 100)).toBe(0);
  });
});

describe('getShippingTierSubtotalFromCartItems', () => {
  it('ignores null shippingTierSubtotal and falls back to unit price * quantity', () => {
    expect(
      getShippingTierSubtotalFromCartItems([
        {
          id: '1',
          quantity: 2,
          price: 30,
          shippingTierSubtotal: null as unknown as number,
        },
      ]),
    ).toBe(60);
  });
});
