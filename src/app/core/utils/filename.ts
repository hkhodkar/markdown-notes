const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/** Makes a note title safe to use as a file name on Windows, macOS and Linux. */
export function sanitizeFilename(title: string, fallback = 'untitled'): string {
  let name = title
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s-]+|[.\s]+$/g, '');
  if (name.length > 80) name = name.slice(0, 80).trim();
  if (!name) return fallback;
  if (RESERVED.test(name)) name = `${name}-note`;
  return name;
}

/** Adds " (2)", " (3)"... when the same file name is used more than once. */
export function uniqueFilename(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = name;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = `${base} (${i})${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

export function datedFilename(prefix: string, ext: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${ext}`;
}
