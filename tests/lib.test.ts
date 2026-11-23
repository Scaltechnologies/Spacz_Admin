import { describe, expect, it } from 'vitest';
import { accountActions, hallActions, vendorActions, reasonRequired } from '@/lib/status';
import { datePreset, formatMoney, formatPercent, formatPhone, todayIST } from '@/lib/format';
import { toCsv } from '@/lib/utils';
import { parseUserAgent } from '@/lib/user-agent';
import { passwordSchema, programSchema, adminProfileSchema, passwordStrength } from '@/lib/schemas';
import { normalizeIconName } from '@/components/shared/AmenityIcon';

describe('moderation state machines (mirror studyhall-service)', () => {
  it('vendor transitions', () => {
    expect(vendorActions.PENDING).toEqual(['approve', 'reject']);
    expect(vendorActions.REJECTED).toEqual(['approve']);
    expect(vendorActions.DRAFT).toEqual([]);
    expect(vendorActions.SUSPENDED).toEqual(['activate']);
    expect(vendorActions.INACTIVE).toEqual(expect.arrayContaining(['suspend', 'activate']));
  });
  it('hall transitions: suspend only from PENDING_APPROVAL, APPROVED, ACTIVE, INACTIVE', () => {
    const canSuspend = Object.entries(hallActions).filter(([, a]) => a.includes('suspend')).map(([s]) => s).sort();
    expect(canSuspend).toEqual(['ACTIVE', 'APPROVED', 'INACTIVE', 'PENDING_APPROVAL']);
    expect(hallActions.REJECTED).toEqual([]);
    expect(hallActions.SUSPENDED).toEqual(['activate']);
  });
  it('accounts: admins and self are protected', () => {
    expect(accountActions('ADMIN', 'ACTIVE', false)).toEqual([]);
    expect(accountActions('USER', 'ACTIVE', true)).toEqual([]);
    expect(accountActions('USER', 'ACTIVE', false)).toEqual(['suspend']);
    expect(accountActions('VENDOR', 'SUSPENDED', false)).toEqual(['activate']);
    expect(accountActions('USER', 'DISABLED', false)).toEqual([]);
  });
  it('reject and suspend require reasons', () => {
    expect(reasonRequired).toEqual({ approve: false, reject: true, suspend: true, activate: false });
  });
});

describe('formatters', () => {
  it('formats INR with Indian grouping', () => {
    expect(formatMoney(125000)).toBe('₹1,25,000.00');
    expect(formatMoney(null)).toBe('—');
  });
  it('refuses to compute a percentage with an invalid denominator', () => {
    expect(formatPercent(5, 0)).toBeNull();
    expect(formatPercent(800, 3200)).toBe('25.0%');
  });
  it('formats Indian phone numbers', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhone(null)).toBe('—');
  });
  it('computes IST date presets', () => {
    // 2026-10-18 20:00 UTC is already 19 Oct in IST
    const now = new Date('2026-10-18T20:00:00Z');
    expect(todayIST(now)).toBe('2026-10-19');
    expect(datePreset('today', now)).toEqual({ from: '2026-10-19', to: '2026-10-19' });
    expect(datePreset('week', now)).toEqual({ from: '2026-10-19', to: '2026-10-25' }); // Monday-start week
    expect(datePreset('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
});

describe('CSV', () => {
  it('escapes quotes, commas and formula injection', () => {
    const csv = toCsv([{ a: 'x,"y"', b: '=SUM(A1)' }], [
      { header: 'A', value: (r) => r.a },
      { header: 'B', value: (r) => r.b },
    ]);
    expect(csv).toBe('A,B\r\n"x,""y""",\'=SUM(A1)');
  });
});

describe('user agent', () => {
  it('summarises common agents', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36')).toBe('Chrome 140 on Windows');
    expect(parseUserAgent('okhttp/4.12.0')).toBe('okhttp');
    expect(parseUserAgent(null)).toBeNull();
  });
});

describe('validation schemas mirror the backend', () => {
  it('program code pattern', () => {
    expect(programSchema.safeParse({ code: 'TS EAMCET', name: 'x', category: 'y', active: true }).success).toBe(false);
    expect(programSchema.safeParse({ code: 'TS-EAMCET_2', name: 'x', category: 'y', active: true }).success).toBe(true);
  });
  it('password rules: 8-72 chars, letter and digit, confirmation must match', () => {
    const s = passwordSchema(true);
    expect(s.safeParse({ currentPassword: 'old', newPassword: 'abcdefgh', confirm: 'abcdefgh' }).success).toBe(false);
    expect(s.safeParse({ currentPassword: 'old', newPassword: 'abcdefg1', confirm: 'abcdefg2' }).success).toBe(false);
    expect(s.safeParse({ currentPassword: '', newPassword: 'abcdefg1', confirm: 'abcdefg1' }).success).toBe(false);
    expect(s.safeParse({ currentPassword: 'old', newPassword: 'abcdefg1', confirm: 'abcdefg1' }).success).toBe(true);
    expect(passwordSchema(false).safeParse({ newPassword: 'abcdefg1', confirm: 'abcdefg1' }).success).toBe(true);
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('Abcdefgh12!x')).toBe(4);
  });
  it('admin profile phone pattern', () => {
    expect(adminProfileSchema.safeParse({ fullName: 'P', email: '', phone: 'abc', title: '' }).success).toBe(false);
    expect(adminProfileSchema.safeParse({ fullName: 'P', email: '', phone: '+91 98765 43210', title: '' }).success).toBe(true);
  });
});

describe('amenity icon names', () => {
  it('normalises stored names and rejects unknown ones', () => {
    expect(normalizeIconName('BookOpen')).toBe('book-open');
    expect(normalizeIconName(' wifi ')).toBe('wifi');
    expect(normalizeIconName('definitely-not-an-icon')).toBeNull();
  });
});
