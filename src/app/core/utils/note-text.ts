import { Note } from '../models/note';

export const UNTITLED = 'Untitled note';
const FENCE = /^\s{0,3}(```|~~~)/;
const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

/** Strips inline markdown so text reads naturally in titles and excerpts. */
export function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function stripLine(line: string): string {
  return stripInline(
    line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*(?:>\s*)+/, '')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, '')
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .replace(/\s*\|\s*/g, ' · '),
  );
}

/** Title = first heading, otherwise the first non-empty line. */
export function deriveTitle(body: string): string {
  const lines = body.split('\n');
  let inFence = false;
  let firstLine = '';
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = HEADING.exec(line);
    if (heading) return truncate(stripInline(heading[1]), 90) || UNTITLED;
    if (!firstLine && line.trim() && !/^\s*([-*_=])\1{2,}\s*$/.test(line)) firstLine = line;
  }
  return truncate(stripLine(firstLine), 90) || UNTITLED;
}

/**
 * Plain text of the body, one entry per line. Used for excerpts and search.
 * With `skipHeadings` only the content is kept, which reads better in the notes list.
 */
function plainLines(body: string, skipHeadings = false): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (/^\s*\|?\s*:?-{3,}/.test(line) || /^\s*([-*_])\1{2,}\s*$/.test(line)) continue;
    if (skipHeadings && !inFence && HEADING.test(line)) continue;
    const text = inFence ? line.trim() : stripLine(line);
    if (text) out.push(text);
  }
  return out;
}

export function toPlainText(body: string): string {
  return plainLines(body).join(' ').replace(/\s+/g, ' ').trim();
}

export function excerpt(body: string, title: string, length = 140): string {
  const lines = plainLines(body, true);
  if (lines[0] === title) lines.shift();
  // separate lines that don't end in punctuation, e.g. list items
  const text = lines.reduce((acc, line) => (!acc ? line : /[.!?:;,…]$/.test(acc) ? `${acc} ${line}` : `${acc} · ${line}`), '');
  return truncate(text.replace(/\s+/g, ' ').trim(), length);
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.slice(0, length - 1).trimEnd() + '…' : text;
}

export interface TextStats {
  words: number;
  characters: number;
  readingMinutes: number;
}

export function textStats(body: string): TextStats {
  const words = body.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0;
  return {
    words,
    characters: body.length,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 220)),
  };
}

export interface NoteMeta {
  title: string;
  excerpt: string;
  /** lowercase title + plain body, for searching */
  haystack: string;
}

// notes are immutable, so derived text can be cached per object
const metaCache = new WeakMap<Note, NoteMeta>();

export function noteMeta(note: Note): NoteMeta {
  let meta = metaCache.get(note);
  if (!meta) {
    const title = deriveTitle(note.body);
    meta = {
      title,
      excerpt: excerpt(note.body, title),
      haystack: `${title}\n${toPlainText(note.body)}`.toLowerCase(),
    };
    metaCache.set(note, meta);
  }
  return meta;
}
