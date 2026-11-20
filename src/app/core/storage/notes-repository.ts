import { Injectable, inject } from '@angular/core';
import { Note } from '../models/note';
import { normalizeTags } from '../utils/tags';
import { KEY_VALUE_STORAGE } from './key-value-storage';

export const NOTES_KEY = 'markdown-notes:data';
export const SCHEMA_VERSION = 1;

interface StoredNotes {
  version: number;
  notes: Note[];
}

/** Turns whatever is in storage into valid notes, or null if it can't be read. */
export function readStoredNotes(raw: string): Note[] | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { version, notes } = data as Partial<StoredNotes>;
  if (version !== SCHEMA_VERSION || !Array.isArray(notes)) return null;
  return notes.filter(isNoteLike).map(normalizeNote);
}

function isNoteLike(value: unknown): value is Note {
  const n = value as Note;
  return !!n && typeof n.id === 'string' && typeof n.body === 'string';
}

function normalizeNote(n: Note): Note {
  const now = Date.now();
  return {
    id: n.id,
    body: n.body,
    tags: Array.isArray(n.tags) ? normalizeTags(n.tags) : [],
    pinned: !!n.pinned,
    createdAt: Number(n.createdAt) || now,
    updatedAt: Number(n.updatedAt) || Number(n.createdAt) || now,
    deletedAt: n.deletedAt ? Number(n.deletedAt) : null,
  };
}

@Injectable({ providedIn: 'root' })
export class NotesRepository {
  private readonly storage = inject(KEY_VALUE_STORAGE);

  /** null means there is nothing usable stored yet (first run) */
  load(): Note[] | null {
    const raw = this.storage.getItem(NOTES_KEY);
    if (raw === null) return null;
    const notes = readStoredNotes(raw);
    if (notes === null) {
      // keep unreadable data around instead of silently overwriting it
      this.storage.setItem(`${NOTES_KEY}:backup`, raw);
    }
    return notes;
  }

  save(notes: Note[]): boolean {
    const data: StoredNotes = { version: SCHEMA_VERSION, notes };
    try {
      this.storage.setItem(NOTES_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}
