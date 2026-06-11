/**
 * utils/index.js — Barrel export for utility functions
 */
export { formatDate, formatDisplayDate } from './date.js';

/**
 * Generate an auto voucher number with a prefix and timestamp.
 * e.g. generateVoucherNo('DN') → 'DN-20250608-0001'
 */
export function generateVoucherNo(prefix = 'VCH') {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = String(now.getTime()).slice(-4);
  return `${prefix}-${datePart}-${timePart}`;
}
