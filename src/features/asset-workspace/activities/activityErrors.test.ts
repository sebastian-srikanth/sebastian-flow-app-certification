import { describe, expect, it } from 'vitest';

import { getActivityErrorMessage, isAccessDeniedError } from './activityErrors';

describe('activityErrors', () => {
  it('detects access denied errors from status codes and messages', () => {
    expect(isAccessDeniedError(Object.assign(new Error('Forbidden'), { status: 403 }))).toBe(true);
    expect(isAccessDeniedError(new Error('Request failed with status 403'))).toBe(true);
    expect(isAccessDeniedError(new Error('Access denied to instances'))).toBe(true);
    expect(isAccessDeniedError(new Error('Network timeout'))).toBe(false);
  });

  it('returns a friendly fallback message for unknown errors', () => {
    expect(getActivityErrorMessage(new Error('CDF unavailable'))).toBe('CDF unavailable');
    expect(getActivityErrorMessage('unknown')).toBe('Unable to load work orders for this asset.');
  });
});
