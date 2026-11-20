import { TagCount } from '../models/note';

/** "  Work Notes " -> "work-notes", "#todo" -> "todo" */
export function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_/-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

export function normalizeTags(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(String(value));
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

export function countTags(notes: { tags: string[] }[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
