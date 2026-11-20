import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { MarkdownRenderer } from '../../core/markdown/markdown-renderer';
import { EditorMode } from '../../core/models/note';
import { Breakpoints } from '../../core/services/breakpoints';
import { Clock } from '../../core/services/clock';
import { NoteTransfer } from '../../core/services/note-transfer';
import { Preferences } from '../../core/services/preferences';
import { NotesStore } from '../../core/store/notes-store';
import { fullDate, relativeTimeInline } from '../../core/utils/date';
import { FormatAction, TextState, applyFormat, continueList, indentLines } from '../../core/utils/markdown-format';
import { textStats } from '../../core/utils/note-text';
import { toggleTask } from '../../core/utils/tasks';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { Icon } from '../../shared/ui/icon';
import { ToastService } from '../../shared/ui/toast.service';
import { TagInput } from './tag-input';

const SAVE_DELAY = 600;

interface ToolbarButton {
  action: FormatAction;
  icon: string;
  label: string;
  shortcut?: string;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl+';

@Component({
  selector: 'app-note-editor',
  imports: [RouterLink, Icon, TagInput],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
  host: {
    '(window:beforeunload)': 'flush()',
    '(document:visibilitychange)': 'flush()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteEditor {
  /** route param */
  readonly id = input.required<string>();

  protected readonly store = inject(NotesStore);
  private readonly prefs = inject(Preferences);
  private readonly renderer = inject(MarkdownRenderer);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly breakpoints = inject(Breakpoints);
  private readonly transfer = inject(NoteTransfer);
  protected readonly clock = inject(Clock);

  private readonly source = viewChild<ElementRef<HTMLTextAreaElement>>('source');
  private readonly preview = viewChild<ElementRef<HTMLElement>>('preview');

  protected readonly note = computed(() => this.store.byId(this.id()));
  protected readonly trashed = computed(() => !!this.note()?.deletedAt);
  protected readonly draft = signal('');
  protected readonly saveState = signal<'saved' | 'saving' | 'error'>('saved');

  protected readonly mode = this.prefs.editorMode;
  protected readonly effectiveMode = computed<EditorMode>(() => {
    if (this.trashed()) return 'preview';
    const mode = this.mode();
    return mode === 'split' && this.breakpoints.mobile() ? 'edit' : mode;
  });
  protected readonly modes: { value: EditorMode; label: string; icon: string }[] = [
    { value: 'edit', label: 'Edit', icon: 'pencil' },
    { value: 'split', label: 'Split', icon: 'split' },
    { value: 'preview', label: 'Preview', icon: 'eye' },
  ];

  protected readonly toolbar: ToolbarButton[][] = [
    [
      { action: 'bold', icon: 'bold', label: 'Bold', shortcut: `${MOD}B` },
      { action: 'italic', icon: 'italic', label: 'Italic', shortcut: `${MOD}I` },
      { action: 'heading', icon: 'heading', label: 'Heading' },
    ],
    [
      { action: 'link', icon: 'link', label: 'Link', shortcut: `${MOD}K` },
      { action: 'code', icon: 'code', label: 'Code' },
      { action: 'quote', icon: 'quote', label: 'Quote' },
    ],
    [
      { action: 'bullet', icon: 'list', label: 'Bulleted list' },
      { action: 'task', icon: 'tasks', label: 'Task list' },
    ],
  ];

  protected readonly html = computed(() => {
    const html = this.renderer.render(this.draft(), { interactiveTasks: !this.trashed() });
    // the markup is already sanitized by DOMPurify; Angular's sanitizer would strip the task checkboxes
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });
  protected readonly stats = computed(() => textStats(this.draft()));

  private saveTimer?: ReturnType<typeof setTimeout>;
  private pending: { id: string; body: string } | null = null;
  private tabLeavesEditor = false;
  private scrollLock: 'source' | 'preview' | null = null;

  constructor() {
    // load the note whenever the route param changes
    effect(() => {
      const id = this.id();
      untracked(() => this.open(id));
    });
    inject(DestroyRef).onDestroy(() => {
      this.flush();
      if (this.store.selectedId() === this.id()) this.store.selectedId.set(null);
    });
  }

  private open(id: string): void {
    this.flush();
    const note = this.store.byId(id);
    if (!note) {
      // unknown id, e.g. an old link
      this.router.navigate(['/notes'], { replaceUrl: true });
      return;
    }
    this.store.selectedId.set(id);
    this.draft.set(note.body);
    this.saveState.set('saved');
    this.tabLeavesEditor = false;
    // fresh notes start with the cursor in the editor
    if (!note.body && !note.deletedAt) setTimeout(() => this.source()?.nativeElement.focus());
  }

  protected setMode(mode: EditorMode): void {
    this.mode.set(mode);
  }

  protected onInput(value: string): void {
    if (value === this.draft() && this.pending?.body === value) return;
    this.draft.set(value);
    this.pending = { id: this.id(), body: value };
    this.saveState.set('saving');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY);
  }

  /** writes pending changes right away */
  flush(): void {
    clearTimeout(this.saveTimer);
    if (!this.pending) return;
    const { id, body } = this.pending;
    this.pending = null;
    const ok = this.store.update(id, { body });
    if (id === this.id()) this.saveState.set(ok ? 'saved' : 'error');
    if (!ok) this.toasts.error('Could not save: browser storage is full. Export your notes to keep them safe.');
  }

  protected setTags(tags: string[]): void {
    this.store.update(this.id(), { tags });
  }

  protected togglePin(): void {
    const note = this.note();
    if (!note) return;
    this.store.togglePin(note.id);
    this.toasts.show(note.pinned ? 'Note unpinned' : 'Note pinned');
  }

  protected exportNote(): void {
    this.flush();
    const note = this.note();
    if (note) this.transfer.exportNote(note);
  }

  // ---- formatting -------------------------------------------------------

  protected format(action: FormatAction): void {
    this.apply((state) => applyFormat(state, action));
  }

  /** Runs a text transform on the textarea; returns false when the transform didn't apply. */
  private apply(transform: (state: TextState) => TextState | null, event?: Event): boolean {
    const textarea = this.source()?.nativeElement;
    if (!textarea) return false;
    const next = transform({ value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd });
    if (!next) return false;
    event?.preventDefault();
    this.replaceText(textarea, next);
    return true;
  }

  // execCommand keeps the browser's undo history intact; fall back to setting the value
  private replaceText(textarea: HTMLTextAreaElement, next: TextState): void {
    const old = textarea.value;
    const target = next.value;
    let start = 0;
    const max = Math.min(old.length, target.length);
    while (start < max && old[start] === target[start]) start++;
    let tail = 0;
    while (tail < max - start && old[old.length - 1 - tail] === target[target.length - 1 - tail]) tail++;

    const insert = target.slice(start, target.length - tail);
    const removeEnd = old.length - tail;
    textarea.focus();
    if (insert || removeEnd > start) {
      textarea.setSelectionRange(start, removeEnd);
      let ok = false;
      try {
        ok = insert ? document.execCommand('insertText', false, insert) : document.execCommand('delete');
      } catch {
        ok = false;
      }
      if (!ok || textarea.value !== target) textarea.value = target;
    }
    textarea.setSelectionRange(next.start, next.end);
    this.onInput(textarea.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    const mod = (event.ctrlKey || event.metaKey) && !event.altKey;
    const key = event.key.toLowerCase();

    if (mod && !event.shiftKey && (key === 'b' || key === 'i' || key === 'k')) {
      event.preventDefault();
      this.format(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'link');
      return;
    }
    if (mod && key === 's') {
      event.preventDefault();
      this.flush();
      return;
    }
    if (event.key === 'Escape') {
      this.tabLeavesEditor = true;
      return;
    }
    if (event.key === 'Tab' && !mod && !event.altKey) {
      if (this.tabLeavesEditor) {
        this.tabLeavesEditor = false;
        return;
      }
      this.apply((state) => indentLines(state, event.shiftKey), event);
      return;
    }
    this.tabLeavesEditor = false;
    if (event.key === 'Enter' && !event.shiftKey && !mod && !event.altKey) {
      this.apply(continueList, event);
    }
  }

  // ---- preview ----------------------------------------------------------

  protected onPreviewClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('task-check')) return;
    if (this.trashed()) {
      event.preventDefault();
      return;
    }
    const boxes = Array.from(this.preview()!.nativeElement.querySelectorAll('input.task-check'));
    const body = toggleTask(this.draft(), boxes.indexOf(target), target.checked);
    if (body !== this.draft()) this.onInput(body);
  }

  // proportional scroll sync between the editor and the preview in split mode
  protected onSourceScroll(): void {
    this.syncScroll('source');
  }

  protected onPreviewScroll(): void {
    this.syncScroll('preview');
  }

  private syncScroll(from: 'source' | 'preview'): void {
    if (this.effectiveMode() !== 'split') return;
    if (this.scrollLock && this.scrollLock !== from) return;
    const source = this.source()?.nativeElement;
    const preview = this.preview()?.nativeElement;
    if (!source || !preview) return;
    const [a, b] = from === 'source' ? [source, preview] : [preview, source];
    const range = a.scrollHeight - a.clientHeight;
    const ratio = range > 0 ? a.scrollTop / range : 0;
    this.scrollLock = from;
    b.scrollTop = ratio * (b.scrollHeight - b.clientHeight);
    // release the lock after the scroll event of the other pane has fired
    requestAnimationFrame(() => requestAnimationFrame(() => (this.scrollLock = null)));
  }

  // ---- actions ----------------------------------------------------------

  protected moveToTrash(): void {
    const note = this.note();
    if (!note) return;
    const next = this.neighbour(note.id);
    this.flush();
    this.store.trash(note.id);
    this.toasts.show('Note moved to trash', {
      action: {
        label: 'Undo',
        run: () => {
          this.store.restore(note.id);
          this.router.navigate(['/notes', note.id]);
        },
      },
    });
    this.leaveTo(next);
  }

  protected restore(): void {
    const note = this.note();
    if (!note) return;
    this.store.restore(note.id);
    this.toasts.show('Note restored');
  }

  protected async deleteForever(): Promise<void> {
    const note = this.note();
    if (!note) return;
    const ok = await this.confirm.ask({
      title: 'Delete note forever?',
      message: 'This note will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete forever',
      danger: true,
    });
    if (!ok) return;
    const next = this.neighbour(note.id);
    this.store.deleteForever(note.id);
    this.toasts.show('Note deleted');
    this.leaveTo(next);
  }

  private neighbour(id: string): string | null {
    const list = this.store.orderedResults();
    const index = list.findIndex((n) => n.id === id);
    if (index === -1) return null;
    return (list[index + 1] ?? list[index - 1])?.id ?? null;
  }

  private leaveTo(id: string | null): void {
    if (id && !this.breakpoints.mobile()) this.router.navigate(['/notes', id]);
    else this.router.navigate(['/notes']);
  }

  protected full(time: number): string {
    return fullDate(time);
  }

  protected edited(time: number, now: number): string {
    return relativeTimeInline(time, now);
  }
}
