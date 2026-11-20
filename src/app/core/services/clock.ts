import { Injectable, signal } from '@angular/core';

/** A "now" that ticks every 30 seconds so relative times like "5 min ago" stay fresh. */
@Injectable({ providedIn: 'root' })
export class Clock {
  readonly now = signal(Date.now());

  constructor() {
    setInterval(() => this.now.set(Date.now()), 30_000);
  }
}
