import { Note } from '../models/note';
import { filterNotes, highlight, parseQuery, searchSnippet, sortNotes } from './note-query';
import { deriveTitle, excerpt, textStats } from './note-text';

let nextId = 0;
function note(body: string, extra: Partial<Note> = {}): Note {
  return { id: String(++nextId), body, tags: [], pinned: false, createdAt: 0, updatedAt: 0, deletedAt: null, ...extra };
}

describe('note text', () => {
  it('uses the first heading as the title', () => {
    expect(deriveTitle('intro line\n\n## The **real** title\n# Later')).toBe('The real title');
  });

  it('falls back to the first line without markdown syntax', () => {
    expect(deriveTitle('\n- [ ] buy [milk](https://x.y)\nmore')).toBe('buy milk');
    expect(deriveTitle('```\n# not a heading\n```\nplain')).toBe('plain');
    expect(deriveTitle('   ')).toBe('Untitled note');
  });

  it('builds a plain excerpt without the title and code fences', () => {
    const body = '# Title\n\n**Bold** start\n\n- one\n- two\n\n```ts\nconst x = 1;\n```';
    expect(excerpt(body, 'Title')).toBe('Bold start · one · two · const x = 1;');
  });

  it('counts words, characters and reading time', () => {
    expect(textStats('')).toEqual({ words: 0, characters: 0, readingMinutes: 0 });
    const stats = textStats("# Hello world\n\nIt's a *small* note.");
    expect(stats.words).toBe(6);
    expect(stats.readingMinutes).toBe(1);
    expect(textStats('word '.repeat(660)).readingMinutes).toBe(3);
  });
});

describe('search and filter', () => {
  const groceries = note('# Groceries\n\nMilk, eggs and bread', { tags: ['home'], updatedAt: 30, createdAt: 1 });
  const meeting = note('# Team meeting\n\nDiscuss the release', { tags: ['work'], pinned: true, updatedAt: 20, createdAt: 3 });
  const draft = note('Untitled idea about bread', { updatedAt: 10, createdAt: 2 });
  const trashed = note('# Old bread recipe', { deletedAt: 5 });
  const all = [groceries, meeting, draft, trashed];

  it('parses terms and quoted phrases', () => {
    expect(parseQuery('  Bread  "team meeting" bread ')).toEqual(['bread', 'team meeting']);
  });

  it('matches every term in title or body, case-insensitive', () => {
    const ids = (q: string) => filterNotes(all, { view: 'all', tag: null, query: q }).map((n) => n.id);
    expect(ids('BREAD')).toEqual([groceries.id, draft.id]);
    expect(ids('bread milk')).toEqual([groceries.id]);
    expect(ids('"team meeting"')).toEqual([meeting.id]);
    expect(ids('#work')).toEqual([meeting.id]);
    expect(ids('nothing-like-this')).toEqual([]);
  });

  it('filters by view and tag', () => {
    const ids = (view: 'all' | 'pinned' | 'untagged' | 'trash', tag: string | null = null) =>
      filterNotes(all, { view, tag, query: '' }).map((n) => n.id);
    expect(ids('all')).toEqual([groceries.id, meeting.id, draft.id]);
    expect(ids('pinned')).toEqual([meeting.id]);
    expect(ids('untagged')).toEqual([draft.id]);
    expect(ids('trash')).toEqual([trashed.id]);
    expect(ids('all', 'home')).toEqual([groceries.id]);
  });

  it('sorts by updated, created and title', () => {
    const notes = [draft, meeting, groceries];
    expect(sortNotes(notes, 'updated').map((n) => n.id)).toEqual([groceries.id, meeting.id, draft.id]);
    expect(sortNotes(notes, 'created').map((n) => n.id)).toEqual([meeting.id, draft.id, groceries.id]);
    expect(sortNotes(notes, 'title').map((n) => n.id)).toEqual([groceries.id, meeting.id, draft.id]);
  });

  it('splits text into highlighted segments', () => {
    expect(highlight('Bread and more bread', ['bread'])).toEqual([
      { text: 'Bread', match: true },
      { text: ' and more ', match: false },
      { text: 'bread', match: true },
    ]);
    // overlapping terms are merged into one mark
    expect(highlight('release', ['rel', 'lease'])).toEqual([{ text: 'release', match: true }]);
    expect(highlight('nothing', [])).toEqual([{ text: 'nothing', match: false }]);
  });

  it('shows a snippet around a match deep in the note', () => {
    const long = note(`# Log\n\n${'Lorem ipsum dolor sit amet. '.repeat(12)}The deploy key lives in the vault.`);
    const snippet = searchSnippet(long, ['vault']);
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet).toContain('vault');
    expect(searchSnippet(long, [])).toBe(excerpt(long.body, 'Log'));
  });
});
