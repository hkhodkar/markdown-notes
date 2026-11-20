import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';
import { Modal } from './modal';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal],
  template: `
    @if (confirm.pending(); as dialog) {
      <app-modal [heading]="dialog.title" size="small" (closed)="confirm.answer(false)">
        <p class="message">{{ dialog.message }}</p>
        <div modal-footer class="modal-footer">
          <button type="button" class="btn" (click)="confirm.answer(false)">Cancel</button>
          <button type="button" class="btn" [class.btn-danger]="dialog.danger" [class.btn-primary]="!dialog.danger" (click)="confirm.answer(true)">
            {{ dialog.confirmLabel ?? 'Confirm' }}
          </button>
        </div>
      </app-modal>
    }
  `,
  styles: `
    .message {
      margin: 0;
      line-height: 1.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
}
