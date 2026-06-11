/**
 * utils/date.js — Date utility helpers
 */

/**
 * Format a Date object or date string as YYYY-MM-DD (HTML date input format).
 */
export function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

/**
 * Format a Date object or date string as DD/MM/YYYY (display format).
 */
export function formatDisplayDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}
