export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'text' | 'lasso';

export type PaperTemplate = 
  | 'blank' 
  | 'ruled' 
  | 'grid' 
  | 'dots' 
  | 'dark-blank' 
  | 'dark-ruled' 
  | 'dark-grid' 
  | 'dark-dots';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'line' | 'rect' | 'circle';
  color: string;
  size: number;
  opacity: number;
  points: [number, number, number][]; // [x, y, pressure]
}

export interface TextBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  isEditing?: boolean;
}

export interface Page {
  id: string;
  pageNumber: number;
  backgroundType: 'template' | 'pdf' | 'image' | 'word';
  pdfPageNumber?: number;
  backgroundImageData?: string; // Data URL of PDF page or image
  width: number;
  height: number;
  strokes: Stroke[];
  textBlocks: TextBlock[];
}

export interface Notebook {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  paperTemplate: PaperTemplate;
  coverColor: string;
  pages: Page[];
  tags: string[];
  isFavorite?: boolean;
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
