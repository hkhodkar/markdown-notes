export interface Note {
  id: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** set when the note is in the trash */
  deletedAt: number | null;
}

export type NoteView = 'all' | 'pinned' | 'untagged' | 'trash';

export type SortKey = 'updated' | 'created' | 'title';

export interface NoteFilter {
  view: NoteView;
  tag: string | null;
  query: string;
}

export interface TagCount {
  name: string;
  count: number;
}

export type EditorMode = 'edit' | 'split' | 'preview';
