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

// Pre-seed sample folders & starter notebook if empty
export async function seedInitialDataIfNeeded() {
  const folderCount = await db.folders.count();
  if (folderCount > 0) return;

  const now = Date.now();
  const sampleFolderId1 = 'folder-universita';
  const sampleFolderId2 = 'folder-lavoro';
  const sampleFolderId3 = 'folder-personale';

  const defaultFolders: Folder[] = [
    {
      id: sampleFolderId1,
      name: 'Università / Studio',
      parentId: null,
      color: '#3b82f6', // blue
      createdAt: now - 3600000,
      updatedAt: now - 3600000
    },
    {
      id: sampleFolderId2,
      name: 'Lavoro & Progetti',
      parentId: null,
      color: '#10b981', // emerald
      createdAt: now - 7200000,
      updatedAt: now - 7200000
    },
    {
      id: sampleFolderId3,
      name: 'Note Personali',
      parentId: null,
      color: '#8b5cf6', // purple
      createdAt: now - 10800000,
      updatedAt: now - 10800000
    }
  ];

  await db.folders.bulkAdd(defaultFolders);

  // Welcome notebook
  const welcomeNotebookId = 'notebook-welcome';
  const welcomeNotebook: Notebook = {
    id: welcomeNotebookId,
    title: 'Guida Rapida & Benvenuto ✨',
    folderId: sampleFolderId3,
    createdAt: now,
    updatedAt: now,
    paperTemplate: 'ruled',
    coverColor: '#6366f1',
    isFavorite: true,
    tags: ['tutorial', 'ipad', 'apple-pencil'],
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        backgroundType: 'template',
        width: 820,
        height: 1160,
        strokes: [],
        textBlocks: [
          {
            id: 'tb-1',
            x: 60,
            y: 60,
            width: 700,
            height: 60,
            text: '✨ Benvenuto su PadNotes!',
            fontSize: 32,
            color: '#1e293b',
            fontFamily: 'system-ui'
          },
          {
            id: 'tb-2',
            x: 60,
            y: 130,
            width: 700,
            height: 140,
            text: 'Questa web app è progettata per offrirti l\'esperienza di GoodNotes e Notability direttamente dal browser del tuo iPad, con sincronizzazione e consultazione da PC e iPhone.\n\nPuoi scrivere con la tastiera Bluetooth, disegnare a mano libera con la tua Apple Pencil, o annotare direttamente su PDF e documenti.',
            fontSize: 18,
            color: '#334155',
            fontFamily: 'system-ui'
          },
          {
            id: 'tb-3',
            x: 60,
            y: 290,
            width: 700,
            height: 140,
            text: '✏️ Come usare la Apple Pencil:\n• Tratti fluidi e sensibili alla pressione\n• Evidenziatore con sovrapposizione naturale\n• Modalità "Solo Apple Pencil" (Palm Rejection) per appoggiare la mano sullo schermo senza creare sbavature accidentali!\n• Gomma per cancellare tratti interi o singoli dettagli',
            fontSize: 16,
            color: '#0f766e',
            fontFamily: 'system-ui'
          },
          {
            id: 'tb-4',
            x: 60,
            y: 450,
            width: 700,
            height: 140,
            text: '📂 Organizzazione e Documenti:\n• Crea cartelle colorate per organizzare i tuoi corsi o progetti\n• Importa PDF, file Word (.docx) e Apple Pages (.pages): verranno convertiti in pagine su cui scrivere direttamente\n• Esporta le note finali con le tue annotazioni in formato PDF con 1 clic!',
            fontSize: 16,
            color: '#4338ca',
            fontFamily: 'system-ui'
          },
          {
            id: 'tb-5',
            x: 60,
            y: 610,
            width: 700,
            height: 120,
            text: '☁️ Sincronizzazione Google Drive:\nI tuoi dati sono sempre salvati offline nella memoria sicura del dispositivo. Collega il tuo Google Drive dal pulsante in alto a destra per sincronizzare automaticamente le cartelle e ritrovarle su PC, iPhone o altri tablet.',
            fontSize: 16,
            color: '#b45309',
            fontFamily: 'system-ui'
          },
          {
            id: 'tb-6',
            x: 60,
            y: 770,
            width: 700,
            height: 60,
            text: '👇 Prova a scarabocchiare o scrivere qui sotto con l\'Apple Pencil o con il mouse!',
            fontSize: 16,
            color: '#64748b',
            fontFamily: 'system-ui'
          }
        ]
      }
    ]
  };

  await db.notebooks.add(welcomeNotebook);
}
