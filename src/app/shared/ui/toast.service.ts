import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
  action?: { label: string; run: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, options: { action?: Toast['action']; kind?: Toast['kind']; duration?: number } = {}): void {
    const toast: Toast = { id: this.nextId++, message, kind: options.kind ?? 'info', action: options.action };
    this.toasts.update((list) => [...list.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), options.duration ?? (toast.action ? 6000 : 3500));
  }

  error(message: string): void {
    this.show(message, { kind: 'error', duration: 6000 });
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  runAction(toast: Toast): void {
    toast.action?.run();
    this.dismiss(toast.id);
  }
}
