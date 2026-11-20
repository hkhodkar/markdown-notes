import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotesStore } from '../../core/store/notes-store';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-editor-empty',
  imports: [Icon],
  template: `
    <div class="empty">
      <app-icon name="notes" />
      <h2>{{ store.counts().all ? 'Select a note' : 'Your notebook is empty' }}</h2>
      <p>Pick a note from the list or start a new one with <kbd>Alt</kbd> <kbd>N</kbd>.</p>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      flex: 1;
      place-items: center;
      padding: 32px;
    }
    .empty {
      max-width: 320px;
      text-align: center;
      color: var(--muted);
    }
    app-icon {
      width: 40px;
      height: 40px;
      opacity: 0.6;
    }
    h2 {
      margin: 12px 0 6px;
      font-size: 17px;
      font-weight: 600;
      color: var(--text);
    }
    p {
      margin: 0;
      line-height: 1.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorEmpty {
  protected readonly store = inject(NotesStore);
}
