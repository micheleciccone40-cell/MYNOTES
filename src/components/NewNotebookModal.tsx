import React, { useState } from 'react';
import { X, FileText, Grid3X3, List, Sparkles } from 'lucide-react';
import type { PaperTemplate, Folder } from '../types';

interface NewNotebookModalProps {
  isOpen: boolean;
  folders: Folder[];
  currentFolderId: string | 'all' | 'favorites' | 'recent';
  onClose: () => void;
  onCreate: (title: string, template: PaperTemplate, coverColor: string, folderId: string | null) => void;
}

const TEMPLATES: { id: PaperTemplate; name: string; desc: string; icon: any }[] = [
  { id: 'blank', name: 'Bianco (Word)', desc: 'Foglio bianco nativo Word', icon: FileText },
  { id: 'ruled', name: 'A Righe', desc: 'Righe universitarie', icon: List },
  { id: 'grid', name: 'A Quadretti', desc: 'Quadretti 5mm per grafici', icon: Grid3X3 },
  { id: 'dots', name: 'A Puntini', desc: 'Bullet journal', icon: Sparkles },
  { id: 'dark-ruled', name: 'Dark Righe', desc: 'Sfondo scuro riposante', icon: List },
  { id: 'dark-grid', name: 'Dark Quadretti', desc: 'Matematica & Ingegneria', icon: Grid3X3 },
];

export const NewNotebookModal: React.FC<NewNotebookModalProps> = ({
  isOpen,
  folders,
  currentFolderId,
  onClose,
  onCreate
}) => {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<PaperTemplate>('blank'); // BLANK WORD DEFAULT
  const defaultFolder = ['all', 'favorites', 'recent'].includes(currentFolderId) ? null : (currentFolderId as string);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolder);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim(), template, '#1e293b', selectedFolderId);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#18191e] border border-[#2c2d36] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262730] bg-[#141519]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#007aff]/15 text-[#0a84ff] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">Nuovo Documento</h3>
              <p className="text-xs text-slate-400">Crea un documento con impaginazione Word</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Titolo del Documento
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Appunti Diritto Privato, Sintesi Esame..."
              className="w-full px-4 py-2.5 bg-[#1d1f26] border border-[#33353e] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#007aff] text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tipo di Foglio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = template === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setTemplate(tmpl.id)}
                    className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#007aff] bg-[#007aff]/15 text-white font-semibold shadow-sm'
                        : 'border-[#2d2f39] bg-[#1d1f26] text-slate-400 hover:bg-[#22242d] hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#007aff] text-white' : 'bg-[#292c36] text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold block text-xs">{tmpl.name}</span>
                      <span className="text-[10px] text-slate-500 leading-tight block">{tmpl.desc}</span>
                    </div>
                  </button>
                );
              })}
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
                className="w-full px-3 py-2 bg-[#1d1f26] border border-[#33353e] rounded-xl text-slate-200 focus:outline-none focus:border-[#007aff]"
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

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#262730] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/5 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 font-semibold text-white bg-[#007aff] hover:bg-[#0062cc] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg transition-all"
            >
              Crea Documento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
