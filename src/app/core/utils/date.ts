const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relativeTime(time: number, now = Date.now()): string {
  const diff = Math.max(0, now - time);
  if (diff < MIN) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min ago`;
  if (diff < DAY && new Date(time).getDate() === new Date(now).getDate()) return `${Math.floor(diff / HOUR)} h ago`;
  const date = new Date(time);
  const yesterday = new Date(now - DAY);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (diff < 7 * DAY) return date.toLocaleDateString('en-US', { weekday: 'long' });
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function fullDate(time: number): string {
  return new Date(time).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
