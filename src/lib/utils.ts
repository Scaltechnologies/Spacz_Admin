import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CsvCell = string | number | boolean | null | undefined;

function csvEscape(value: CsvCell) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => CsvCell }[]) {
  const head = columns.map((c) => csvEscape(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿', content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampForFile(d = new Date()) {
  return d.toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function displayName(parts: { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null }) {
  const name = [parts.firstName, parts.lastName].filter(Boolean).join(' ').trim();
  return name || parts.email || parts.phone || 'Unnamed';
}
