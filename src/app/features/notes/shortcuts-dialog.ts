import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Modal } from '../../shared/ui/modal';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

@Component({
  selector: 'app-shortcuts-dialog',
  imports: [Modal],
  template: `
    <app-modal heading="Keyboard shortcuts" (closed)="closed.emit()">
      @for (group of groups; track group.title) {
        <h3>{{ group.title }}</h3>
        <dl>
          @for (item of group.items; track item.label) {
            <div class="row">
              <dt>{{ item.label }}</dt>
              <dd>
                @for (key of item.keys; track $index) {
                  <kbd>{{ key }}</kbd>
                }
              </dd>
            </div>
          }
        </dl>
      }
      <div modal-footer class="modal-footer">
        <button type="button" class="btn btn-primary" (click)="closed.emit()">Got it</button>
      </div>
    </app-modal>
  `,
  styles: `
    h3 {
      margin: 8px 0 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
    }
    h3:not(:first-child) {
      margin-top: 20px;
    }
    dl {
      margin: 0;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 7px 0;
      border-bottom: 1px solid var(--border);
    }
    dt {
      color: var(--text);
    }
    dd {
      display: flex;
      gap: 4px;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortcutsDialog {
  readonly closed = output<void>();

  protected readonly groups = [
    {
      title: 'General',
      items: [
        { label: 'New note', keys: ['Alt', 'N'] },
        { label: 'Search notes', keys: ['/'] },
        { label: 'Show shortcuts', keys: ['?'] },
      ],
    },
    {
      title: 'Editor',
      items: [
        { label: 'Bold', keys: [MOD, 'B'] },
        { label: 'Italic', keys: [MOD, 'I'] },
        { label: 'Insert link', keys: [MOD, 'K'] },
        { label: 'Save now', keys: [MOD, 'S'] },
        { label: 'Indent / outdent', keys: ['Tab', '⇧ Tab'] },
        { label: 'Leave the editor with Tab', keys: ['Esc', 'Tab'] },
      ],
    },
  ];
}
