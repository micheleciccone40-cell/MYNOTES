import React, { useState, useRef, useCallback } from 'react';
import {
  Plus,
  Search,
  Star,
  FileUp,
  MoreVertical,
  FileDown,
  Trash2,
  Copy,
  FolderInput,
  Menu,
  Cloud,
  ChevronDown,
  ListFilter,
  LayoutGrid,
  List as ListIcon,
  FolderPlus,
  FileText,
  X,
  RotateCcw,
  Smartphone,
  Edit3,
  Check
} from 'lucide-react';
import type { Notebook, Folder } from '../types';

interface NotebookGridProps {
  notebooks: Notebook[];
  allNotebooks?: Notebook[];
  folders: Folder[];
  currentFolderId: string | 'all' | 'favorites' | 'shared' | 'trash';
  currentFolderName: string;
  onOpenNotebook: (notebookId: string) => void;
  onCreateNotebook: () => void;
  onCreateFolderClick: () => void;
  onOpenImportModal: () => void;
  onOpenSyncModal: () => void;
  onToggleFavorite: (notebookId: string) => void;
  onDeleteNotebook: (notebookId: string) => void;
  onDuplicateNotebook: (notebookId: string) => void;
  onMoveNotebook: (notebookId: string, folderId: string | null) => void;
  onExportPdfDirect: (notebook: Notebook) => void;
  onSelectFolder: (folderId: string | 'all') => void;
  onOpenMobileSidebar: () => void;
  onRestoreNotebook?: (notebookId: string) => void;
  onEmptyTrash?: () => void;
  onRenameNotebook?: (notebookId: string, newTitle: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteFolder?: (folderId: string) => void;
}

export const NotebookGrid: React.FC<NotebookGridProps> = ({
  notebooks,
  allNotebooks,
  folders,
  currentFolderId,
  currentFolderName,
  onOpenNotebook,
  onCreateNotebook,
  onCreateFolderClick,
  onOpenImportModal,
  onOpenSyncModal,
  onToggleFavorite,
  onDeleteNotebook,
  onDuplicateNotebook,
  onMoveNotebook,
  onExportPdfDirect,
  onSelectFolder,
  onOpenMobileSidebar,
  onRestoreNotebook,
  onEmptyTrash,
  onRenameNotebook,
  onRenameFolder,
  onDeleteFolder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'pages'>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [dismissPwaTip, setDismissPwaTip] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    notebook?: Notebook;
    folder?: Folder;
  } | null>(null);

  const [moveModalNotebookId, setMoveModalNotebookId] = useState<string | null>(null);

  // Drag & Drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Touch Drag state (for iPad / iPhone Apple Pencil & finger drag)
  const [touchDrag, setTouchDrag] = useState<{
    notebook: Notebook;
    x: number;
    y: number;
  } | null>(null);

  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef(false);

  // Inline Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renamingType, setRenamingType] = useState<'notebook' | 'folder'>('notebook');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Long-press timer
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Touch event handlers for items
  const handleTouchStartItem = (item: Notebook | Folder, isFolder: boolean, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isTouchDraggingRef.current = false;

    // Start 450ms long-press timer for context menu
    longPressTimerRef.current = setTimeout(() => {
      if (!isTouchDraggingRef.current) {
        setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          notebook: !isFolder ? (item as Notebook) : undefined,
          folder: isFolder ? (item as Folder) : undefined
        });
      }
    }, 450);
  };

  const handleTouchMoveItem = (nb: Notebook, e: React.TouchEvent) => {
    if (!touchStartPosRef.current || isTrashView) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    // If dragged > 14px, cancel context menu and begin touch drag!
    if (dist > 14) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      isTouchDraggingRef.current = true;
      setTouchDrag({ notebook: nb, x: touch.clientX, y: touch.clientY });

      // Detect folder element under finger
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const folderElem = elem?.closest('[data-folder-id]');
      const targetFolderId = folderElem?.getAttribute('data-folder-id') || null;
      setDragOverFolderId(targetFolderId);
    }
  };

  const handleTouchEndItem = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isTouchDraggingRef.current && touchDrag && dragOverFolderId) {
      const targetId = dragOverFolderId === 'root' ? null : dragOverFolderId;
      const targetName = targetId ? folders.find((f) => f.id === targetId)?.name || 'Cartella' : 'Documenti';
      onMoveNotebook(touchDrag.notebook.id, targetId);
      showToast(`✓ Spostato in "${targetName}"`);
    }

    touchStartPosRef.current = null;
    isTouchDraggingRef.current = false;
    setTouchDrag(null);
    setDragOverFolderId(null);
  };

  const handleContextMenuPC = (item: Notebook | Folder, isFolder: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      notebook: !isFolder ? (item as Notebook) : undefined,
      folder: isFolder ? (item as Folder) : undefined
    });
  };

  // Start inline rename
  const startRename = useCallback((id: string, currentName: string, type: 'notebook' | 'folder') => {
    setRenamingId(id);
    setRenameText(currentName);
    setRenamingType(type);
    setTimeout(() => renameInputRef.current?.select(), 60);
  }, []);

  // Commit rename
  const commitRename = useCallback(() => {
    if (renamingId && renameText.trim()) {
      if (renamingType === 'notebook' && onRenameNotebook) {
        onRenameNotebook(renamingId, renameText.trim());
        showToast('✓ Titolo aggiornato');
      } else if (renamingType === 'folder' && onRenameFolder) {
        onRenameFolder(renamingId, renameText.trim());
        showToast('✓ Cartella rinominata');
      }
    }
    setRenamingId(null);
    setRenameText('');
  }, [renamingId, renameText, renamingType, onRenameNotebook, onRenameFolder]);

  // Double tap to rename
  const handleTitleTap = (id: string, name: string, type: 'notebook' | 'folder', e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === id && now - lastTapRef.current.time < 380) {
      startRename(id, name, type);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id, time: now };
    }
  };

  // Desktop Drag handlers
  const handleDragStart = (e: React.DragEvent, notebookId: string) => {
    e.dataTransfer.setData('text/plain', notebookId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(notebookId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain') || draggingId;
    if (draggedId) {
      const targetName = folderId ? folders.find((f) => f.id === folderId)?.name || 'Cartella' : 'Documenti';
      onMoveNotebook(draggedId, folderId);
      showToast(`✓ Spostato in "${targetName}"`);
    }
    setDraggingId(null);
    setDragOverFolderId(null);
  };

  // Search logic: if search query active, search across ALL notebooks!
  const sourceNotebooks = searchQuery.trim() ? (allNotebooks || notebooks) : notebooks;

  const filteredNotebooks = sourceNotebooks
    .filter((nb) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      if (nb.title.toLowerCase().includes(q)) return true;
      if (nb.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      return nb.pages.some((p) => p.contentHtml && p.contentHtml.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'pages') return b.pages.length - a.pages.length;
      return b.updatedAt - a.updatedAt;
    });

  const isInsideSpecificFolder = !['all', 'favorites', 'shared', 'trash'].includes(currentFolderId);
  const isTrashView = currentFolderId === 'trash';

  // Inline rename input component
  const RenameInput = ({ id, className }: { id: string; className?: string }) => (
    renamingId === id ? (
      <input
        ref={renameInputRef}
        type="text"
        value={renameText}
        onChange={(e) => setRenameText(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitRename();
          if (e.key === 'Escape') { setRenamingId(null); setRenameText(''); }
        }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#007aff]/15 border border-[#007aff] rounded-lg px-2 py-0.5 text-white outline-none text-xs font-semibold w-full shadow-lg ${className || ''}`}
        autoFocus
      />
    ) : null
  );

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#000000] text-slate-100 overflow-y-auto select-none relative"
      onClick={() => {
        if (contextMenu) setContextMenu(null);
        if (showNewMenu) setShowNewMenu(false);
        if (showSortMenu) setShowSortMenu(false);
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-[#1c1c1e]/95 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Touch Drag Preview (following Apple Pencil / finger) */}
      {touchDrag && (
        <div
          style={{
            position: 'fixed',
            left: `${touchDrag.x - 55}px`,
            top: `${touchDrag.y - 75}px`,
            pointerEvents: 'none',
            zIndex: 9999
          }}
          className="w-28 aspect-[3/4] bg-white rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 border-[#007aff] rotate-3 opacity-90 flex flex-col justify-between animate-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-1 text-[8px] font-bold text-[#007aff]">
            <FileText className="w-2.5 h-2.5" /> DOC
          </div>
          <p className="text-[10px] font-semibold text-slate-800 line-clamp-3 leading-snug">
            {touchDrag.notebook.title}
          </p>
          <span className="text-[8px] text-slate-400 font-mono">
            {touchDrag.notebook.pages.length} pag
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#000000]/95 backdrop-blur-md px-6 py-3 flex items-center justify-between border-b border-[#18181b]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#1c1c1e] text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs with Drop Target back to Root */}
          {isInsideSpecificFolder ? (
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                data-folder-id="root"
                onClick={() => onSelectFolder('all')}
                onDragOver={(e) => handleFolderDragOver(e, 'root')}
                onDragLeave={handleFolderDragLeave}
                onDrop={(e) => handleFolderDrop(e, null)}
                className={`font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  dragOverFolderId === 'root'
                    ? 'bg-[#007aff]/30 text-white ring-2 ring-[#007aff]'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a1c22]'
                }`}
                title="Trascina qui per spostare nella cartella principale"
              >
                <span>Documenti</span>
              </button>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold">{currentFolderName}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {/* Full-Text Search Bar */}
          <div className="flex items-center gap-2 bg-[#18191e] px-3.5 py-1.5 rounded-full border border-[#2c2c2e] focus-within:border-[#007aff] transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca documenti o testo..."
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-36 sm:w-56"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cloud Sync Status Pill */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#18191e] hover:bg-[#22242e] text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-[#2c2d36] transition-all"
            title="Google Drive Cloud Sync"
          >
            <Cloud className="w-3.5 h-3.5 text-[#007aff]" />
            <span>Cloud</span>
          </button>

          {/* Profile Avatar */}
          <div
            onClick={onOpenSyncModal}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-lg hover:scale-105 transition-transform"
            title="Profilo & Cloud"
          >
            M
          </div>
        </div>
      </header>

      {/* iPad Home Screen PWA Tip Banner */}
      {!dismissPwaTip && (
        <div className="mx-6 mt-3 p-3 rounded-2xl bg-[#14151b] border border-[#252834] flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-[#007aff] shrink-0" />
            <span>
              <b>Suggerimento iPad:</b> Tocca <b>Condividi</b> in Safari e scegli <i>"Aggiungi alla schermata Home"</i> per aprirla a schermo intero come una vera app nativa!
            </span>
          </div>
          <button type="button" onClick={() => setDismissPwaTip(true)} className="p-1 text-slate-500 hover:text-slate-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Big Title Row */}
      <div className="px-6 pt-5 pb-1 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight font-sans">
            {searchQuery.trim() ? `Risultati ricerca "${searchQuery}"` : currentFolderName}
          </h2>
          {searchQuery.trim() && (
            <p className="text-xs text-slate-400 mt-1">
              {filteredNotebooks.length} {filteredNotebooks.length === 1 ? 'documento trovato' : 'documenti trovati'} nella libreria
            </p>
          )}
        </div>

        {isTrashView && filteredNotebooks.length > 0 && onEmptyTrash && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Vuoi svuotare il Cestino ed eliminare tutti i documenti per sempre?')) {
                onEmptyTrash();
              }
            }}
            className="px-3.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Svuota Cestino</span>
          </button>
        )}
      </div>

      {/* Subheader Action Bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white px-2.5 py-1 rounded-lg hover:bg-[#18181b] transition-colors"
          >
            <ListFilter className="w-4 h-4 text-slate-400" />
            <span>
              {sortBy === 'date' ? 'Più recenti' : sortBy === 'name' ? 'Nome (A-Z)' : 'Numero pagine'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showSortMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-xs">
              {(['date', 'name', 'pages'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSortBy(s); setShowSortMenu(false); }}
                  className={`px-3 py-2 rounded-xl text-left transition-colors ${sortBy === s ? 'bg-[#007aff] text-white font-semibold' : 'text-slate-300 hover:bg-[#2c2c2e]'}`}
                >
                  {s === 'date' ? 'Data di modifica (Recenti)' : s === 'name' ? 'Nome (Alfabetico A-Z)' : 'Numero di pagine'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isTrashView && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowNewMenu(!showNewMenu); }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuovo</span>
              </button>

              {showNewMenu && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { setShowNewMenu(false); onCreateNotebook(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-100 hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                  >
                    <FileText className="w-4 h-4 text-[#007aff]" />
                    <span>Nuovo Documento Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewMenu(false); onOpenImportModal(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-100 hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                  >
                    <FileUp className="w-4 h-4 text-emerald-400" />
                    <span>Importa e Converti PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewMenu(false); onCreateFolderClick(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-100 hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                  >
                    <FolderPlus className="w-4 h-4 text-amber-400" />
                    <span>Nuova Cartella</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#007aff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#18181b]'}`}
            title={viewMode === 'grid' ? 'Vista elenco' : 'Vista griglia'}
          >
            {viewMode === 'grid' ? <ListIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Area: Grid or List */}
      <main className="px-6 pb-24 flex-1">
        {filteredNotebooks.length === 0 && (!folders.length || isInsideSpecificFolder || searchQuery.trim()) && (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
            <div className="w-20 h-20 rounded-3xl bg-[#18191e] flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 stroke-[1] text-slate-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">Nessun documento trovato</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {isTrashView
                ? 'Il Cestino è vuoto. I documenti che elimini compariranno qui.'
                : searchQuery.trim()
                ? 'Nessun risultato corrisponde alla tua ricerca.'
                : 'Crea un nuovo documento Word o importa un PDF per iniziare a prendere appunti.'}
            </p>
            {!isTrashView && !searchQuery.trim() && (
              <button
                type="button"
                onClick={onCreateNotebook}
                className="mt-4 px-5 py-2 bg-[#007aff] hover:bg-[#0062cc] text-white rounded-full text-xs font-semibold transition-all active:scale-95 shadow-md"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Crea Documento
              </button>
            )}
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
            {/* List Folders (only shown when not searching and at root) */}
            {!isInsideSpecificFolder && !isTrashView && !searchQuery.trim() &&
              folders.map((folder) => {
                const isDragOver = dragOverFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    data-folder-id={folder.id}
                    onClick={() => renamingId !== folder.id && onSelectFolder(folder.id)}
                    onTouchStart={(e) => handleTouchStartItem(folder, true, e)}
                    onTouchEnd={handleTouchEndItem}
                    onContextMenu={(e) => handleContextMenuPC(folder, true, e)}
                    onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
                    className={`flex items-center justify-between p-3.5 bg-[#121316] hover:bg-[#1a1c22] border rounded-2xl cursor-pointer transition-all duration-200 ${
                      isDragOver
                        ? 'border-[#007aff] bg-[#007aff]/15 ring-2 ring-[#007aff] scale-[1.01]'
                        : 'border-[#1e2027]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-10 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
                        style={{ backgroundColor: `${folder.color || '#70b1ff'}22`, color: folder.color || '#70b1ff' }}
                      >
                        📁
                      </div>
                      <div>
                        {renamingId === folder.id ? (
                          <RenameInput id={folder.id} />
                        ) : (
                          <h4
                            className="text-sm font-semibold text-white hover:text-[#007aff] transition-colors"
                            onClick={(e) => handleTitleTap(folder.id, folder.name, 'folder', e)}
                            title="Doppio tap per rinominare"
                          >
                            {folder.name}
                          </h4>
                        )}
                        <span className="text-[11px] text-slate-500">
                          Cartella • {new Date(folder.updatedAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#007aff] font-medium">Apri &gt;</span>
                    </div>
                  </div>
                );
              })}

            {/* List Documents */}
            {filteredNotebooks.map((nb) => {
              const isDragging = draggingId === nb.id || touchDrag?.notebook.id === nb.id;
              const parentFolder = nb.folderId ? folders.find((f) => f.id === nb.folderId) : null;

              return (
                <div
                  key={nb.id}
                  draggable={!isTrashView}
                  onDragStart={(e) => handleDragStart(e, nb.id)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStartItem(nb, false, e)}
                  onTouchMove={(e) => handleTouchMoveItem(nb, e)}
                  onTouchEnd={handleTouchEndItem}
                  onContextMenu={(e) => handleContextMenuPC(nb, false, e)}
                  onClick={() => !isTrashView && renamingId !== nb.id && onOpenNotebook(nb.id)}
                  className={`flex items-center justify-between p-3.5 bg-[#121316] hover:bg-[#1a1c22] border border-[#1e2027] rounded-2xl cursor-pointer transition-all duration-200 ${
                    isDragging ? 'opacity-30 scale-95' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 truncate">
                    <div className="w-10 h-10 rounded-xl bg-[#007aff]/15 text-[#007aff] flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      {renamingId === nb.id ? (
                        <RenameInput id={nb.id} />
                      ) : (
                        <h4
                          className="text-sm font-semibold text-white hover:text-[#007aff] transition-colors truncate"
                          onClick={(e) => handleTitleTap(nb.id, nb.title, 'notebook', e)}
                          title="Doppio tap per rinominare"
                        >
                          {nb.title}
                        </h4>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{nb.pages.length} {nb.pages.length === 1 ? 'pagina' : 'pagine'}</span>
                        <span>•</span>
                        <span>{new Date(nb.updatedAt).toLocaleDateString('it-IT')}</span>
                        {parentFolder && (
                          <>
                            <span>•</span>
                            <span className="text-[#007aff] font-medium bg-[#007aff]/10 px-1.5 py-0.2 rounded-md">
                              📁 {parentFolder.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isTrashView ? (
                      <button
                        type="button"
                        onClick={() => onRestoreNotebook && onRestoreNotebook(nb.id)}
                        className="px-3 py-1 bg-[#007aff]/15 hover:bg-[#007aff]/25 text-[#007aff] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Ripristina
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(nb.id)}
                          className="p-2 text-slate-400 hover:text-amber-400 rounded-lg transition-colors"
                        >
                          <Star className={`w-4 h-4 ${nb.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setContextMenu({ x: e.clientX, y: e.clientY, notebook: nb })}
                          className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
            {/* Grid Folders (only shown when not searching and at root) */}
            {!isInsideSpecificFolder && !isTrashView && !searchQuery.trim() &&
              folders.map((folder) => {
                const isDragOver = dragOverFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    data-folder-id={folder.id}
                    onClick={() => renamingId !== folder.id && onSelectFolder(folder.id)}
                    onTouchStart={(e) => handleTouchStartItem(folder, true, e)}
                    onTouchEnd={handleTouchEndItem}
                    onContextMenu={(e) => handleContextMenuPC(folder, true, e)}
                    onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
                    className={`group flex flex-col items-center cursor-pointer text-center relative transition-all duration-200 ${
                      isDragOver ? 'scale-110 drop-shadow-[0_0_20px_rgba(0,122,255,0.7)]' : ''
                    }`}
                    title="Tocca per aprire • Trascina documenti qui"
                  >
                    <div className="relative w-full aspect-[4/3] max-w-[170px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                      <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
                        <path
                          d="M16 26C16 19.3726 21.3726 14 28 14H78C82.4183 14 86.5398 16.2917 88.8893 20.051L94.1107 28.4079C96.4602 32.1672 100.582 34.4589 105 34.4589H172C178.627 34.4589 184 39.8315 184 46.4589V124C184 130.627 178.627 136 172 136H28C21.3726 136 16 130.627 16 124V26Z"
                          fill={isDragOver ? '#007aff' : (folder.color || '#70b1ff')}
                        />
                        <rect
                          x="16"
                          y="38"
                          width="168"
                          height="98"
                          rx="16"
                          fill={isDragOver ? '#007aff' : (folder.color || '#70b1ff')}
                        />
                      </svg>

                      {isDragOver && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-xs bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                            Rilascia qui
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 w-full max-w-[150px]">
                      {renamingId === folder.id ? (
                        <RenameInput id={folder.id} />
                      ) : (
                        <div
                          className="flex items-center justify-center gap-1 font-semibold text-xs text-white group-hover:text-[#007aff] transition-colors"
                          onClick={(e) => handleTitleTap(folder.id, folder.name, 'folder', e)}
                          title="Doppio tap per rinominare"
                        >
                          <span className="truncate max-w-[130px]">{folder.name}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                        </div>
                      )}
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {new Date(folder.updatedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Grid Documents */}
            {filteredNotebooks.map((nb) => {
              const firstPage = nb.pages[0];
              const isDragging = draggingId === nb.id || touchDrag?.notebook.id === nb.id;
              const parentFolder = nb.folderId ? folders.find((f) => f.id === nb.folderId) : null;

              return (
                <div
                  key={nb.id}
                  draggable={!isTrashView}
                  onDragStart={(e) => handleDragStart(e, nb.id)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStartItem(nb, false, e)}
                  onTouchMove={(e) => handleTouchMoveItem(nb, e)}
                  onTouchEnd={handleTouchEndItem}
                  onContextMenu={(e) => handleContextMenuPC(nb, false, e)}
                  className={`group relative flex flex-col items-center cursor-pointer select-none transition-all duration-200 ${
                    isDragging ? 'opacity-30 scale-90 rotate-2' : ''
                  }`}
                  title="Tocca per aprire • Tieni premuto per menu • Trascina in una cartella"
                >
                  {/* Document Paper Card */}
                  <div
                    onClick={() => !isTrashView && renamingId !== nb.id && onOpenNotebook(nb.id)}
                    className="relative w-full aspect-[3/4] max-w-[160px] rounded-2xl bg-[#ffffff] p-3 flex flex-col justify-between shadow-xl transition-all duration-200 group-hover:scale-105 group-hover:shadow-2xl border border-slate-200 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-6 h-6 bg-[#f1f5f9] rounded-bl-xl shadow-inner border-b border-l border-slate-300" />

                    <div className="flex items-center justify-between z-10">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#007aff] bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" /> DOC
                      </span>

                      {!isTrashView && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(nb.id); }}
                          className="p-1 rounded-full text-slate-400 hover:text-amber-500 transition-colors"
                        >
                          <Star className={`w-3.5 h-3.5 ${nb.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Preview Snippet */}
                    <div className="my-auto text-left text-[10px] text-slate-700 leading-relaxed font-sans line-clamp-6 opacity-85 px-1">
                      {firstPage?.contentHtml ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: firstPage.contentHtml.replace(/<[^>]*>?/gm, '').slice(0, 140) + '...'
                          }}
                        />
                      ) : (
                        <p className="text-slate-400 italic">Documento vuoto</p>
                      )}
                    </div>

                    <div className="z-10 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{nb.pages.length} {nb.pages.length === 1 ? 'pag' : 'pag'}</span>
                      {parentFolder && (
                        <span className="text-[9px] text-[#007aff] font-sans truncate max-w-[65px]">
                          📁 {parentFolder.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Actions under card */}
                  <div className="mt-2.5 flex items-center justify-between w-full max-w-[160px] px-1">
                    <div className="flex-1 truncate text-left min-w-0">
                      {renamingId === nb.id ? (
                        <RenameInput id={nb.id} />
                      ) : (
                        <>
                          <span
                            className="text-xs font-semibold text-white block truncate group-hover:text-[#007aff] transition-colors cursor-text"
                            onClick={(e) => handleTitleTap(nb.id, nb.title, 'notebook', e)}
                            title="Doppio tap per rinominare"
                          >
                            {nb.title}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {new Date(nb.updatedAt).toLocaleDateString('it-IT')}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, notebook: nb });
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded shrink-0 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Context Menu Popover */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setContextMenu(null)}
        >
          <div
            style={{
              position: 'fixed',
              left: `${Math.min(window.innerWidth - 220, Math.max(10, contextMenu.x - 100))}px`,
              top: `${Math.min(window.innerHeight - 340, Math.max(10, contextMenu.y - 20))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-56 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
          >
            {contextMenu.notebook && (
              <>
                {isTrashView ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        onRestoreNotebook && onRestoreNotebook(nb.id);
                        showToast('✓ Documento ripristinato');
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium text-[#007aff]"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ripristina nella libreria</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        if (confirm(`Eliminare definitivamente "${nb.title}"? Non potrai più recuperarlo.`)) {
                          onDeleteNotebook(nb.id);
                          showToast('Documento eliminato definitivamente');
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition-colors font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Elimina per sempre</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setContextMenu(null);
                        onOpenNotebook(contextMenu.notebook!.id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium text-white"
                    >
                      <FileText className="w-4 h-4 text-[#007aff]" />
                      <span>Apri Documento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        startRename(nb.id, nb.title, 'notebook');
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                    >
                      <Edit3 className="w-4 h-4 text-[#007aff]" />
                      <span>Rinomina</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        onToggleFavorite(nb.id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                    >
                      <Star className={`w-4 h-4 ${contextMenu.notebook!.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-amber-400'}`} />
                      <span>{contextMenu.notebook!.isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        setMoveModalNotebookId(nb.id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                    >
                      <FolderInput className="w-4 h-4 text-[#007aff]" />
                      <span>Sposta in cartella...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        onDuplicateNotebook(nb.id);
                        showToast('✓ Documento duplicato');
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                    >
                      <Copy className="w-4 h-4 text-emerald-400" />
                      <span>Duplica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        onExportPdfDirect(nb);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                    >
                      <FileDown className="w-4 h-4 text-sky-400" />
                      <span>Esporta come PDF</span>
                    </button>

                    <div className="h-px bg-[#2c2c2e] my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        const nb = contextMenu.notebook!;
                        setContextMenu(null);
                        onDeleteNotebook(nb.id);
                        showToast('Documento spostato nel Cestino');
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition-colors font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Sposta nel Cestino</span>
                    </button>
                  </>
                )}
              </>
            )}

            {contextMenu.folder && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const f = contextMenu.folder!;
                    setContextMenu(null);
                    onSelectFolder(f.id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium text-white"
                >
                  <FolderInput className="w-4 h-4 text-[#007aff]" />
                  <span>Apri Cartella</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const f = contextMenu.folder!;
                    setContextMenu(null);
                    startRename(f.id, f.name, 'folder');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                >
                  <Edit3 className="w-4 h-4 text-[#007aff]" />
                  <span>Rinomina Cartella</span>
                </button>

                <div className="h-px bg-[#2c2c2e] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    const f = contextMenu.folder!;
                    setContextMenu(null);
                    if (confirm(`Eliminare la cartella "${f.name}"? I documenti al suo interno non verranno cancellati.`)) {
                      onDeleteFolder && onDeleteFolder(f.id);
                      showToast('Cartella eliminata');
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Elimina Cartella</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Move Document to Folder Modal */}
      {moveModalNotebookId && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMoveModalNotebookId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1c1c1e] border border-[#2c2c2e] rounded-3xl p-5 shadow-2xl flex flex-col gap-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#2c2c2e] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-[#007aff]" /> Sposta Documento
              </h3>
              <button type="button" onClick={() => setMoveModalNotebookId(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400">Seleziona la cartella di destinazione:</p>

            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onMoveNotebook(moveModalNotebookId, null);
                  setMoveModalNotebookId(null);
                  showToast('✓ Spostato in Documenti (Principale)');
                }}
                className="p-3 rounded-xl bg-[#242426] hover:bg-[#2c2c2e] text-left text-white font-medium flex items-center gap-2.5 transition-colors"
              >
                <span>📁 Principale (Nessuna cartella)</span>
              </button>

              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onMoveNotebook(moveModalNotebookId, f.id);
                    setMoveModalNotebookId(null);
                    showToast(`✓ Spostato in "${f.name}"`);
                  }}
                  className="p-3 rounded-xl bg-[#242426] hover:bg-[#2c2c2e] text-left text-white font-medium flex items-center gap-2.5 transition-colors"
                >
                  <span style={{ color: f.color || '#70b1ff' }}>📁</span>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};