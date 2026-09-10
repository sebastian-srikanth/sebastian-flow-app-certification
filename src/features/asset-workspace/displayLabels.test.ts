import { describe, expect, it } from 'vitest';

import {
  getPrimaryLabel,
  getSecondaryExternalId,
  isSameDisplayAndExternalId,
  normalizeLabel,
} from './displayLabels';

describe(normalizeLabel.name, () => {
  it('should trim and lowercase labels for comparison', () => {
    expect(normalizeLabel('  PUMP-101  ')).toBe('pump-101');
  });
});

describe(isSameDisplayAndExternalId.name, () => {
  it('should treat missing display names as matching external id', () => {
    expect(isSameDisplayAndExternalId(undefined, 'PUMP-101')).toBe(true);
  });

  it('should compare display name and external id case-insensitively', () => {
    expect(isSameDisplayAndExternalId('pump-101', 'PUMP-101')).toBe(true);
    expect(isSameDisplayAndExternalId('Feed pump', 'PUMP-101')).toBe(false);
  });
});

describe(getPrimaryLabel.name, () => {
  it('should prefer the display name when present', () => {
    expect(getPrimaryLabel('Feed pump', 'PUMP-101')).toBe('Feed pump');
  });

  it('should fall back to external id when name is missing', () => {
    expect(getPrimaryLabel(undefined, 'PUMP-101')).toBe('PUMP-101');
  });
});

describe(getSecondaryExternalId.name, () => {
  it('should omit secondary id when it matches the display name', () => {
    expect(getSecondaryExternalId('PUMP-101', 'PUMP-101')).toBeUndefined();
  });

  it('should return external id when it differs from the display name', () => {
    expect(getSecondaryExternalId('Feed pump', 'PUMP-101')).toBe('PUMP-101');
  });
});
