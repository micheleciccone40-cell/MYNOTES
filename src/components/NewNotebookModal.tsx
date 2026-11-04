import React, { useState } from 'react';
import { X, BookPlus, Grid3X3, List, Sparkles } from 'lucide-react';
import type { PaperTemplate, Folder } from '../types';

interface NewNotebookModalProps {
  isOpen: boolean;
  folders: Folder[];
  currentFolderId: string | 'all' | 'favorites' | 'recent';
  onClose: () => void;
  onCreate: (title: string, template: PaperTemplate, coverColor: string, folderId: string | null) => void;
}

const COVER_COLORS = [
  '#4f46e5', // Indigo
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#334155', // Obsidian slate
];

const TEMPLATES: { id: PaperTemplate; name: string; icon: any }[] = [
  { id: 'ruled', name: 'A Righe', icon: List },
  { id: 'grid', name: 'A Quadretti', icon: Grid3X3 },
  { id: 'dots', name: 'A Puntini', icon: Sparkles },
  { id: 'blank', name: 'Bianco', icon: Sparkles },
  { id: 'dark-ruled', name: 'Dark Righe', icon: List },
  { id: 'dark-grid', name: 'Dark Quadretti', icon: Grid3X3 },
];

export const NewNotebookModal: React.FC<NewNotebookModalProps> = ({
  isOpen,
  folders,
  currentFolderId,
  onClose,
  onCreate
}) => {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<PaperTemplate>('ruled');
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const defaultFolder = ['all', 'favorites', 'recent'].includes(currentFolderId) ? null : (currentFolderId as string);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolder);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim(), template, coverColor, selectedFolderId);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <BookPlus className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Nuovo Taccuino</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Titolo del Taccuino
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Appunti Diritto Privato, Idee Progetto..."
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tipo di Foglio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = template === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setTemplate(tmpl.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-semibold shadow-sm'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tmpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Colore Copertina
            </label>
            <div className="flex items-center gap-2.5">
              {COVER_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setCoverColor(col)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    coverColor === col ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : ''
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {folders.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Salva nella Cartella
              </label>
              <select
                value={selectedFolderId || ''}
                onChange={(e) => setSelectedFolderId(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Nessuna cartella (Principale)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition-all"
            >
              Crea Taccuino
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
