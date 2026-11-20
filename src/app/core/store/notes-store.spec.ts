import { TestBed } from '@angular/core/testing';
import { KEY_VALUE_STORAGE, MemoryStorage } from '../storage/key-value-storage';
import { NOTES_KEY, SCHEMA_VERSION } from '../storage/notes-repository';
import { NotesStore } from './notes-store';

describe('NotesStore', () => {
  let storage: MemoryStorage;
  let store: NotesStore;

  function setup(): void {
    TestBed.configureTestingModule({ providers: [{ provide: KEY_VALUE_STORAGE, useValue: storage }] });
    store = TestBed.inject(NotesStore);
  }

  function stored() {
    return JSON.parse(storage.getItem(NOTES_KEY)!) as { version: number; notes: { id: string; body: string }[] };
  }

  beforeEach(() => {
    storage = new MemoryStorage();
    // start from an empty notebook instead of the demo notes
    storage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION, notes: [] }));
  });

  it('seeds the demo notes on first run and saves them with the schema version', () => {
    storage = new MemoryStorage();
    setup();
    expect(store.activeNotes().length).toBeGreaterThanOrEqual(8);
    expect(store.trashedNotes().length).toBe(1);
    expect(stored().version).toBe(SCHEMA_VERSION);
    expect(stored().notes.length).toBe(store.notes().length);
  });

  it('backs up unreadable data and starts again with the demo notes', () => {
    storage = new MemoryStorage();
    storage.setItem(NOTES_KEY, '{not json');
    setup();
    expect(storage.getItem(`${NOTES_KEY}:backup`)).toBe('{not json');
    expect(store.notes().length).toBeGreaterThan(0);
  });

  it('creates notes and persists them', () => {
    setup();
    const note = store.create({ body: '# Hello', tags: ['Work Stuff', 'work stuff'] });
    expect(store.notes()[0]).toEqual(note);
    expect(note.tags).toEqual(['work-stuff']);
    expect(stored().notes[0].id).toBe(note.id);
  });

  it('updates the body and touches updatedAt only when something changed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    setup();
    const note = store.create({ body: 'first' });

    vi.setSystemTime(new Date('2026-01-01T11:00:00Z'));
    store.update(note.id, { body: 'first' });
    expect(store.byId(note.id)!.updatedAt).toBe(note.updatedAt);

    store.update(note.id, { body: 'second' });
    const updated = store.byId(note.id)!;
    expect(updated.body).toBe('second');
    expect(updated.updatedAt).toBe(Date.parse('2026-01-01T11:00:00Z'));
    expect(updated.createdAt).toBe(note.createdAt);
    expect(stored().notes[0].body).toBe('second');
    vi.useRealTimers();
  });

  it('pins notes into their own section on top', () => {
    setup();
    const a = store.create({ body: 'a' });
    const b = store.create({ body: 'b' });
    store.togglePin(a.id);
    expect(store.sections().pinned.map((n) => n.id)).toEqual([a.id]);
    expect(store.sections().others.map((n) => n.id)).toEqual([b.id]);
    expect(store.orderedResults()[0].id).toBe(a.id);
    store.togglePin(a.id);
    expect(store.sections().pinned).toEqual([]);
  });

  it('moves notes to the trash, restores and deletes them for good', () => {
    setup();
    const note = store.create({ body: 'bye' });
    store.trash(note.id);
    expect(store.activeNotes()).toEqual([]);
    expect(store.counts().trash).toBe(1);

    store.selectView('trash');
    expect(store.results().map((n) => n.id)).toEqual([note.id]);

    store.restore(note.id);
    expect(store.byId(note.id)!.deletedAt).toBeNull();
    expect(store.counts().all).toBe(1);

    store.trash(note.id);
    store.deleteForever(note.id);
    expect(store.byId(note.id)).toBeUndefined();
    expect(stored().notes).toEqual([]);
  });

  it('empties the trash without touching other notes', () => {
    setup();
    const keep = store.create({ body: 'keep' });
    const drop = store.create({ body: 'drop' });
    store.trash(drop.id);
    expect(store.emptyTrash()).toBe(1);
    expect(store.notes().map((n) => n.id)).toEqual([keep.id]);
  });

  it('renames a tag on every note and merges into an existing tag', () => {
    setup();
    const a = store.create({ body: 'a', tags: ['todo', 'work'] });
    const b = store.create({ body: 'b', tags: ['todo'] });
    const c = store.create({ body: 'c', tags: ['tasks', 'todo'] });
    store.selectTag('todo');

    expect(store.renameTag('todo', 'Tasks')).toBe('tasks');
    expect(store.byId(a.id)!.tags).toEqual(['tasks', 'work']);
    expect(store.byId(b.id)!.tags).toEqual(['tasks']);
    expect(store.byId(c.id)!.tags).toEqual(['tasks']);
    expect(store.tag()).toBe('tasks');
    expect(store.tags()).toEqual([
      { name: 'tasks', count: 3 },
      { name: 'work', count: 1 },
    ]);
  });

  it('deletes a tag and clears it as a filter', () => {
    setup();
    const a = store.create({ body: 'a', tags: ['old', 'keep'] });
    store.selectTag('old');
    store.deleteTag('old');
    expect(store.byId(a.id)!.tags).toEqual(['keep']);
    expect(store.tag()).toBeNull();
  });

  it('filters by tag and view and searches after a short debounce', () => {
    vi.useFakeTimers();
    setup();
    store.create({ body: '# Groceries\n\nmilk and eggs', tags: ['home'] });
    store.create({ body: '# Standup\n\nreview the PR', tags: ['work'] });
    store.create({ body: 'no tags here' });

    store.selectTag('work');
    expect(store.results().length).toBe(1);
    store.selectView('untagged');
    expect(store.results().map((n) => n.body)).toEqual(['no tags here']);

    store.selectView('all');
    store.setQuery('EGGS');
    expect(store.results().length).toBe(3);
    vi.advanceTimersByTime(250);
    expect(store.results().map((n) => n.body)).toEqual(['# Groceries\n\nmilk and eggs']);
    expect(store.terms()).toEqual(['eggs']);

    store.clearQuery();
    expect(store.results().length).toBe(3);
    vi.useRealTimers();
  });

  it('reports a failed save when storage is full', () => {
    setup();
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const note = store.create({ body: 'x' });
    expect(store.persisted()).toBe(false);
    expect(store.update(note.id, { body: 'y' })).toBe(false);
  });
});
