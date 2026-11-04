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

// Pre-seed sample folders & clean formal Word-style document
export async function seedInitialDataIfNeeded() {
  const folderCount = await db.folders.count();
  if (folderCount > 0) return;

  const now = Date.now();
  const sampleFolderId1 = 'folder-universita';
  const sampleFolderId2 = 'folder-lavoro';

  const defaultFolders: Folder[] = [
    {
      id: sampleFolderId1,
      name: 'Università & Corsi',
      parentId: null,
      color: '#4f46e5', // Refined Indigo
      createdAt: now - 3600000,
      updatedAt: now - 3600000
    },
    {
      id: sampleFolderId2,
      name: 'Documenti di Lavoro',
      parentId: null,
      color: '#0284c7', // Sky Blue
      createdAt: now - 7200000,
      updatedAt: now - 7200000
    }
  ];

  await db.folders.bulkAdd(defaultFolders);

  // Welcome document: Blank Word-style document with free layout
  const welcomeNotebookId = 'doc-welcome';
  const welcomeNotebook: Notebook = {
    id: welcomeNotebookId,
    title: 'Documento di Esempio',
    folderId: sampleFolderId2,
    createdAt: now,
    updatedAt: now,
    paperTemplate: 'blank', // BLANK di default come Word
    coverColor: '#1e293b',
    isFavorite: true,
    tags: ['ufficiale', 'word', 'ipad'],
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        backgroundType: 'template',
        width: 820,
        height: 1160,
        strokes: [],
        images: [],
        contentHtml: `
          <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 16px; color: #0f172a;">Documento Ufficiale & Appunti</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 14px; color: #334155;">
            Questo foglio è <b>completamente bianco come un foglio Word</b> di default. Puoi iniziare a digitare direttamente con la tastiera Bluetooth toccando in qualsiasi punto della pagina.
          </p>
          <h2 style="font-size: 20px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; color: #1e293b;">Funzionalità di Formattazione & Impaginazione Libera:</h2>
          <ul style="font-size: 15px; line-height: 1.8; margin-bottom: 18px; color: #334155; padding-left: 20px;">
            <li><b>Stile Word completo:</b> Regola la dimensione del carattere in <i>px</i>, applica <b>grassetto</b>, <i>corsivo</i>, <u>sottolineato</u>, allineamento e colori.</li>
            <li><b>Impaginazione libera delle immagini:</b> Inserisci foto e grafici e posizionali liberamente dove preferisci, senza i vincoli rigidi di Word.</li>
            <li><b>Inchiostro Apple Pencil:</b> Seleziona la matita dalla barra per scrivere note a mano, sottolineare ed evidenziare sopra il testo.</li>
            <li><b>Annulla con 2 Dita:</b> Tocca lo schermo con due dita contemporaneamente per tornare indietro (Undo istantaneo).</li>
          </ul>
          <p style="font-size: 15px; line-height: 1.6; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            <i>Scrivi qui sotto con la tua tastiera Bluetooth o disegna liberamente con l'Apple Pencil.</i>
          </p>
        `
      }
    ]
  };

  await db.notebooks.add(welcomeNotebook);
}
