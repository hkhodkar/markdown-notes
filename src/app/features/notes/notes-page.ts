import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Breakpoints } from '../../core/services/breakpoints';
import { NotesStore } from '../../core/store/notes-store';
import { NoteList } from './note-list';
import { ShortcutsDialog } from './shortcuts-dialog';
import { Sidebar } from './sidebar';

function isTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

@Component({
  selector: 'app-notes-page',
  imports: [RouterOutlet, Sidebar, NoteList, ShortcutsDialog],
  templateUrl: './notes-page.html',
  styleUrl: './notes-page.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPage {
  private readonly store = inject(NotesStore);
  private readonly router = inject(Router);
  protected readonly breakpoints = inject(Breakpoints);
  private readonly list = viewChild.required(NoteList);

  protected readonly drawerOpen = signal(false);
  protected readonly showShortcuts = signal(false);
  protected readonly hasNote = computed(() => this.store.selectedId() !== null);

  constructor() {
    // on wide screens start with the first note open instead of an empty editor
    afterNextRender(() => {
      if (this.breakpoints.mobile() || this.router.url.split(/[?#]/)[0] !== '/notes') return;
      const first = this.store.orderedResults()[0];
      if (first) this.router.navigate(['/notes', first.id], { replaceUrl: true });
    });
  }

  protected newNote(): void {
    if (this.store.view() === 'trash') this.store.selectView('all');
    this.store.clearQuery();
    const tag = this.store.tag();
    const note = this.store.create({ tags: tag ? [tag] : [], pinned: this.store.view() === 'pinned' });
    this.drawerOpen.set(false);
    this.router.navigate(['/notes', note.id], { state: { focus: true } });
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  private async focusSearch(): Promise<void> {
    if (this.breakpoints.mobile() && this.hasNote()) {
      // the list is hidden behind the editor on phones
      await this.router.navigate(['/notes']);
      setTimeout(() => this.list().focusSearch());
    } else {
      this.list().focusSearch();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const typing = isTextField(event.target);
    const mod = event.ctrlKey || event.metaKey;
    if (event.altKey && !mod && event.code === 'KeyN') {
      event.preventDefault();
      this.newNote();
    } else if ((!typing && event.key === '/' && !mod) || (mod && event.shiftKey && event.code === 'KeyF')) {
      event.preventDefault();
      this.focusSearch();
    } else if (!typing && event.key === '?') {
      event.preventDefault();
      this.showShortcuts.set(true);
    } else if (event.key === 'Escape' && this.drawerOpen()) {
      this.drawerOpen.set(false);
    }
  }
}
