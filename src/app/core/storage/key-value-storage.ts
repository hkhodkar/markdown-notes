import { InjectionToken } from '@angular/core';

/** The subset of the Web Storage API the app relies on, so tests and private mode can swap it. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function browserStorage(): KeyValueStorage {
  try {
    const probe = '__mdn_probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    // storage disabled (privacy settings, sandboxed iframe): keep notes for this session only
    return new MemoryStorage();
  }
}

export const KEY_VALUE_STORAGE = new InjectionToken<KeyValueStorage>('KEY_VALUE_STORAGE', {
  providedIn: 'root',
  factory: browserStorage,
});
