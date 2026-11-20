import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from './icon';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [Icon],
  template: `
    @for (toast of toasts.toasts(); track toast.id) {
      <div class="toast" [class.error]="toast.kind === 'error'" role="status">
        @if (toast.kind === 'error') {
          <app-icon name="alert" />
        }
        <span class="message">{{ toast.message }}</span>
        @if (toast.action; as action) {
          <button type="button" class="action" (click)="toasts.runAction(toast)">{{ action.label }}</button>
        }
        <button type="button" class="close" aria-label="Dismiss" (click)="toasts.dismiss(toast.id)">
          <app-icon name="x" />
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: 24px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: max-content;
      max-width: calc(100vw - 32px);
      transform: translateX(-50%);
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 6px 6px 6px 16px;
      font-size: 13.5px;
      color: #f3f4f8;
      background: #1f2430;
      border-radius: 10px;
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      animation: toast-in 0.18s ease-out;
    }
    .toast.error app-icon {
      color: #ff8a8a;
    }
    .message {
      padding: 4px 0;
    }
    .action {
      height: 32px;
      padding: 0 10px;
      font-weight: 600;
      color: #aab0ff;
      background: none;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
    }
    .action:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .close {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      color: #a3a9b8;
      background: none;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
    }
    .close:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
    .close app-icon {
      width: 16px;
      height: 16px;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toasts = inject(ToastService);
}
