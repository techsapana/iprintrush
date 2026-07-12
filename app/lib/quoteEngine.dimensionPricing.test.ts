import { describe, it, expect } from 'vitest';
import { parseDimensionsFromValue, resolveAddonsForMode } from './quoteEngine';

describe('parseDimensionsFromValue', () => {
  it('accepts 24x36', () => {
    expect(parseDimensionsFromValue('24x36')).toEqual({ width: 24, height: 36 });
  });

  it('accepts 8.5x11', () => {
    expect(parseDimensionsFromValue('8.5x11')).toEqual({ width: 8.5, height: 11 });
  });

  it('accepts 5.25x7.25', () => {
    expect(parseDimensionsFromValue('5.25x7.25')).toEqual({ width: 5.25, height: 7.25 });
  });

  it('accepts spaced lowercase 24 x 36', () => {
    expect(parseDimensionsFromValue('24 x 36')).toEqual({ width: 24, height: 36 });
  });

  it('accepts uppercase X 24 X 36', () => {
    expect(parseDimensionsFromValue('24 X 36')).toEqual({ width: 24, height: 36 });
  });

  it('rejects Custom', () => {
    expect(parseDimensionsFromValue('Custom')).toBeNull();
  });

  it('rejects Large', () => {
    expect(parseDimensionsFromValue('Large')).toBeNull();
  });

  it('rejects A4', () => {
    expect(parseDimensionsFromValue('A4')).toBeNull();
  });

  it('rejects ABC', () => {
    expect(parseDimensionsFromValue('ABC')).toBeNull();
  });

  it('rejects 10-window', () => {
    expect(parseDimensionsFromValue('10-window')).toBeNull();
  });

  it('rejects #10 Window', () => {
    expect(parseDimensionsFromValue('#10 Window')).toBeNull();
  });

  it('rejects unicode multiplication sign 24×36', () => {
    expect(parseDimensionsFromValue('24×36')).toBeNull();
  });

  it('rejects null', () => {
    expect(parseDimensionsFromValue(null)).toBeNull();
  });

  it('rejects undefined', () => {
    expect(parseDimensionsFromValue(undefined)).toBeNull();
  });

  it('rejects empty string', () => {
    expect(parseDimensionsFromValue('')).toBeNull();
  });

  it('never throws on arbitrary input', () => {
    expect(() => parseDimensionsFromValue({} as unknown)).not.toThrow();
    expect(parseDimensionsFromValue({} as unknown)).toBeNull();
    expect(() => parseDimensionsFromValue(12345)).not.toThrow();
    expect(parseDimensionsFromValue(12345)).toBeNull();
  });
});

function makePrintSizePool(value: string) {
  return [
    {
      key: 'print_sizes',
      name: 'Print Size',
      selectionType: 'single',
      options: [{ id: 'opt-size-1', label: '8.5" x 11"', value, priceModifier: 0, enabled: true }],
    },
  ];
}

describe('resolveAddonsForMode dimension pricing', () => {
  it('derives dimensions from a preset print size when area-priced', () => {
    const result = resolveAddonsForMode(
      {} as never,
      makePrintSizePool('8.5x11') as never,
      'print_product',
      { print_sizes: 'opt-size-1' },
      { pricePerSqInch: 0.05 },
    );
    const area = result.addonBreakdown.find((a) => a.label.startsWith('Area'));
    expect(area).toBeDefined();
    expect(area!.perUnit).toBeCloseTo(8.5 * 11 * 0.05, 5);
  });

  it('does not overwrite valid custom dimensions', () => {
    const result = resolveAddonsForMode(
      {} as never,
      makePrintSizePool('8.5x11') as never,
      'print_product',
      { print_sizes: 'opt-size-1', width_in: 10, height_in: 20 },
      { pricePerSqInch: 0.05 },
    );
    const area = result.addonBreakdown.find((a) => a.label.startsWith('Area'));
    expect(area).toBeDefined();
    expect(area!.perUnit).toBeCloseTo(10 * 20 * 0.05, 5);
  });

  it('does not add an area addon for non area-priced products', () => {
    const result = resolveAddonsForMode(
      {} as never,
      makePrintSizePool('8.5x11') as never,
      'print_product',
      { print_sizes: 'opt-size-1' },
      { pricePerSqInch: 0 },
    );
    expect(result.addonBreakdown.find((a) => a.label.startsWith('Area'))).toBeUndefined();
  });

  it('throws when area-priced but print size value is unparseable and no custom dims', () => {
    expect(() =>
      resolveAddonsForMode(
        {} as never,
        makePrintSizePool('Custom') as never,
        'print_product',
        { print_sizes: 'opt-size-1' },
        { pricePerSqInch: 0.05 },
      ),
    ).toThrow(/Valid width and height are required for dimension pricing/);
  });

  it('throws for envelope value (10-window) with no custom dims', () => {
    expect(() =>
      resolveAddonsForMode(
        {} as never,
        makePrintSizePool('10-window') as never,
        'print_product',
        { print_sizes: 'opt-size-1' },
        { pricePerSqInch: 0.05 },
      ),
    ).toThrow(/Valid width and height are required for dimension pricing/);
  });

  it('preserves non-area behavior for apparel mode', () => {
    const result = resolveAddonsForMode(
      {} as never,
      [] as never,
      'apparel',
      { decorationOptionId: 'x' },
      { pricePerSqInch: 0.05 },
    );
    expect(result.addonBreakdown.find((a) => a.label.startsWith('Area'))).toBeUndefined();
  });

  it('preserves non-area behavior for simple mode', () => {
    const result = resolveAddonsForMode(
      {} as never,
      makePrintSizePool('8.5x11') as never,
      'simple',
      { print_sizes: 'opt-size-1' },
      { pricePerSqInch: 0.05 },
    );
    expect(result.addonBreakdown).toHaveLength(0);
    expect(result.addonBreakdown.find((a) => a.label.startsWith('Area'))).toBeUndefined();
  });
});
