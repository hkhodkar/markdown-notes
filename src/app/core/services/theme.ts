import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Preferences, Theme } from './preferences';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly prefs = inject(Preferences);
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly theme = computed<Theme>(() => this.prefs.theme() ?? (this.systemDark() ? 'dark' : 'light'));

  constructor() {
    this.media?.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.theme();
    });
  }

  toggle(): void {
    this.prefs.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
