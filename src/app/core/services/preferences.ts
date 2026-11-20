import { Injectable, effect, inject, signal } from '@angular/core';
import { EditorMode, SortKey } from '../models/note';
import { KEY_VALUE_STORAGE } from '../storage/key-value-storage';

export const PREFS_KEY = 'markdown-notes:prefs';

export type Theme = 'light' | 'dark';

interface Prefs {
  sort: SortKey;
  editorMode: EditorMode;
  theme: Theme | null;
}

@Injectable({ providedIn: 'root' })
export class Preferences {
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly initial = this.read();

  readonly sort = signal<SortKey>(this.initial.sort);
  readonly editorMode = signal<EditorMode>(this.initial.editorMode);
  /** null = follow the system setting */
  readonly theme = signal<Theme | null>(this.initial.theme);

  constructor() {
    effect(() => {
      const prefs: Prefs = { sort: this.sort(), editorMode: this.editorMode(), theme: this.theme() };
      try {
        this.storage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        // preferences are a nice-to-have, ignore quota errors
      }
    });
  }

  private read(): Prefs {
    const defaults: Prefs = { sort: 'updated', editorMode: 'split', theme: null };
    try {
      const stored = JSON.parse(this.storage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
      return {
        sort: ['updated', 'created', 'title'].includes(stored.sort as string) ? stored.sort! : defaults.sort,
        editorMode: ['edit', 'split', 'preview'].includes(stored.editorMode as string)
          ? stored.editorMode!
          : defaults.editorMode,
        theme: stored.theme === 'light' || stored.theme === 'dark' ? stored.theme : null,
      };
    } catch {
      return defaults;
    }
  }
}
