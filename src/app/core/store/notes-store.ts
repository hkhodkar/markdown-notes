import { Injectable, computed, inject, signal } from '@angular/core';
import { createSeedNotes } from '../data/seed-notes';
import { Note, NoteFilter, NoteView } from '../models/note';
import { Preferences } from '../services/preferences';
import { NOTES_KEY, NotesRepository } from '../storage/notes-repository';
import { createId } from '../utils/id';
import { filterNotes, parseQuery, sortNotes } from '../utils/note-query';
import { countTags, normalizeTag, normalizeTags } from '../utils/tags';

export interface NewNote {
  body?: string;
  tags?: string[];
  pinned?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotesStore {
  private readonly repo = inject(NotesRepository);
  private readonly prefs = inject(Preferences);

  private readonly _notes = signal<Note[]>([]);
  readonly notes = this._notes.asReadonly();

  // list filters
  readonly view = signal<NoteView>('all');
  readonly tag = signal<string | null>(null);
  /** what is typed in the search box; filtering follows it with a short debounce */
  readonly query = signal('');
  private readonly appliedQuery = signal('');
  private queryTimer?: ReturnType<typeof setTimeout>;
  readonly sort = this.prefs.sort;

  /** id of the note open in the editor */
  readonly selectedId = signal<string | null>(null);
  /** false when the last write to storage failed (quota exceeded) */
  readonly persisted = signal(true);

  readonly activeNotes = computed(() => this._notes().filter((n) => n.deletedAt === null));
  readonly trashedNotes = computed(() => this._notes().filter((n) => n.deletedAt !== null));
  readonly tags = computed(() => countTags(this.activeNotes()));
  readonly tagNames = computed(() => this.tags().map((t) => t.name));

  readonly counts = computed(() => {
    const active = this.activeNotes();
    return {
      all: active.length,
      pinned: active.filter((n) => n.pinned).length,
      untagged: active.filter((n) => !n.tags.length).length,
      trash: this.trashedNotes().length,
    };
  });

  readonly filter = computed<NoteFilter>(() => ({ view: this.view(), tag: this.tag(), query: this.appliedQuery() }));
  readonly terms = computed(() => parseQuery(this.appliedQuery()));
  readonly searching = computed(() => this.terms().length > 0);
  readonly results = computed(() => sortNotes(filterNotes(this._notes(), this.filter()), this.sort()));

  /** pinned notes get their own section on top, except in views where it makes no sense */
  readonly sections = computed(() => {
    const results = this.results();
    if (this.view() === 'trash' || this.view() === 'pinned') return { pinned: [], others: results };
    return { pinned: results.filter((n) => n.pinned), others: results.filter((n) => !n.pinned) };
  });

  /** notes in the order they are shown in the list */
  readonly orderedResults = computed(() => {
    const { pinned, others } = this.sections();
    return [...pinned, ...others];
  });

  constructor() {
    this.load();
    // keep several open tabs in sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === NOTES_KEY) this.load();
      });
    }
  }

  load(): void {
    const stored = this.repo.load();
    if (stored) {
      this._notes.set(stored);
    } else {
      this.commit(createSeedNotes());
    }
  }

  byId(id: string | null): Note | undefined {
    return id ? this._notes().find((n) => n.id === id) : undefined;
  }

  selectView(view: NoteView): void {
    this.view.set(view);
    this.tag.set(null);
  }

  selectTag(tag: string): void {
    this.view.set('all');
    this.tag.set(tag);
  }

  setQuery(query: string, debounceMs = 200): void {
    this.query.set(query);
    clearTimeout(this.queryTimer);
    if (!query.trim() || debounceMs <= 0) this.appliedQuery.set(query);
    else this.queryTimer = setTimeout(() => this.appliedQuery.set(query), debounceMs);
  }

  clearQuery(): void {
    this.setQuery('', 0);
  }

  create(input: NewNote = {}): Note {
    const now = Date.now();
    const note: Note = {
      id: createId(),
      body: input.body ?? '',
      tags: normalizeTags(input.tags ?? []),
      pinned: !!input.pinned,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.commit([note, ...this._notes()]);
    return note;
  }

  /** Adds several notes at once (import). Returns the created notes. */
  addMany(inputs: NewNote[]): Note[] {
    const now = Date.now();
    const created = inputs.map<Note>((input, i) => ({
      id: createId(),
      body: input.body ?? '',
      tags: normalizeTags(input.tags ?? []),
      pinned: false,
      // keep the import order when sorting by date
      createdAt: now - i,
      updatedAt: now - i,
      deletedAt: null,
    }));
    this.commit([...created, ...this._notes()]);
    return created;
  }

  update(id: string, patch: Partial<Pick<Note, 'body' | 'tags'>>): boolean {
    const note = this.byId(id);
    if (!note) return false;
    const next: Note = { ...note };
    if (patch.body !== undefined) next.body = patch.body;
    if (patch.tags !== undefined) next.tags = normalizeTags(patch.tags);
    if (next.body === note.body && sameTags(next.tags, note.tags)) return this.persisted();
    next.updatedAt = Date.now();
    return this.replace(next);
  }

  togglePin(id: string): void {
    const note = this.byId(id);
    if (note) this.replace({ ...note, pinned: !note.pinned });
  }

  trash(id: string): void {
    const note = this.byId(id);
    if (note && note.deletedAt === null) this.replace({ ...note, deletedAt: Date.now() });
  }

  restore(id: string): void {
    const note = this.byId(id);
    if (note && note.deletedAt !== null) this.replace({ ...note, deletedAt: null });
  }

  deleteForever(id: string): void {
    this.commit(this._notes().filter((n) => n.id !== id));
  }

  emptyTrash(): number {
    const count = this.trashedNotes().length;
    this.commit(this._notes().filter((n) => n.deletedAt === null));
    return count;
  }

  /** Renames a tag on every note; renaming onto an existing tag merges them. */
  renameTag(from: string, to: string): string | null {
    const target = normalizeTag(to);
    if (!target || target === from) return target || null;
    this.commit(
      this._notes().map((n) =>
        n.tags.includes(from) ? { ...n, tags: normalizeTags(n.tags.map((t) => (t === from ? target : t))) } : n,
      ),
    );
    if (this.tag() === from) this.tag.set(target);
    return target;
  }

  deleteTag(tag: string): void {
    this.commit(this._notes().map((n) => (n.tags.includes(tag) ? { ...n, tags: n.tags.filter((t) => t !== tag) } : n)));
    if (this.tag() === tag) this.tag.set(null);
  }

  resetToDemo(): void {
    this.selectView('all');
    this.clearQuery();
    this.commit(createSeedNotes());
  }

  private replace(note: Note): boolean {
    return this.commit(this._notes().map((n) => (n.id === note.id ? note : n)));
  }

  private commit(notes: Note[]): boolean {
    this._notes.set(notes);
    const ok = this.repo.save(notes);
    this.persisted.set(ok);
    return ok;
  }
}

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}
