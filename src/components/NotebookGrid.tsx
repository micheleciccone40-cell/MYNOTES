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
  BookPlus,
  FolderPlus,
  FileText,
  X,
  Edit2
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
      className="flex-1 flex flex-col h-full bg-[#0c0d10] text-slate-100 overflow-y-auto select-none"
      onClick={() => {
        if (contextMenu) setContextMenu(null);
        if (showNewMenu) setShowNewMenu(false);
      }}
    >
      {/* Top Goodnotes Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0c0d10]/95 backdrop-blur-md px-6 py-3 flex items-center justify-between border-b border-[#181a22]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Breadcrumbs */}
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
          ) : (
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {currentFolderName}
            </h2>
          )}
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <span>Memoria Cloud</span>
          </button>

          {isSearchOpen ? (
            <div className="flex items-center gap-1 bg-[#1a1d26] px-2 py-1 rounded-full border border-slate-700">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca documenti..."
                className="bg-transparent text-xs text-white outline-none w-32 sm:w-44"
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

      {/* Subheader Filter Row */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white px-2 py-1 rounded-lg hover:bg-[#181a22] transition-colors"
          >
            <ListFilter className="w-4 h-4 text-slate-400" />
            <span>Tutto</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo</span>
            </button>

            {/* + Nuovo Dropdown Menu */}
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#181b24] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    onCreateNotebook();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-[#252a37] text-left transition-colors font-medium"
                >
                  <BookPlus className="w-4 h-4 text-blue-400" />
                  <span>Nuovo Documento Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    onOpenImportModal();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-[#252a37] text-left transition-colors font-medium"
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
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-[#252a37] text-left transition-colors font-medium"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <span>Nuova Cartella</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#181a22] transition-colors"
            title="Vista griglia"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSyncModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#181a22] transition-colors"
            title="Stato Cloud"
          >
            <Cloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <main className="px-6 pb-24 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
          {/* 1. Folders Display with Drop Target */}
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
                title="Tocca per aprire • Tieni premuto per menu opzioni • Trascina file qui per spostarli"
              >
                {/* Apple Light-Blue Folder Icon */}
                <div className="relative w-full aspect-[4/3] max-w-[170px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <svg
                    viewBox="0 0 200 150"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full drop-shadow-xl"
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

                <div className="mt-2.5 flex items-center gap-1 font-semibold text-xs text-slate-100 group-hover:text-blue-400 transition-colors">
                  <span className="truncate max-w-[130px]">{folder.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>

                <span className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(folder.updatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

          {/* 2. Documents Cards (Draggable + Long-Press Menu on iPad) */}
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
                title="Tocca per aprire • Tieni premuto per menu a pressione"
              >
                {/* Document Card: Clean Document Sheet Layout (NOT a fake notebook) */}
                <div
                  onClick={() => onOpenNotebook(nb.id)}
                  className="relative w-full aspect-[3/4] max-w-[160px] rounded-2xl bg-[#ffffff] p-3 flex flex-col justify-between shadow-xl transition-transform duration-200 group-hover:scale-105 border border-slate-200/20 overflow-hidden"
                >
                  {/* Subtle Top corner fold */}
                  <div className="absolute top-0 right-0 w-6 h-6 bg-[#f1f5f9] rounded-bl-xl shadow-inner border-b border-l border-slate-300" />

                  {/* Header chip */}
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
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
                    <span className="text-xs font-semibold text-slate-200 block truncate group-hover:text-blue-400 transition-colors">
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
      </main>

      {/* iPad-Style Long-Press / Right-Click Floating Context Menu Popover */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setContextMenu(null)}
        >
          <div
            style={{
              position: 'fixed',
              left: `${Math.min(window.innerWidth - 220, Math.max(10, contextMenu.x - 100))}px`,
              top: `${Math.min(window.innerHeight - 240, Math.max(10, contextMenu.y - 20))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-52 bg-[#1b1d26]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            {contextMenu.notebook && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const id = contextMenu.notebook!.id;
                    setContextMenu(null);
                    onOpenNotebook(id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-600 hover:text-white text-left font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Apri & Modifica</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = contextMenu.notebook!.id;
                    setContextMenu(null);
                    setMoveModalNotebookId(id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-700 text-left font-medium transition-colors"
                >
                  <FolderInput className="w-4 h-4 text-amber-400" />
                  <span>Sposta in cartella...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = contextMenu.notebook!.id;
                    setContextMenu(null);
                    onToggleFavorite(id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-700 text-left font-medium transition-colors"
                >
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>{contextMenu.notebook.isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = contextMenu.notebook!.id;
                    setContextMenu(null);
                    onDuplicateNotebook(id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-700 text-left font-medium transition-colors"
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
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-700 text-left font-medium transition-colors"
                >
                  <FileDown className="w-4 h-4 text-blue-400" />
                  <span>Esporta in PDF</span>
                </button>

                <div className="h-[1px] bg-slate-700/60 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    const id = contextMenu.notebook!.id;
                    setContextMenu(null);
                    if (confirm(`Eliminare "${contextMenu.notebook!.title}"?`)) {
                      onDeleteNotebook(id);
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left font-medium transition-colors"
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
                    const folderId = contextMenu.folder!.id;
                    setContextMenu(null);
                    onSelectFolder(folderId);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-600 hover:text-white text-left font-medium transition-colors"
                >
                  <FolderInput className="w-4 h-4 text-blue-400" />
                  <span>Apri Cartella</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {moveModalNotebookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#161822] border border-slate-700 rounded-3xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Sposta Documento in:</h3>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onMoveNotebook(moveModalNotebookId, null);
                  setMoveModalNotebookId(null);
                }}
                className="px-3.5 py-2.5 text-xs rounded-xl text-left bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
              >
                📁 Principale (Tutti i documenti)
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onMoveNotebook(moveModalNotebookId, f.id);
                    setMoveModalNotebookId(null);
                  }}
                  className="px-3.5 py-2.5 text-xs rounded-xl text-left bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-2.5 transition-colors font-medium"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-3 mt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMoveModalNotebookId(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
