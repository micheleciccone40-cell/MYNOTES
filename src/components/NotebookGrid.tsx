import React, { useState } from 'react';
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
  const [activeMenuNotebookId, setActiveMenuNotebookId] = useState<string | null>(null);
  const [moveModalNotebookId, setMoveModalNotebookId] = useState<string | null>(null);

  // Filter notebooks by title
  const filteredNotebooks = notebooks.filter((nb) => {
    const q = searchQuery.toLowerCase();
    return nb.title.toLowerCase().includes(q) || nb.tags?.some((t) => t.toLowerCase().includes(q));
  });

  const isInsideSpecificFolder = !['all', 'favorites', 'shared'].includes(currentFolderId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0d11] text-slate-100 overflow-y-auto select-none">
      {/* Top Goodnotes Header Bar (matching screenshot 2) */}
      <header className="sticky top-0 z-30 bg-[#0c0d11]/95 backdrop-blur-md px-6 py-3 flex items-center justify-between border-b border-[#181a22]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
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
          ) : (
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {currentFolderName}
            </h2>
          )}
        </div>

        {/* Right header actions: Fai l'upgrade / Memoria Cloud pill, Search, Bell, Profile Avatar */}
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
                placeholder="Cerca appunti..."
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

          {/* User Profile Avatar (matching teal circle with "M" in screenshot 2) */}
          <div
            onClick={onOpenSyncModal}
            className="w-8 h-8 rounded-full bg-[#14b8a6] text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-md hover:scale-105 transition-transform"
            title="Profilo & Cloud"
          >
            M
          </div>
        </div>
      </header>

      {/* Sub-Header Actions Row: Tutto ⌵ on the left, + Nuovo, LayoutGrid, Cloud on the right */}
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Filter: Tutto ⌵ */}
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

        {/* Right Actions: + Nuovo Button, Grid, Cloud */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo</span>
            </button>

            {/* + Nuovo Dropdown Menu */}
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#181b24] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    onCreateNotebook();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-[#252a37] text-left transition-colors font-medium"
                >
                  <BookPlus className="w-4 h-4 text-blue-400" />
                  <span>Nuovo Taccuino</span>
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
                  <span>Importa Documento (PDF)</span>
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

      {/* Main Grid Area: Goodnotes-style Folders & Notebooks */}
      <main className="px-6 pb-24 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
          {/* 1. Folders Display (matching screenshot 2 exactly!) */}
          {!isInsideSpecificFolder &&
            folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className="group flex flex-col items-center cursor-pointer text-center"
              >
                {/* Classic Apple Light-Blue Folder Icon from screenshot 2 */}
                <div className="relative w-full aspect-[4/3] max-w-[170px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <svg
                    viewBox="0 0 200 150"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full drop-shadow-xl"
                  >
                    {/* Folder Tab on top left */}
                    <path
                      d="M16 26C16 19.3726 21.3726 14 28 14H78C82.4183 14 86.5398 16.2917 88.8893 20.051L94.1107 28.4079C96.4602 32.1672 100.582 34.4589 105 34.4589H172C178.627 34.4589 184 39.8315 184 46.4589V124C184 130.627 178.627 136 172 136H28C21.3726 136 16 130.627 16 124V26Z"
                      fill={folder.color || '#70b1ff'}
                    />
                    {/* Front Folder Body */}
                    <rect
                      x="16"
                      y="38"
                      width="168"
                      height="98"
                      rx="16"
                      fill={folder.color || '#70b1ff'}
                    />
                  </svg>

                  {/* Star Icon in top-right of the folder (exact as in screenshot 2) */}
                  <div className="absolute top-8 right-6 z-10 text-white/90 drop-shadow">
                    <Star className="w-4 h-4 stroke-[2]" />
                  </div>
                </div>

                {/* Folder Title with chevron down (like "Mass media ⌵") */}
                <div className="mt-2.5 flex items-center gap-1 font-semibold text-xs text-slate-100 group-hover:text-blue-400 transition-colors">
                  <span className="truncate max-w-[130px]">{folder.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>

                {/* Subtitle date (like "oggi, 16:38") */}
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(folder.updatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

          {/* 2. Notebooks Cards */}
          {filteredNotebooks.map((nb) => {
            const firstPage = nb.pages[0];
            const isMenuOpen = activeMenuNotebookId === nb.id;

            return (
              <div
                key={nb.id}
                className="group relative flex flex-col items-center cursor-pointer"
              >
                {/* Notebook Cover Card */}
                <div
                  onClick={() => onOpenNotebook(nb.id)}
                  className="relative w-full aspect-[3/4] max-w-[160px] rounded-xl overflow-hidden shadow-xl p-3 flex flex-col justify-between transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${nb.coverColor || '#2563eb'} 0%, #0f172a 100%)`
                  }}
                >
                  {/* Left Spine */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/30 border-r border-white/10" />

                  {/* Top Favorite star */}
                  <div className="flex justify-end z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(nb.id);
                      }}
                      className="p-1 rounded-full bg-black/30 backdrop-blur-sm text-white"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${nb.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white/60'}`}
                      />
                    </button>
                  </div>

                  {/* Page Preview Thumbnail */}
                  {firstPage?.backgroundImageData ? (
                    <div className="absolute inset-x-5 inset-y-10 bg-white rounded shadow-md overflow-hidden opacity-95">
                      <img
                        src={firstPage.backgroundImageData}
                        alt="Anteprima"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-x-5 inset-y-10 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex flex-col justify-center text-center opacity-85">
                      <span className="text-[10px] font-mono text-white/50">
                        {nb.pages.length} {nb.pages.length === 1 ? 'pag' : 'pag'}
                      </span>
                    </div>
                  )}

                  {/* Title on bottom cover */}
                  <div className="z-10 pl-2">
                    <h4 className="text-xs font-bold text-white drop-shadow truncate">
                      {nb.title}
                    </h4>
                  </div>
                </div>

                {/* Title under card with dropdown option */}
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

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuNotebookId(isMenuOpen ? null : nb.id)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#1b1e28] border border-slate-700 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuNotebookId(null);
                            onExportPdfDirect(nb);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 text-left"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-400" /> Esporta PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuNotebookId(null);
                            onDuplicateNotebook(nb.id);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 text-left"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" /> Duplica
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuNotebookId(null);
                            setMoveModalNotebookId(nb.id);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700 text-left"
                        >
                          <FolderInput className="w-3.5 h-3.5 text-amber-400" /> Sposta in cartella
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuNotebookId(null);
                            if (confirm(`Eliminare "${nb.title}"?`)) {
                              onDeleteNotebook(nb.id);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Elimina
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Banner (styled after screenshot 2 footer) */}
      <footer className="fixed bottom-0 left-0 right-0 lg:left-64 bg-[#14161d] border-t border-[#1e2129] px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-300">
            Supporto Apple Pencil attivo • Tap con 2 dita per Annulla • Sincronizzazione Google Drive disponibile.
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSyncModal}
          className="px-4 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white text-xs font-semibold rounded-lg shadow-md transition-all shrink-0"
        >
          Memoria Cloud
        </button>
      </footer>

      {/* Move to folder modal */}
      {moveModalNotebookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Sposta in cartella</h3>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onMoveNotebook(moveModalNotebookId, null);
                  setMoveModalNotebookId(null);
                }}
                className="px-3 py-2 text-xs rounded-xl text-left bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Nessuna cartella (Principale)
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onMoveNotebook(moveModalNotebookId, f.id);
                    setMoveModalNotebookId(null);
                  }}
                  className="px-3 py-2 text-xs rounded-xl text-left bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
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
