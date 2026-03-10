// ---------------------------------------------------------------------------
// Number, currency, and text formatting utilities
// ---------------------------------------------------------------------------

/**
 * Format a number with Indian-style grouping (lakhs and crores).
 *
 * @param num - The number to format
 * @returns Formatted number string (e.g. "1,23,456")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

/**
 * Format a number in compact form for display in badges.
 *
 * @param num - The number to compact
 * @returns Compact string (e.g. "1.2K", "3.5L", "1.2Cr")
 */
export function compactNumber(num: number): string {
  if (num < 1_000) return String(num);
  if (num < 1_00_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (num < 1_00_00_000) return `${(num / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`;
  return `${(num / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`;
}

/**
 * Format an amount in paisa as Indian Rupees.
 *
 * @param paisa - Amount in paisa (1 rupee = 100 paisa)
 * @returns Formatted currency string (e.g. "Rs 1,234.56")
 */
export function formatCurrency(paisa: number): string {
  const rupees = paisa / 100;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Truncate text to a maximum length with an ellipsis.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum character length (default 100)
 * @returns Truncated text with "..." if it exceeds maxLength
 */
export function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Format a percentage value.
 *
 * @param value - The value (0-1 or 0-100 depending on isNormalized)
 * @param isNormalized - Whether the value is 0-1 (default true)
 * @returns Formatted percentage string (e.g. "85.2%")
 */
export function formatPercentage(value: number, isNormalized = true): string {
  const pct = isNormalized ? value * 100 : value;
  return `${pct.toFixed(1).replace(/\.0$/, '')}%`;
}

/**
 * Format a rating value (0-5 scale) for display.
 *
 * @param rating - Rating value, 0-5
 * @returns Formatted rating string (e.g. "4.2")
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
