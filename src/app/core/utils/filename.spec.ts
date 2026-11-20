import { datedFilename, sanitizeFilename, uniqueFilename } from './filename';
import { parseFrontMatter, withFrontMatter } from './front-matter';

describe('export file names', () => {
  it('removes characters that are not allowed in file names', () => {
    expect(sanitizeFilename('Notes: 2026/11 <draft>?')).toBe('Notes 2026 11 draft');
    expect(sanitizeFilename('a\\b|c*d"e')).toBe('a b c d e');
    expect(sanitizeFilename('tab\tand\nnewline')).toBe('tab and newline');
  });

  it('trims dots and spaces and falls back when nothing is left', () => {
    expect(sanitizeFilename('  ..hidden. ')).toBe('hidden');
    expect(sanitizeFilename('???')).toBe('untitled');
    expect(sanitizeFilename('', 'note')).toBe('note');
  });

  it('avoids reserved Windows names and very long names', () => {
    expect(sanitizeFilename('CON')).toBe('CON-note');
    expect(sanitizeFilename('x'.repeat(200)).length).toBe(80);
  });

  it('keeps unicode letters', () => {
    expect(sanitizeFilename('Café ☕ notes')).toBe('Café ☕ notes');
  });

  it('numbers duplicate names', () => {
    const used = new Set<string>();
    expect(uniqueFilename('Todo.md', used)).toBe('Todo.md');
    expect(uniqueFilename('todo.md', used)).toBe('todo (2).md');
    expect(uniqueFilename('Todo.md', used)).toBe('Todo (3).md');
  });

  it('adds the date to export archives', () => {
    expect(datedFilename('markdown-notes', 'zip', new Date(2026, 0, 5))).toBe('markdown-notes-2026-01-05.zip');
  });
});

describe('front matter', () => {
  it('round-trips tags through export and import', () => {
    const text = withFrontMatter('# Hi', ['work', 'ideas']);
    expect(parseFrontMatter(text)).toEqual({ body: '# Hi', tags: ['work', 'ideas'] });
  });

  it('reads dash lists and leaves files without front matter alone', () => {
    expect(parseFrontMatter('---\ntitle: x\ntags:\n  - One\n  - "two words"\n---\nbody').tags).toEqual(['one', 'two-words']);
    expect(parseFrontMatter('# Just markdown\n---\n')).toEqual({ body: '# Just markdown\n---\n', tags: [] });
  });
});
