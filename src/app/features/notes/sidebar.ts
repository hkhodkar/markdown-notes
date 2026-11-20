import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NoteView } from '../../core/models/note';
import { NoteTransfer } from '../../core/services/note-transfer';
import { ThemeService } from '../../core/services/theme';
import { NotesStore } from '../../core/store/notes-store';
import { ClickOutside } from '../../shared/directives/click-outside';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { Icon } from '../../shared/ui/icon';
import { ToastService } from '../../shared/ui/toast.service';
import { RenameTagDialog } from './rename-tag-dialog';

interface ViewItem {
  view: NoteView;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [Icon, ClickOutside, RenameTagDialog],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  protected readonly store = inject(NotesStore);
  protected readonly theme = inject(ThemeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly transfer = inject(NoteTransfer);

  readonly drawer = input(false);
  readonly navigated = output<void>();
  readonly newNote = output<void>();
  readonly closeDrawer = output<void>();
  readonly showShortcuts = output<void>();
  readonly importFiles = output<File[]>();

  protected readonly views: ViewItem[] = [
    { view: 'all', label: 'All notes', icon: 'inbox' },
    { view: 'pinned', label: 'Pinned', icon: 'pin' },
    { view: 'untagged', label: 'Untagged', icon: 'untagged' },
    { view: 'trash', label: 'Trash', icon: 'trash' },
  ];

  protected readonly tagMenu = signal<string | null>(null);
  protected readonly renaming = signal<string | null>(null);
  protected readonly exportMenu = signal(false);

  protected selectView(view: NoteView): void {
    this.store.selectView(view);
    this.navigated.emit();
  }

  protected selectTag(tag: string): void {
    this.store.selectTag(tag);
    this.navigated.emit();
  }

  protected onFilesPicked(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) this.importFiles.emit(files);
  }

  protected toggleExportMenu(): void {
    this.exportMenu.update((open) => !open);
  }

  protected closeExportMenu(): void {
    this.exportMenu.set(false);
  }

  protected exportZip(): void {
    this.exportMenu.set(false);
    this.transfer.exportZip();
  }

  protected exportCombined(): void {
    this.exportMenu.set(false);
    this.transfer.exportCombined();
  }

  protected async resetDemo(): Promise<void> {
    this.exportMenu.set(false);
    const ok = await this.confirm.ask({
      title: 'Reset demo notes?',
      message: 'All current notes, including the trash, will be replaced by the demo notes. Export your notes first if you want to keep them.',
      confirmLabel: 'Reset notes',
      danger: true,
    });
    if (ok) {
      this.store.resetToDemo();
      this.navigated.emit();
      this.toasts.show('Demo notes restored');
    }
  }

  protected toggleTagMenu(tag: string): void {
    this.tagMenu.update((current) => (current === tag ? null : tag));
  }

  protected closeTagMenu(tag: string): void {
    if (this.tagMenu() === tag) this.tagMenu.set(null);
  }

  protected startRename(tag: string): void {
    this.tagMenu.set(null);
    this.renaming.set(tag);
  }

  protected finishRename(from: string, to: string): void {
    this.renaming.set(null);
    const merged = this.store.tagNames().includes(to);
    const result = this.store.renameTag(from, to);
    if (result && result !== from) {
      this.toasts.show(merged ? `Merged #${from} into #${result}` : `Renamed #${from} to #${result}`);
    }
  }

  protected async deleteTag(tag: string): Promise<void> {
    this.tagMenu.set(null);
    const count = this.store.tags().find((t) => t.name === tag)?.count ?? 0;
    const ok = await this.confirm.ask({
      title: `Delete #${tag}?`,
      message: `The tag will be removed from ${count} ${count === 1 ? 'note' : 'notes'}. The notes themselves are kept.`,
      confirmLabel: 'Delete tag',
      danger: true,
    });
    if (ok) {
      this.store.deleteTag(tag);
      this.toasts.show(`Deleted tag #${tag}`);
    }
  }
}
