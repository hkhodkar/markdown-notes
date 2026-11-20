import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Breakpoints {
  private readonly window = inject(DOCUMENT).defaultView;

  /** phones: list and editor are shown one at a time */
  readonly mobile = this.watch('(max-width: 767px)');
  /** tablets and small laptops: the sidebar becomes a drawer */
  readonly compact = this.watch('(max-width: 1099px)');

  private watch(query: string) {
    const media = this.window?.matchMedia?.(query);
    const value = signal(media?.matches ?? false);
    media?.addEventListener('change', (e) => value.set(e.matches));
    return value.asReadonly();
  }
}
