import { Note, NoteFilter, SortKey } from '../models/note';
import { noteMeta, toPlainText, truncate } from './note-text';

/** Splits a search string into lowercase terms; quoted phrases stay together. */
export function parseQuery(query: string): string[] {
  const terms: string[] = [];
  for (const match of query.toLowerCase().matchAll(/"([^"]+)"|(\S+)/g)) {
    const term = (match[1] ?? match[2]).trim();
    if (term && !terms.includes(term)) terms.push(term);
  }
  return terms;
}

export function matchesTerms(note: Note, terms: string[]): boolean {
  if (!terms.length) return true;
  const { haystack } = noteMeta(note);
  return terms.every((term) => haystack.includes(term) || note.tags.includes(term.replace(/^#/, '')));
}

export function filterNotes(notes: Note[], filter: NoteFilter): Note[] {
  const terms = parseQuery(filter.query);
  return notes.filter((note) => {
    if (filter.view === 'trash') {
      if (note.deletedAt === null) return false;
    } else {
      if (note.deletedAt !== null) return false;
      if (filter.view === 'pinned' && !note.pinned) return false;
      if (filter.view === 'untagged' && note.tags.length) return false;
      if (filter.tag && !note.tags.includes(filter.tag)) return false;
    }
    return matchesTerms(note, terms);
  });
}

export function sortNotes(notes: Note[], sort: SortKey): Note[] {
  const sorted = [...notes];
  switch (sort) {
    case 'created':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case 'title':
      return sorted.sort(
        (a, b) =>
          noteMeta(a).title.localeCompare(noteMeta(b).title, undefined, { sensitivity: 'base', numeric: true }) ||
          b.updatedAt - a.updatedAt,
      );
    default:
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export interface TextSegment {
  text: string;
  match: boolean;
}

/** Splits text into plain and matching parts so the template can wrap matches in <mark>. */
export function highlight(text: string, terms: string[]): TextSegment[] {
  const needles = terms.map((t) => t.replace(/^#/, '')).filter(Boolean);
  if (!needles.length || !text) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const needle of needles) {
    let from = 0;
    let index: number;
    while ((index = lower.indexOf(needle, from)) !== -1) {
      ranges.push([index, index + needle.length]);
      from = index + needle.length;
    }
  }
  if (!ranges.length) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const segments: TextSegment[] = [];
  let pos = 0;
  for (const [start, end] of merged) {
    if (start > pos) segments.push({ text: text.slice(pos, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    pos = end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), match: false });
  return segments;
}

/** Excerpt centred on the first search hit, so matches deep in a note are visible in the list. */
export function searchSnippet(note: Note, terms: string[], length = 140): string {
  const meta = noteMeta(note);
  const needles = terms.map((t) => t.replace(/^#/, '')).filter(Boolean);
  if (!needles.length) return meta.excerpt;
  const lowerExcerpt = meta.excerpt.toLowerCase();
  if (needles.some((t) => lowerExcerpt.includes(t))) return meta.excerpt;

  let rest = toPlainText(note.body);
  if (rest.startsWith(meta.title)) rest = rest.slice(meta.title.length).trim();
  const lower = rest.toLowerCase();
  const hits = needles.map((t) => lower.indexOf(t)).filter((i) => i >= 0);
  if (!hits.length) return meta.excerpt;

  const start = Math.max(0, Math.min(...hits) - 40);
  const cut = start > 0 ? '…' + rest.slice(start).replace(/^\S*\s+/, '') : rest;
  return truncate(cut, length);
}
