import React from 'react';
import {
  Folder as FolderIcon,
  FolderPlus,
  Star,
  Users,
  Cloud,
  CheckCircle2,
  Trash2,
  Edit2,
  MoreVertical,
  X,
  PanelLeft,
  FileUp
} from 'lucide-react';
import type { Folder, SyncStatus } from '../types';

interface SidebarProps {
  folders: Folder[];
  selectedFolderId: string | 'all' | 'favorites' | 'shared' | 'trash';
  counts: { [key: string]: number };
  syncStatus: SyncStatus;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSelectFolder: (id: string | 'all' | 'favorites' | 'shared' | 'trash') => void;
  onCreateFolderClick: () => void;
  onEditFolderClick: (folder: Folder) => void;
  onDeleteFolderClick: (folderId: string) => void;
  onOpenSyncModal: () => void;
  onOpenImportModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  selectedFolderId,
  counts,
  syncStatus,
  isOpenMobile,
  onCloseMobile,
  onSelectFolder,
  onCreateFolderClick,
  onEditFolderClick,
  onDeleteFolderClick,
  onOpenSyncModal,
  onOpenImportModal
}) => {
  const [activeFolderMenuId, setActiveFolderMenuId] = React.useState<string | null>(null);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-[#121317] border-r border-[#1e2027] flex flex-col transition-transform duration-300 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header: Sidebar toggle & Goodnotes Logo (identical to iPad Goodnotes screenshot) */}
        <div className="p-4 flex items-center justify-between border-b border-[#1c1e26]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Barra laterale"
            >
              <PanelLeft className="w-5 h-5 text-slate-300" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              Goodnotes
            </h1>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Goodnotes Main Navigation items */}
        <div className="px-3 py-3 flex flex-col gap-1">
          {/* Documenti (Active Blue Pill) */}
          <button
            type="button"
            onClick={() => { onSelectFolder('all'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedFolderId === 'all'
                ? 'bg-[#1d4ed8] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#1a1c23] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderIcon className={`w-5 h-5 ${selectedFolderId === 'all' ? 'fill-white text-white' : 'text-slate-400'}`} />
              <span>Documenti</span>
            </div>
            <span className={`text-xs ${selectedFolderId === 'all' ? 'text-blue-100 font-bold' : 'text-slate-400'}`}>
              {counts['all'] || 0}
            </span>
          </button>

          {/* Preferiti */}
          <button
            type="button"
            onClick={() => { onSelectFolder('favorites'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selectedFolderId === 'favorites'
                ? 'bg-[#1d4ed8] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#1a1c23] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-slate-400" />
              <span>Preferiti</span>
            </div>
            <span className="text-xs text-slate-400">{counts['favorites'] || 0}</span>
          </button>

          {/* Condivisi */}
          <button
            type="button"
            onClick={() => { onSelectFolder('shared'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selectedFolderId === 'shared'
                ? 'bg-[#1d4ed8] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#1a1c23] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <span>Condivisi</span>
            </div>
          </button>

          {/* Cestino (Trash) */}
          <button
            type="button"
            onClick={() => { onSelectFolder('trash'); onCloseMobile(); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selectedFolderId === 'trash'
                ? 'bg-[#1d4ed8] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#1a1c23] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-slate-400" />
              <span>Cestino</span>
            </div>
            {(counts['trash'] || 0) > 0 && (
              <span className="text-xs text-rose-400 font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10">
                {counts['trash']}
              </span>
            )}
          </button>
        </div>

        {/* Folders Section */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 border-t border-[#1e2027]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Cartelle
            </span>
            <button
              type="button"
              onClick={onCreateFolderClick}
              className="p-1 rounded text-slate-400 hover:text-[#007aff] hover:bg-[#1a1c23] transition-colors"
              title="Nuova cartella"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const count = counts[folder.id] || 0;

            return (
              <div key={folder.id} className="relative group">
                <button
                  type="button"
                  onClick={() => { onSelectFolder(folder.id); onCloseMobile(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#1d4ed8] text-white shadow-md'
                      : 'text-slate-300 hover:bg-[#1a1c23] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FolderIcon
                      className="w-4 h-4 shrink-0 fill-current"
                      style={{ color: isSelected ? '#ffffff' : (folder.color || '#70b1ff') }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[11px] ${isSelected ? 'text-blue-100 font-bold' : 'text-slate-400'}`}>
                      {count}
                    </span>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>

                {activeFolderMenuId === folder.id && (
                  <div className="absolute right-2 top-full mt-1 bg-[#1a1d26] border border-[#2c2f3a] rounded-xl shadow-xl p-1 z-50 flex flex-col gap-0.5 text-xs w-36">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFolderMenuId(null);
                        onEditFolderClick(folder);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-white/10 text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#0a84ff]" /> Rinomina
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFolderMenuId(null);
                        if (confirm(`Eliminare la cartella "${folder.name}"?`)) {
                          onDeleteFolderClick(folder.id);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Elimina
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cloud Sync & Import Document Footer */}
        <div className="p-3 border-t border-[#1e2027] flex flex-col gap-2 bg-[#0e1014]">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#1a1c23] hover:bg-[#22242e] text-white text-xs font-semibold transition-all border border-[#262833]"
          >
            <FileUp className="w-4 h-4 text-[#0a84ff]" />
            <span>Importa Documento (PDF)</span>
          </button>

          <button
            type="button"
            onClick={onOpenSyncModal}
            className="w-full p-2.5 rounded-xl bg-[#14151b] border border-[#22242e] hover:border-[#2e313f] flex items-center justify-between text-left transition-all"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#0a84ff]" />
              <span className="text-xs text-slate-300 font-medium">Google Drive</span>
            </div>
            {syncStatus.isConnected ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-emerald-400 font-medium">Sincronizzato</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <span className="text-[10px] text-[#0a84ff] font-semibold">Connetti</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
