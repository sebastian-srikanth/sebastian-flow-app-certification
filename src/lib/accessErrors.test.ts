import { describe, expect, it } from 'vitest';

import { isAccessDeniedError } from './accessErrors';

describe('isAccessDeniedError', () => {
  it('detects HTTP 401 and 403 status codes', () => {
    expect(isAccessDeniedError(Object.assign(new Error('Unauthorized'), { status: 401 }))).toBe(true);
    expect(isAccessDeniedError(Object.assign(new Error('Forbidden'), { status: 403 }))).toBe(true);
  });

  it('detects authorization phrases in error messages', () => {
    expect(isAccessDeniedError(new Error('Access denied to resource'))).toBe(true);
    expect(isAccessDeniedError(new Error('User is not authorized'))).toBe(true);
  });

  it('returns false for generic errors', () => {
    expect(isAccessDeniedError(new Error('Network timeout'))).toBe(false);
    expect(isAccessDeniedError('not an error')).toBe(false);
  });
});
