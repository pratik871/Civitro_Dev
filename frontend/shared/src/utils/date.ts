// ---------------------------------------------------------------------------
// Date formatting utilities
// ---------------------------------------------------------------------------

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Format an ISO 8601 date string into a human-readable format.
 *
 * @param dateStr - ISO 8601 date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string (e.g. "10 Mar 2026")
 */
export function formatDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(dateStr);
  const defaults: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  };
  return date.toLocaleDateString('en-IN', defaults);
}

/**
 * Format an ISO 8601 date string into a date + time format.
 *
 * @param dateStr - ISO 8601 date string
 * @returns Formatted string (e.g. "10 Mar 2026, 2:30 PM")
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Return a relative "time ago" string for an ISO 8601 date.
 *
 * @param dateStr - ISO 8601 date string
 * @returns Relative time string (e.g. "2 hours ago", "3 days ago")
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 0) return 'just now';
  if (diffSeconds < MINUTE) return 'just now';
  if (diffSeconds < HOUR) {
    const mins = Math.floor(diffSeconds / MINUTE);
    return `${mins}m ago`;
  }
  if (diffSeconds < DAY) {
    const hrs = Math.floor(diffSeconds / HOUR);
    return `${hrs}h ago`;
  }
  if (diffSeconds < WEEK) {
    const days = Math.floor(diffSeconds / DAY);
    return `${days}d ago`;
  }
  if (diffSeconds < MONTH) {
    const weeks = Math.floor(diffSeconds / WEEK);
    return `${weeks}w ago`;
  }
  if (diffSeconds < YEAR) {
    const months = Math.floor(diffSeconds / MONTH);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffSeconds / YEAR);
  return `${years}y ago`;
}

/**
 * Format a duration in seconds into a human-readable string.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g. "2h 30m", "5d 3h")
 */
export function formatDuration(seconds: number): string {
  if (seconds < MINUTE) return `${seconds}s`;
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `${m}m`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    const m = Math.floor((seconds % HOUR) / MINUTE);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / DAY);
  const h = Math.floor((seconds % DAY) / HOUR);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
