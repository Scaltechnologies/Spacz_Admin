/** Formatting helpers. All times are shown in the business time zone, Asia/Kolkata (IST). */
export const TIME_ZONE = 'Asia/Kolkata';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');
const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: true });
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false });
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatMoney(value: number | null | undefined, opts?: { compact?: boolean }) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return (opts?.compact ? inrCompact : inr).format(Number(value));
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return num.format(value);
}

export function formatPercent(numerator: number, denominator: number, digits = 1): string | null {
  if (!denominator || denominator <= 0 || !Number.isFinite(numerator)) return null;
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
}

/** Parses an ISO instant or a plain YYYY-MM-DD date (treated as a calendar date, not UTC midnight). */
function toDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 6, 30)); // noon IST — stays on the same calendar day
  }
  return new Date(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : `${dateTimeFmt.format(d)} IST`;
}

export function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : timeFmt.format(d);
}

/** "HH:mm[:ss]" → "9:00 AM" */
export function formatClock(value: string | null | undefined) {
  if (!value) return '—';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

export function formatRelative(value: string | null | undefined, now = Date.now()) {
  if (!value) return '—';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = (t - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIST(now = new Date()) {
  return toISODateIST(now);
}

export function toISODateIST(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts; // en-CA yields YYYY-MM-DD
}

export function addDaysISO(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Date presets for booking filters (IST calendar). Week starts Monday. */
export function datePreset(preset: 'today' | 'week' | 'month', now = new Date()): { from: string; to: string } {
  const today = todayIST(now);
  if (preset === 'today') return { from: today, to: today };
  const [y, m, d] = today.split('-').map(Number);
  if (preset === 'week') {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
    const offset = (dow + 6) % 7;
    const from = addDaysISO(today, -offset);
    return { from, to: addDaysISO(from, 6) };
  }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: `${y}-${String(m).padStart(2, '0')}-${last}` };
}

export function greeting(now = new Date()) {
  const h = Number(hourFmt.format(now)) % 24;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** +919876543210 → +91 98765 43210 */
export function formatPhone(value: string | null | undefined) {
  if (!value) return '—';
  const digits = value.replace(/[^\d+]/g, '');
  const m = digits.match(/^\+91(\d{5})(\d{5})$/);
  if (m) return `+91 ${m[1]} ${m[2]}`;
  return value;
}

export function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.replace(/[@+].*$/, '').trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return name.slice(0, 1).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function humanize(value: string | null | undefined) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
