import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'notes' },
  {
    path: 'notes',
    loadComponent: () => import('./features/notes/notes-page').then((m) => m.NotesPage),
    children: [
      { path: '', loadComponent: () => import('./features/editor/editor-empty').then((m) => m.EditorEmpty) },
      { path: ':id', loadComponent: () => import('./features/editor/note-editor').then((m) => m.NoteEditor) },
    ],
  },
  { path: '**', redirectTo: 'notes' },
];
