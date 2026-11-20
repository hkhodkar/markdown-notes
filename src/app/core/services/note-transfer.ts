import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Note } from '../models/note';
import { NotesStore } from '../store/notes-store';
import { datedFilename, sanitizeFilename, uniqueFilename } from '../utils/filename';
import { parseFrontMatter, withFrontMatter } from '../utils/front-matter';
import { noteMeta } from '../utils/note-text';
import { ToastService } from '../../shared/ui/toast.service';

const MAX_IMPORT_SIZE = 2 * 1024 * 1024;
const MARKDOWN_FILE = /\.(md|markdown|mdown|txt)$/i;

export function noteFilename(note: Note): string {
  return `${sanitizeFilename(noteMeta(note).title, 'untitled-note')}.md`;
}

/** Import and export of notes as markdown files. */
@Injectable({ providedIn: 'root' })
export class NoteTransfer {
  private readonly store = inject(NotesStore);
  private readonly toasts = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  exportNote(note: Note): void {
    this.download(noteFilename(note), new Blob([withFrontMatter(note.body, note.tags)], { type: 'text/markdown' }));
  }

  async exportZip(): Promise<void> {
    const notes = this.exportable();
    if (!notes.length) return this.toasts.show('There are no notes to export');
    // fflate is only needed here, so it is loaded on demand
    const { zipSync, strToU8 } = await import('fflate');
    const used = new Set<string>();
    const files: Record<string, [Uint8Array, { mtime: Date }]> = {};
    for (const note of notes) {
      const name = uniqueFilename(noteFilename(note), used);
      files[name] = [strToU8(withFrontMatter(note.body, note.tags)), { mtime: new Date(note.updatedAt) }];
    }
    const zip = zipSync(files, { level: 6 });
    this.download(datedFilename('markdown-notes', 'zip'), new Blob([zip as BlobPart], { type: 'application/zip' }));
    this.toasts.show(`Exported ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`);
  }

  exportCombined(): void {
    const notes = this.exportable();
    if (!notes.length) return this.toasts.show('There are no notes to export');
    const parts = notes.map((note) => {
      const tags = note.tags.length ? `\n\n_Tags: ${note.tags.map((t) => `#${t}`).join(' ')}_` : '';
      return note.body.trim() + tags;
    });
    const content = parts.join('\n\n---\n\n') + '\n';
    this.download(datedFilename('markdown-notes', 'md'), new Blob([content], { type: 'text/markdown' }));
    this.toasts.show(`Exported ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`);
  }

  /** Reads markdown files and adds them as notes. Returns the created notes. */
  async importFiles(files: File[]): Promise<Note[]> {
    const accepted = files.filter((f) => MARKDOWN_FILE.test(f.name) || f.type === 'text/markdown');
    const skipped = files.length - accepted.length;
    const inputs: { body: string; tags: string[] }[] = [];
    for (const file of accepted) {
      if (file.size > MAX_IMPORT_SIZE) continue;
      const parsed = parseFrontMatter(await file.text());
      if (!parsed.body.trim()) continue;
      // keep the file name as title when the file has no heading
      const body = /^\s*#{1,6}\s/m.test(parsed.body) ? parsed.body : `# ${file.name.replace(MARKDOWN_FILE, '')}\n\n${parsed.body}`;
      inputs.push({ body, tags: parsed.tags });
    }

    if (!inputs.length) {
      this.toasts.error(skipped ? 'Only .md, .markdown and .txt files can be imported' : 'No notes found in the selected files');
      return [];
    }
    const created = this.store.addMany(inputs);
    const note = created.length === 1 ? '1 note' : `${created.length} notes`;
    this.toasts.show(skipped ? `Imported ${note}, skipped ${skipped} other files` : `Imported ${note}`);
    return created;
  }

  private exportable(): Note[] {
    return [...this.store.activeNotes()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private download(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = filename;
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
