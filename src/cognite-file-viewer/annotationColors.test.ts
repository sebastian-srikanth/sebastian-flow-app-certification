import { describe, expect, it } from 'vitest';

import { getAllAnnotationColors, getAnnotationColor } from './annotationColors';

describe('annotation colors', () => {
  it('returns the color assigned to each annotation resource type', () => {
    const colors = getAllAnnotationColors();

    expect(getAnnotationColor('asset')).toBe(colors.asset);
    expect(getAnnotationColor('unknown')).toBe(colors.unknown);
    expect(colors.timeSeries.stroke).toContain('rgb');
  });
});
