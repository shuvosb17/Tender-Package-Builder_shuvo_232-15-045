import { describe, expect, it } from 'vitest';
import { computeStatus } from './status';

const deadline = '2026-10-20';
const mandatoryExpiry = { mandatory: true, has_expiry: true };
const optionalExpiry = { mandatory: false, has_expiry: true };
const mandatoryPlain = { mandatory: true, has_expiry: false };
const optionalPlain = { mandatory: false, has_expiry: false };

describe('computeStatus', () => {
  it('mandatory with no file is Missing and blocks', () => {
    expect(computeStatus(mandatoryPlain, undefined, undefined, deadline)).toEqual({ code: 'missing', blocking: true });
  });

  it('optional with no file is Not provided and does not block', () => {
    expect(computeStatus(optionalPlain, undefined, undefined, deadline)).toEqual({ code: 'not_provided', blocking: false });
    expect(computeStatus(optionalExpiry, undefined, undefined, deadline).code).toBe('not_provided');
  });

  it('matched file without expiry requirement is OK', () => {
    expect(computeStatus(mandatoryPlain, 'f1', undefined, deadline)).toEqual({ code: 'ok', blocking: false });
  });

  it('needs an expiry date when has_expiry and a file is matched', () => {
    expect(computeStatus(mandatoryExpiry, 'f1', undefined, deadline)).toEqual({ code: 'expiry_needed', blocking: true });
    expect(computeStatus(mandatoryExpiry, 'f1', '', deadline).code).toBe('expiry_needed');
  });

  it('expiry before the deadline is Expired and blocks', () => {
    expect(computeStatus(mandatoryExpiry, 'f1', '2026-10-19', deadline)).toEqual({
      code: 'expired',
      blocking: true,
      expiry: '2026-10-19',
    });
  });

  it('same-day expiry as the deadline is OK', () => {
    expect(computeStatus(mandatoryExpiry, 'f1', '2026-10-20', deadline)).toEqual({ code: 'ok', blocking: false });
  });

  it('expiry after the deadline is OK', () => {
    expect(computeStatus(mandatoryExpiry, 'f1', '2027-01-01', deadline).code).toBe('ok');
  });

  it('optional document with a matched file still checks its expiry', () => {
    expect(computeStatus(optionalExpiry, 'f1', undefined, deadline)).toEqual({ code: 'expiry_needed', blocking: true });
    expect(computeStatus(optionalExpiry, 'f1', '2026-01-01', deadline).code).toBe('expired');
    expect(computeStatus(optionalExpiry, 'f1', '2026-10-20', deadline).code).toBe('ok');
  });

  it('ignores a stale expiry when no file is matched', () => {
    expect(computeStatus(mandatoryExpiry, undefined, '2020-01-01', deadline).code).toBe('missing');
  });
});
