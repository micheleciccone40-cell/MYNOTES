export type ToolType = 'text' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle';

export type PaperTemplate = 
  | 'blank' 
  | 'ruled' 
  | 'grid' 
  | 'dots' 
  | 'dark-blank' 
  | 'dark-ruled' 
  | 'dark-grid';

export interface FloatingImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'line' | 'rect' | 'circle';
  color: string;
  size: number;
  opacity: number;
  points: [number, number, number][]; // [x, y, pressure]
}

export interface Page {
  id: string;
  pageNumber: number;
  backgroundType: 'template' | 'pdf' | 'image' | 'word';
  pdfPageNumber?: number;
  backgroundImageData?: string;
  width: number;
  height: number;
  // Word-style continuous rich text content (no disjointed blocks)
  contentHtml?: string;
  // Freeform images that can be placed and moved anywhere
  images: FloatingImage[];
  // Hand-drawn Apple Pencil ink strokes and annotations
  strokes: Stroke[];
}

export interface Notebook {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  paperTemplate: PaperTemplate; // Default: 'blank'
  coverColor: string;
  pages: Page[];
  tags: string[];
  isFavorite?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  userEmail?: string;
  error?: string | null;
}
