import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, viewChild } from '@angular/core';
import { SortKey } from '../../core/models/note';
import { NotesStore } from '../../core/store/notes-store';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { Icon } from '../../shared/ui/icon';
import { ToastService } from '../../shared/ui/toast.service';
import { NoteListItem } from './note-list-item';

@Component({
  selector: 'app-note-list',
  imports: [Icon, NoteListItem],
  templateUrl: './note-list.html',
  styleUrl: './note-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteList {
  protected readonly store = inject(NotesStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');

  readonly openMenu = output<void>();
  readonly newNote = output<void>();

  protected readonly sortOptions: { value: SortKey; label: string }[] = [
    { value: 'updated', label: 'Last edited' },
    { value: 'created', label: 'Date created' },
    { value: 'title', label: 'Title (A–Z)' },
  ];

  protected readonly heading = computed(() => {
    const tag = this.store.tag();
    if (tag) return `#${tag}`;
    return { all: 'All notes', pinned: 'Pinned', untagged: 'Untagged', trash: 'Trash' }[this.store.view()];
  });

  protected readonly total = computed(() => this.store.results().length);

  focusSearch(): void {
    const input = this.searchInput().nativeElement;
    input.focus();
    input.select();
  }

  protected onSearch(value: string): void {
    this.store.setQuery(value);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.store.clearQuery();
      (event.target as HTMLInputElement).blur();
    }
  }

  protected clearSearch(): void {
    this.store.clearQuery();
    this.searchInput().nativeElement.focus();
  }

  protected setSort(value: string): void {
    this.store.sort.set(value as SortKey);
  }

  protected async emptyTrash(): Promise<void> {
    const count = this.store.counts().trash;
    const ok = await this.confirm.ask({
      title: 'Empty trash?',
      message: `${count} ${count === 1 ? 'note' : 'notes'} will be deleted permanently. This cannot be undone.`,
      confirmLabel: 'Empty trash',
      danger: true,
    });
    if (ok) {
      this.store.emptyTrash();
      this.toasts.show('Trash emptied');
    }
  }
}
