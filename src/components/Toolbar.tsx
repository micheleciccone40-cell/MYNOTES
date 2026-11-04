import React, { useState } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Type,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileDown,
  ArrowLeft,
  Grid3X3,
  List,
  Sparkles,
  Palette,
  ShieldCheck,
  Hand
} from 'lucide-react';
import type { ToolType, PaperTemplate } from '../types';

interface ToolbarProps {
  title: string;
  currentPageIndex: number;
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
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onChangePaperTemplate: (template: PaperTemplate) => void;
  onExportPdf: () => void;
  onBackToLibrary: () => void;
}

const PRESET_COLORS = [
  '#0f172a', // Nero Apple
  '#2563eb', // Blu elettrico
  '#dc2626', // Rosso rubino
  '#16a34a', // Verde bosco
  '#9333ea', // Viola
  '#ea580c', // Arancione
  '#facc15', // Giallo evidenziatore
  '#ec4899', // Rosa acceso
  '#06b6d4', // Ciano
  '#64748b', // Grigio grafite
];

const STROKE_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medio', value: 5 },
  { label: 'Spesso', value: 10 },
  { label: 'Maxi', value: 18 },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  title,
  currentPageIndex,
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
  onPrevPage,
  onNextPage,
  onAddPage,
  onChangePaperTemplate,
  onExportPdf,
  onBackToLibrary,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onChangeTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const isShapeTool = ['line', 'rect', 'circle'].includes(activeTool);

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg">
      {/* 1. Left Section: Back button, Title, Templates */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToLibrary}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg text-sm font-medium transition-all"
          title="Torna alle cartelle"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Libreria</span>
        </button>

        {/* Notebook Title editable */}
        {isEditingTitle ? (
          <input
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="px-2 py-1 text-sm bg-slate-800 border border-indigo-500 rounded text-white focus:outline-none max-w-[200px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempTitle(title);
              setIsEditingTitle(true);
            }}
            className="text-sm font-semibold text-white hover:text-indigo-300 max-w-[180px] md:max-w-[280px] truncate text-left px-2 py-1 rounded hover:bg-slate-800/60"
            title="Tocca per rinominare"
          >
            {title}
          </button>
        )}

        {/* Paper Template Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1"
            title="Cambia motivo carta"
          >
            <Grid3X3 className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline capitalize">{paperTemplate}</span>
          </button>

          {showTemplatePicker && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs">
              <span className="px-2 py-1 text-slate-400 font-semibold uppercase text-[10px]">Stile Carta Chiara</span>
              <button
                type="button"
                onClick={() => { onChangePaperTemplate('ruled'); setShowTemplatePicker(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'ruled' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
              >
                <List className="w-3.5 h-3.5" /> A Righe
              </button>
              <button
                type="button"
                onClick={() => { onChangePaperTemplate('grid'); setShowTemplatePicker(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
              >
                <Grid3X3 className="w-3.5 h-3.5" /> A Quadretti
              </button>
              <button
                type="button"
                onClick={() => { onChangePaperTemplate('dots'); setShowTemplatePicker(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'dots' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> A Puntini
              </button>
              <button
                type="button"
                onClick={() => { onChangePaperTemplate('blank'); setShowTemplatePicker(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'blank' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
              >
                Bianco Liscio
              </button>

              <span className="px-2 pt-2 pb-1 text-slate-400 font-semibold uppercase text-[10px] border-t border-slate-700 mt-1">Stile Carta Scura (OLED)</span>
              <button
                type="button"
                onClick={() => { onChangePaperTemplate('dark-ruled'); setShowTemplatePicker(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'dark-ruled' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
              >
                Dark Righe
              </button>
              <button
                type="button"
                onClick={() => { onChangePaperTemplate('dark-grid'); setShowTemplatePicker(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left ${paperTemplate === 'dark-grid' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
              >
                Dark Quadretti
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Center Section: Main Apple Pencil Tool Rack */}
      <div className="flex items-center bg-slate-800/90 rounded-2xl p-1 border border-slate-700/80 shadow-inner gap-0.5 sm:gap-1">
        {/* Pen */}
        <button
          type="button"
          onClick={() => onSelectTool('pen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeTool === 'pen'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Penna a inchiostro fluido (Apple Pencil)"
        >
          <Pen className="w-4 h-4" />
          <span className="hidden md:inline">Penna</span>
        </button>

        {/* Highlighter */}
        <button
          type="button"
          onClick={() => onSelectTool('highlighter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeTool === 'highlighter'
              ? 'bg-yellow-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Evidenziatore"
        >
          <Highlighter className="w-4 h-4" />
          <span className="hidden md:inline">Evidenziatore</span>
        </button>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => onSelectTool('eraser')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Gomma da cancellare (cancella tratto)"
        >
          <Eraser className="w-4 h-4" />
          <span className="hidden md:inline">Gomma</span>
        </button>

        {/* Text Tool for Bluetooth Keyboard */}
        <button
          type="button"
          onClick={() => onSelectTool('text')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
            activeTool === 'text'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Casella di testo (Tastiera Bluetooth)"
        >
          <Type className="w-4 h-4" />
          <span className="hidden md:inline">Testo</span>
        </button>

        {/* Geometric Shapes */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (isShapeTool) {
                setShowShapesMenu(!showShapesMenu);
              } else {
                onSelectTool('line');
                setShowShapesMenu(!showShapesMenu);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
              isShapeTool
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Forme geometriche (Linea, Rettangolo, Cerchio)"
          >
            {activeTool === 'rect' ? <Square className="w-4 h-4" /> : activeTool === 'circle' ? <Circle className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            <span className="hidden md:inline">Forme</span>
          </button>

          {showShapesMenu && (
            <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-1 w-32 text-xs">
              <button
                type="button"
                onClick={() => { onSelectTool('line'); setShowShapesMenu(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700"
              >
                <Minus className="w-4 h-4" /> Linea
              </button>
              <button
                type="button"
                onClick={() => { onSelectTool('rect'); setShowShapesMenu(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700"
              >
                <Square className="w-4 h-4" /> Rettangolo
              </button>
              <button
                type="button"
                onClick={() => { onSelectTool('circle'); setShowShapesMenu(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-700"
              >
                <Circle className="w-4 h-4" /> Cerchio
              </button>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-slate-700 mx-1" />

        {/* Color Palette & Custom Picker */}
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-6 h-6 rounded-full border-2 border-slate-300 shadow-sm flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: strokeColor }}
            title="Seleziona colore"
          >
            <Palette className="w-3 h-3 text-white drop-shadow" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-3 w-56">
              <span className="text-xs font-semibold text-slate-300">Colori Rapidi</span>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChangeColor(c);
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${strokeColor === c ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">Personalizzato:</span>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stroke Thickness Picker */}
        <div className="flex items-center gap-0.5 ml-1">
          {STROKE_SIZES.map((sz) => (
            <button
              key={sz.value}
              type="button"
              onClick={() => onChangeSize(sz.value)}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                strokeSize === sz.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
              title={`Spessore ${sz.label}`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${Math.min(14, sz.value * 2)}px`, height: `${Math.min(14, sz.value * 2)}px` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* 3. Right Section: Palm Rejection Toggle, Undo/Redo, Pages, Export */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Apple Pencil Palm Rejection Button */}
        <button
          type="button"
          onClick={onToggleApplePencilOnly}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            applePencilOnly
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
          }`}
          title={
            applePencilOnly
              ? 'Palm Rejection ATTIVA: solo l\'Apple Pencil disegna, le dita e il palmo non lasciano segni'
              : 'Palm Rejection disattivata: sia dita che Apple Pencil disegnano'
          }
        >
          {applePencilOnly ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">Solo Pencil</span>
            </>
          ) : (
            <>
              <Hand className="w-4 h-4" />
              <span className="hidden lg:inline">Dita + Pencil</span>
            </>
          )}
        </button>

        {/* Undo & Redo */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded ${canUndo ? 'text-slate-200 hover:bg-slate-700 active:scale-95' : 'text-slate-600 cursor-not-allowed'}`}
            title="Annulla (Ctrl+Z / Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded ${canRedo ? 'text-slate-200 hover:bg-slate-700 active:scale-95' : 'text-slate-600 cursor-not-allowed'}`}
            title="Ripristina (Ctrl+Y / Cmd+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Page Navigation & Add Page */}
        <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 gap-1 text-xs text-slate-300">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={currentPageIndex <= 0}
            className={`p-0.5 rounded ${currentPageIndex > 0 ? 'hover:bg-slate-700 text-slate-200' : 'text-slate-600 cursor-not-allowed'}`}
            title="Pagina precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-semibold">
            {currentPageIndex + 1}/{totalPages}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPageIndex >= totalPages - 1}
            className={`p-0.5 rounded ${currentPageIndex < totalPages - 1 ? 'hover:bg-slate-700 text-slate-200' : 'text-slate-600 cursor-not-allowed'}`}
            title="Pagina successiva"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onAddPage}
            className="ml-1 p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center gap-0.5 text-[11px]"
            title="Aggiungi nuova pagina"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pagina</span>
          </button>
        </div>

        {/* Export PDF Button */}
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExportingPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
          title="Esporta taccuino completo in PDF con tutte le annotazioni"
        >
          <FileDown className="w-4 h-4" />
          <span className="hidden sm:inline">{isExportingPdf ? 'Esporto...' : 'Esporta PDF'}</span>
        </button>
      </div>
    </header>
  );
};
