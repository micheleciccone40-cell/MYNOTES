import React, { useState, useRef } from 'react';
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
  Bell,
  Cloud,
  ChevronDown,
  ListFilter,
  LayoutGrid,
  List as ListIcon,
  FolderPlus,
  FileText,
  X
} from 'lucide-react';
import type { Notebook, Folder } from '../types';

interface NotebookGridProps {
  notebooks: Notebook[];
  folders: Folder[];
  currentFolderId: string | 'all' | 'favorites' | 'shared';
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
}

export const NotebookGrid: React.FC<NotebookGridProps> = ({
  notebooks,
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
  onOpenMobileSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Context Menu state (for long-press on iPad or right-click on PC)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    notebook?: Notebook;
    folder?: Folder;
  } | null>(null);

  const [moveModalNotebookId, setMoveModalNotebookId] = useState<string | null>(null);

  // Long-press timer ref for iPad touch
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStartItem = (item: Notebook | Folder, isFolder: boolean, e: React.TouchEvent) => {
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    longPressTimerRef.current = setTimeout(() => {
      // Trigger long-press context menu
      setContextMenu({
        x: clientX,
        y: clientY,
        notebook: !isFolder ? (item as Notebook) : undefined,
        folder: isFolder ? (item as Folder) : undefined
      });
    }, 450);
  };

  const handleTouchEndItem = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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

  // Filter notebooks
  const filteredNotebooks = notebooks.filter((nb) => {
    const q = searchQuery.toLowerCase();
    return nb.title.toLowerCase().includes(q) || nb.tags?.some((t) => t.toLowerCase().includes(q));
  });

  const isInsideSpecificFolder = !['all', 'favorites', 'shared'].includes(currentFolderId);

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#000000] text-slate-100 overflow-y-auto select-none"
      onClick={() => {
        if (contextMenu) setContextMenu(null);
        if (showNewMenu) setShowNewMenu(false);
      }}
    >
      {/* Top Goodnotes Header Bar (Matched exactly to iPad Goodnotes screenshot) */}
      <header className="sticky top-0 z-30 bg-[#000000]/95 backdrop-blur-md px-6 py-3 flex items-center justify-between border-b border-[#18181b]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#1c1c1e] text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Breadcrumbs if inside a folder */}
          {isInsideSpecificFolder ? (
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => onSelectFolder('all')}
                className="text-slate-400 hover:text-white font-medium flex items-center gap-1"
              >
                Documenti
              </button>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold">{currentFolderName}</span>
            </div>
          ) : null}
        </div>

        {/* Right header actions (Goodnotes screenshot layout) */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
          >
            <span>Fai l'upgrade</span>
          </button>

          {isSearchOpen ? (
            <div className="flex items-center gap-1 bg-[#1c1c1e] px-3 py-1 rounded-full border border-[#2c2c2e]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca documenti..."
                className="bg-transparent text-xs text-white outline-none w-32 sm:w-48"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title="Cerca"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSyncModal}
            className="p-1 text-slate-300 hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
          </button>

          <div
            onClick={onOpenSyncModal}
            className="w-8 h-8 rounded-full bg-[#14b8a6] text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-md hover:scale-105 transition-transform"
            title="Profilo & Cloud"
          >
            M
          </div>
        </div>
      </header>

      {/* Big Title Row (Goodnotes Native Typography) */}
      <div className="px-6 pt-5 pb-1">
        <h2 className="text-3xl font-bold text-white tracking-tight font-sans">
          {currentFolderName}
        </h2>
      </div>

      {/* Subheader Action Bar (☰ Tutto on left, + Nuovo & icons on right) */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white px-2 py-1 rounded-lg hover:bg-[#18181b] transition-colors"
          >
            <ListFilter className="w-4 h-4 text-slate-400" />
            <span>Tutto</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewMenu(!showNewMenu);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuovo</span>
            </button>

            {/* + Nuovo Dropdown Menu */}
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    onCreateNotebook();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-100 hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                >
                  <FileText className="w-4 h-4 text-[#007aff]" />
                  <span>Nuovo Documento Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    onOpenImportModal();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-100 hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                >
                  <FileUp className="w-4 h-4 text-emerald-400" />
                  <span>Importa e Converti PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    onCreateFolderClick();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-100 hover:bg-[#2c2c2e] text-left transition-colors font-medium"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <span>Nuova Cartella</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#007aff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#18181b]'}`}
            title={viewMode === 'grid' ? 'Passa alla visualizzazione elenco a scorrimento' : 'Passa alla visualizzazione griglia'}
          >
            {viewMode === 'grid' ? <ListIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSyncModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#18181b] transition-colors"
            title="Stato Cloud"
          >
            <Cloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Area: Grid or Continuous Vertical List ("Scrolling uno dopo l'altro") */}
      <main className="px-6 pb-24 flex-1">
        {viewMode === 'list' ? (
          <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
            {/* List View Folders */}
            {!isInsideSpecificFolder &&
              folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  onTouchStart={(e) => handleTouchStartItem(folder, true, e)}
                  onTouchEnd={handleTouchEndItem}
                  onContextMenu={(e) => handleContextMenuPC(folder, true, e)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedNotebookId = e.dataTransfer.getData('text/plain');
                    if (draggedNotebookId) onMoveNotebook(draggedNotebookId, folder.id);
                  }}
                  className="flex items-center justify-between p-3.5 bg-[#121316] hover:bg-[#1a1c22] border border-[#1e2027] rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-10 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
                      style={{ backgroundColor: `${folder.color || '#70b1ff'}22`, color: folder.color || '#70b1ff' }}
                    >
                      📁
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{folder.name}</h4>
                      <span className="text-[11px] text-slate-500">Cartella • Modificata {new Date(folder.updatedAt).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#007aff] font-medium">Apri &gt;</span>
                  </div>
                </div>
              ))}

            {/* List View Documents ("scrolling uno dopo l'altro") */}
            {filteredNotebooks.map((nb) => (
              <div
                key={nb.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', nb.id)}
                onTouchStart={(e) => handleTouchStartItem(nb, false, e)}
                onTouchEnd={handleTouchEndItem}
                onContextMenu={(e) => handleContextMenuPC(nb, false, e)}
                onClick={() => onOpenNotebook(nb.id)}
                className="flex items-center justify-between p-3.5 bg-[#121316] hover:bg-[#1a1c22] border border-[#1e2027] rounded-2xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#007aff]/15 text-[#007aff] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-white hover:text-[#007aff] transition-colors truncate">{nb.title}</h4>
                    <span className="text-[11px] text-slate-500">
                      {nb.pages.length} {nb.pages.length === 1 ? 'pagina' : 'pagine'} • Ultima modifica: {new Date(nb.updatedAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
            {/* 1. Folders Display with Drop Target (Matching real Goodnotes baby-blue folder icon) */}
            {!isInsideSpecificFolder &&
              folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  onTouchStart={(e) => handleTouchStartItem(folder, true, e)}
                  onTouchEnd={handleTouchEndItem}
                  onContextMenu={(e) => handleContextMenuPC(folder, true, e)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedNotebookId = e.dataTransfer.getData('text/plain');
                    if (draggedNotebookId) {
                      onMoveNotebook(draggedNotebookId, folder.id);
                    }
                  }}
                  className="group flex flex-col items-center cursor-pointer text-center relative"
                  title="Tocca per aprire • Tieni premuto per opzioni"
                >
                  {/* Apple Light-Blue Folder Icon with star in top right */}
                  <div className="relative w-full aspect-[4/3] max-w-[170px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                    <svg
                      viewBox="0 0 200 150"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full drop-shadow-lg"
                    >
                      <path
                        d="M16 26C16 19.3726 21.3726 14 28 14H78C82.4183 14 86.5398 16.2917 88.8893 20.051L94.1107 28.4079C96.4602 32.1672 100.582 34.4589 105 34.4589H172C178.627 34.4589 184 39.8315 184 46.4589V124C184 130.627 178.627 136 172 136H28C21.3726 136 16 130.627 16 124V26Z"
                        fill={folder.color || '#70b1ff'}
                      />
                      <rect
                        x="16"
                        y="38"
                        width="168"
                        height="98"
                        rx="16"
                        fill={folder.color || '#70b1ff'}
                      />
                    </svg>

                    <div className="absolute top-8 right-6 z-10 text-white/90 drop-shadow">
                      <Star className="w-4 h-4 stroke-[2]" />
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1 font-semibold text-xs text-white group-hover:text-[#007aff] transition-colors">
                    <span className="truncate max-w-[130px]">{folder.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>

                  <span className="text-[11px] text-slate-500 mt-0.5">
                    oggi, {new Date(folder.updatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

            {/* 2. Documents Cards (Pure Clean Word Document Paper - NOT a notebook cover!) */}
            {filteredNotebooks.map((nb) => {
              const firstPage = nb.pages[0];

              return (
                <div
                  key={nb.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', nb.id)}
                  onTouchStart={(e) => handleTouchStartItem(nb, false, e)}
                  onTouchEnd={handleTouchEndItem}
                  onContextMenu={(e) => handleContextMenuPC(nb, false, e)}
                  className="group relative flex flex-col items-center cursor-pointer select-none"
                  title="Tocca per aprire • Tieni premuto per menu"
                >
                  {/* Clean Document Paper Sheet (Word Style Preview) */}
                  <div
                    onClick={() => onOpenNotebook(nb.id)}
                    className="relative w-full aspect-[3/4] max-w-[160px] rounded-2xl bg-[#ffffff] p-3 flex flex-col justify-between shadow-xl transition-transform duration-200 group-hover:scale-105 border border-slate-200 overflow-hidden"
                  >
                    {/* Top corner fold */}
                    <div className="absolute top-0 right-0 w-6 h-6 bg-[#f1f5f9] rounded-bl-xl shadow-inner border-b border-l border-slate-300" />

                    {/* Header chip */}
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#007aff] bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" /> DOC
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(nb.id);
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${nb.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Document preview snippet */}
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

                    {/* Bottom page count */}
                    <div className="z-10 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{nb.pages.length} {nb.pages.length === 1 ? 'pag' : 'pag'}</span>
                    </div>
                  </div>

                  {/* Title under card */}
                  <div className="mt-2.5 flex items-center justify-between w-full max-w-[160px] px-1">
                    <div
                      onClick={() => onOpenNotebook(nb.id)}
                      className="flex-1 truncate text-left"
                    >
                      <span className="text-xs font-semibold text-white block truncate group-hover:text-[#007aff] transition-colors">
                        {nb.title}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(nb.updatedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          notebook: nb
                        });
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded"
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

      {/* iPad-Style Long-Press / Right-Click Floating Context Menu Popover */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setContextMenu(null)}
        >
          <div
            style={{
              position: 'fixed',
              left: `${Math.min(window.innerWidth - 220, Math.max(10, contextMenu.x - 100))}px`,
              top: `${Math.min(window.innerHeight - 240, Math.max(10, contextMenu.y - 20))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-56 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
          >
            {contextMenu.notebook && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const nb = contextMenu.notebook!;
                    setContextMenu(null);
                    onOpenNotebook(nb.id);
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
                    if (confirm(`Eliminare definitivamente "${nb.title}"?`)) {
                      onDeleteNotebook(nb.id);
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Elimina</span>
                </button>
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
                  <span>Apri Cartella</span>
                </button>

                <div className="h-px bg-[#2c2c2e] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    const f = contextMenu.folder!;
                    setContextMenu(null);
                    if (confirm(`Eliminare la cartella "${f.name}"?`)) {
                      // Handled by sidebar or delete
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
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
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
              <button
                type="button"
                onClick={() => setMoveModalNotebookId(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
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
                }}
                className="p-3 rounded-xl bg-[#242426] hover:bg-[#2c2c2e] text-left text-white font-medium flex items-center gap-2.5"
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
                  }}
                  className="p-3 rounded-xl bg-[#242426] hover:bg-[#2c2c2e] text-left text-white font-medium flex items-center gap-2.5"
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
