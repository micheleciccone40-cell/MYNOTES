import Dexie, { type Table } from 'dexie';
import type { Folder, Notebook } from '../types';

export class PadNotesDatabase extends Dexie {
  folders!: Table<Folder, string>;
  notebooks!: Table<Notebook, string>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('PadNotesDB');
    this.version(1).stores({
      folders: 'id, parentId, updatedAt',
      notebooks: 'id, folderId, updatedAt, isFavorite',
      settings: 'key'
    });
  }
}

export const db = new PadNotesDatabase();

// Initialize clean database without default folders
export async function seedInitialDataIfNeeded() {
  try {
    // 1. Permanently remove the legacy sample folders
    await db.folders.delete('folder-universita');
    await db.folders.delete('folder-lavoro');

    // 2. Relink any notebooks that were inside those sample folders to root (folderId: null)
    const allNotebooks = await db.notebooks.toArray();
    for (const nb of allNotebooks) {
      if (nb.folderId === 'folder-universita' || nb.folderId === 'folder-lavoro') {
        await db.notebooks.put({ ...nb, folderId: null });
      }
    }

    // 3. If database is completely empty, create a clean default blank Word document
    const nbCount = await db.notebooks.count();
    if (nbCount === 0) {
      const now = Date.now();
      const welcomeNotebook: Notebook = {
        id: 'doc-welcome',
        title: 'Appunti & Documento Word',
        folderId: null,
        createdAt: now,
        updatedAt: now,
        paperTemplate: 'blank', // Foglio bianco Word di default
        coverColor: '#1e293b',
        isFavorite: false,
        tags: [],
        pages: [
          {
            id: 'page-1',
            pageNumber: 1,
            backgroundType: 'template',
            width: 820,
            height: 1160,
            strokes: [],
            images: [],
            contentHtml: '<p><br></p>'
          }
        ]
      };

      await db.notebooks.add(welcomeNotebook);
    }
  } catch (err) {
    console.warn('DB initialization check:', err);
  }
}
