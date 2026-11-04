import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Image as ImageIcon,
  ChevronDown,
  Grid3X3,
  FileDown,
  ArrowLeft,
  ShieldCheck,
  Hand,
  Plus
} from 'lucide-react';
import type { ToolType, PaperTemplate } from '../types';

interface ToolbarProps {
  title: string;
  currentPageIndex?: number;
  totalPages: number;
  paperTemplate: PaperTemplate;
  activeTool: ToolType;
  strokeColor: string;
  strokeSize: number;
  applePencilOnly: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isExportingPdf?: boolean;
  onChangeTitle: (title: string) => void;
  onSelectTool: (tool: ToolType) => void;
  onChangeColor: (color: string) => void;
  onChangeSize: (size: number) => void;
  onToggleApplePencilOnly: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onAddPage: () => void;
  onChangePaperTemplate: (template: PaperTemplate) => void;
  onInsertImage: (file: File) => void;
  onExportPdf: () => void;
  onBackToLibrary: () => void;
  // Word text formatting commands
  onExecTextCommand: (command: string, value?: string) => void;
  currentFontSizePx: number;
  onChangeFontSizePx: (sizePx: number) => void;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40];

export const HIGHLIGHTER_PASTEL_COLORS = [
  { color: '#fde047', label: 'Giallo Pastello (Default)' },
  { color: '#86efac', label: 'Verde Menta Pastello' },
  { color: '#7dd3fc', label: 'Azzurro Pastello' },
  { color: '#f9a8d4', label: 'Rosa Pastello' },
  { color: '#d8b4fe', label: 'Lilla Pastello' },
  { color: '#fed7aa', label: 'Albicocca Pastello' },
];

export const PEN_COLORS = [
  { color: '#0f172a', label: 'Nero Grafite' },
  { color: '#1d4ed8', label: 'Blu Notte' },
  { color: '#b91c1c', label: 'Rosso Scuro' },
  { color: '#15803d', label: 'Verde Bosco' },
  { color: '#475569', label: 'Grigio Medio' },
];

const FORMAL_TEXT_COLORS = [
  '#0f172a', // Nero Grafite
  '#334155', // Ardesia Scuro
  '#1e40af', // Blu Notte Istituzionale
  '#166534', // Verde Bosco Formale
  '#991b1b', // Rosso Scuro
  '#854d0e', // Ambra / Cuoio
  '#475569', // Grigio Medio
];

export const Toolbar: React.FC<ToolbarProps> = ({
  title,
  totalPages,
  paperTemplate,
  activeTool,
  strokeColor,
  strokeSize,
  applePencilOnly,
  canUndo,
  canRedo,
  isExportingPdf,
  onChangeTitle,
  onSelectTool,
  onChangeColor,
  onChangeSize,
  onToggleApplePencilOnly,
  onUndo,
  onRedo,
  onAddPage,
  onChangePaperTemplate,
  onInsertImage,
  onExportPdf,
  onBackToLibrary,
  onExecTextCommand,
  currentFontSizePx,
  onChangeFontSizePx,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'pencil'>('text');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onChangeTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onInsertImage(e.target.files[0]);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#16171d] border-b border-[#262833] text-slate-200 select-none shadow-md">
      {/* 1. Top Bar: Back, Document Title, View Mode Switcher, Actions */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#232530] text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#20222a] hover:bg-[#2b2d38] text-slate-300 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Documenti</span>
          </button>

          {/* Editable Document Title */}
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="px-2.5 py-1 bg-[#20222a] border border-blue-500 rounded-lg text-white font-semibold text-xs focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempTitle(title);
                setIsEditingTitle(true);
              }}
              className="font-semibold text-white hover:text-blue-400 px-2 py-1 rounded-md hover:bg-[#20222a] transition-colors truncate max-w-[200px] sm:max-w-[320px] text-left"
              title="Rinomina documento"
            >
              {title}
            </button>
          )}

          {/* Segmented Mode: Word Formatting vs Apple Pencil */}
          <div className="flex items-center bg-[#0e0f13] p-0.5 rounded-xl border border-[#262833]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('text');
                onSelectTool('text');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'text'
                  ? 'bg-[#252834] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Testo & Word
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('pencil');
                if (activeTool === 'text') onSelectTool('pen');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'pencil'
                  ? 'bg-[#252834] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Apple Pencil
            </button>
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2">
          {/* Paper Template Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#20222a] hover:bg-[#2b2d38] text-slate-300 rounded-lg transition-colors"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline capitalize">
                {paperTemplate === 'blank' ? 'Bianco (Word)' : paperTemplate === 'ruled' ? 'A Righe' : paperTemplate === 'grid' ? 'A Quadretti' : 'Puntini'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showTemplateMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#1e2029] border border-[#2d303e] rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => { onChangePaperTemplate('blank'); setShowTemplateMenu(false); }}
                  className={`px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'blank' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#282b37]'}`}
                >
                  Bianco (Standard Word)
                </button>
                <button
                  type="button"
                  onClick={() => { onChangePaperTemplate('ruled'); setShowTemplateMenu(false); }}
                  className={`px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'ruled' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#282b37]'}`}
                >
                  A Righe
                </button>
                <button
                  type="button"
                  onClick={() => { onChangePaperTemplate('grid'); setShowTemplateMenu(false); }}
                  className={`px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'grid' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#282b37]'}`}
                >
                  A Quadretti
                </button>
                <button
                  type="button"
                  onClick={() => { onChangePaperTemplate('dots'); setShowTemplateMenu(false); }}
                  className={`px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'dots' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-[#282b37]'}`}
                >
                  A Puntini
                </button>
              </div>
            )}
          </div>

          {/* Total Pages Count & Add Page (Continuous Scroll indicator) */}
          <div className="flex items-center bg-[#20222a] rounded-lg px-2.5 py-1 gap-2 text-xs text-slate-300 border border-[#2d303e]">
            <span className="text-[11px] font-medium text-slate-400">
              {totalPages} {totalPages === 1 ? 'pagina' : 'pagine'}
            </span>
            <button
              type="button"
              onClick={onAddPage}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-xs"
              title="Aggiungi pagina in fondo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pagina</span>
            </button>
          </div>

          {/* Export PDF */}
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded-lg font-semibold transition-all shadow-sm"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExportingPdf ? 'Esporto...' : 'Esporta PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Word-Style Ribbon Toolbar */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 bg-[#13141a]">
        {activeTab === 'text' ? (
          /* WORD RICH TEXT FORMATTING CONTROLS */
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Font Family */}
            <select
              onChange={(e) => onExecTextCommand('fontName', e.target.value)}
              defaultValue="system-ui"
              className="px-2.5 py-1 bg-[#1e2029] border border-[#2d303e] rounded-lg text-slate-200 text-xs focus:outline-none"
            >
              <option value="system-ui">San Francisco (Predefinito)</option>
              <option value="Georgia, serif">Georgia (Elegante Classico)</option>
              <option value="'Times New Roman', serif">Times New Roman (Formale)</option>
              <option value="'Courier New', monospace">Courier (Monospace)</option>
            </select>

            {/* Font Size in PX */}
            <div className="flex items-center gap-1 bg-[#1e2029] border border-[#2d303e] rounded-lg px-2 py-0.5">
              <span className="text-[11px] text-slate-400">Dimensione:</span>
              <select
                value={currentFontSizePx}
                onChange={(e) => onChangeFontSizePx(Number(e.target.value))}
                className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
              >
                {FONT_SIZES.map((sz) => (
                  <option key={sz} value={sz} className="bg-[#1e2029] text-white">
                    {sz} px
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-[1px] bg-[#282b36] mx-1" />

            {/* B, I, U, S */}
            <div className="flex items-center bg-[#1e2029] rounded-lg p-0.5 border border-[#2d303e]">
              <button
                type="button"
                onClick={() => onExecTextCommand('bold')}
                className="px-2 py-1 rounded hover:bg-[#2a2d3b] text-white font-bold"
                title="Grassetto (Cmd+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExecTextCommand('italic')}
                className="px-2 py-1 rounded hover:bg-[#2a2d3b] text-white italic"
                title="Corsivo (Cmd+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExecTextCommand('underline')}
                className="px-2 py-1 rounded hover:bg-[#2a2d3b] text-white underline"
                title="Sottolineato (Cmd+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExecTextCommand('strikeThrough')}
                className="px-2 py-1 rounded hover:bg-[#2a2d3b] text-white line-through"
                title="Barrato"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#282b36] mx-1" />

            {/* Alignment */}
            <div className="flex items-center bg-[#1e2029] rounded-lg p-0.5 border border-[#2d303e]">
              <button
                type="button"
                onClick={() => onExecTextCommand('justifyLeft')}
                className="p-1 rounded hover:bg-[#2a2d3b] text-slate-300 hover:text-white"
                title="Allinea a sinistra"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExecTextCommand('justifyCenter')}
                className="p-1 rounded hover:bg-[#2a2d3b] text-slate-300 hover:text-white"
                title="Allinea al centro"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExecTextCommand('justifyRight')}
                className="p-1 rounded hover:bg-[#2a2d3b] text-slate-300 hover:text-white"
                title="Allinea a destra"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bullets & Lists */}
            <div className="flex items-center bg-[#1e2029] rounded-lg p-0.5 border border-[#2d303e]">
              <button
                type="button"
                onClick={() => onExecTextCommand('insertUnorderedList')}
                className="p-1 rounded hover:bg-[#2a2d3b] text-slate-300 hover:text-white"
                title="Elenco puntato"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExecTextCommand('insertOrderedList')}
                className="p-1 rounded hover:bg-[#2a2d3b] text-slate-300 hover:text-white"
                title="Elenco numerato"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Formal Text Colors */}
            <div className="flex items-center gap-1 pl-1">
              {FORMAL_TEXT_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onExecTextCommand('foreColor', col)}
                  className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform"
                  style={{ backgroundColor: col }}
                  title="Colore testo"
                />
              ))}
            </div>

            {/* Freeform Image Inserter Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#20222a] hover:bg-[#2b2d38] text-blue-400 font-semibold rounded-lg border border-[#2d303e] transition-colors ml-2"
              title="Inserisci foto libera e spostala ovunque sul foglio"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Inserisci Foto</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        ) : (
          /* APPLE PENCIL DRAWING TOOLS */
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Pen Tool */}
            <button
              type="button"
              onClick={() => onSelectTool('pen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTool === 'pen'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#1e2029] text-slate-300 hover:bg-[#282b37]'
              }`}
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Penna Fluida</span>
            </button>

            {/* Highlighter */}
            <button
              type="button"
              onClick={() => onSelectTool('highlighter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-[#fde047] text-slate-900 font-semibold shadow-sm'
                  : 'bg-[#1e2029] text-slate-300 hover:bg-[#282b37]'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Evidenziatore</span>
            </button>

            {/* Eraser */}
            <button
              type="button"
              onClick={() => onSelectTool('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-[#1e2029] text-slate-300 hover:bg-[#282b37]'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Gomma a Tratto</span>
            </button>

            <div className="h-4 w-[1px] bg-[#282b36] mx-1" />

            {/* Contextual Color Palette (Pastels for Highlighter, Classic for Pen) */}
            {activeTool === 'highlighter' ? (
              <div className="flex items-center gap-1.5 bg-[#181a22] px-2 py-1 rounded-xl border border-[#2d303e]">
                <span className="text-[10px] text-amber-300/80 font-medium mr-0.5">Pastello:</span>
                {HIGHLIGHTER_PASTEL_COLORS.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => onChangeColor(item.color)}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                      strokeColor.toLowerCase() === item.color.toLowerCase()
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-110 border-white'
                        : 'border-black/30'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#181a22] px-2 py-1 rounded-xl border border-[#2d303e]">
                {PEN_COLORS.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => onChangeColor(item.color)}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                      strokeColor.toLowerCase() === item.color.toLowerCase()
                        ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-black scale-110 border-white'
                        : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  />
                ))}
              </div>
            )}

            {/* Stroke Thickness (Contextual: 14/20/28px for Highlighter, 2/4/6px for Pen) */}
            <div className="flex items-center gap-1 bg-[#1e2029] rounded-lg p-1 border border-[#2d303e]">
              {(activeTool === 'highlighter' ? [14, 20, 28] : [2, 4, 6]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeSize(sz)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded flex items-center justify-center transition-colors ${
                    strokeSize === sz ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Spessore ${sz}px`}
                >
                  {sz}px
                </button>
              ))}
            </div>

            {/* Palm Rejection Toggle */}
            <button
              type="button"
              onClick={onToggleApplePencilOnly}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ml-1 ${
                applePencilOnly
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#1e2029] text-slate-400 hover:text-slate-200'
              }`}
              title="Solo Apple Pencil: appoggia il palmo senza disegnare con le dita"
            >
              {applePencilOnly ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Palm Rejection Attiva</span>
                </>
              ) : (
                <>
                  <Hand className="w-3.5 h-3.5" />
                  <span>Dita + Pencil</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Global Undo & Redo Shortcuts in Ribbon */}
        <div className="flex items-center gap-1 bg-[#1e2029] rounded-lg p-0.5 border border-[#2d303e]">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#282b37] disabled:opacity-30 disabled:cursor-not-allowed"
            title="Annulla (Tap 2 Dita o Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-[#282b37] disabled:opacity-30 disabled:cursor-not-allowed"
            title="Ripristina (Tap 3 Dita o Cmd+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
