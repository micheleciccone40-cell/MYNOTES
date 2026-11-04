import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, File, BookOpen, AlertCircle, Loader2, Sparkles, HelpCircle, Share2, CheckCircle2 } from 'lucide-react';
import { importAnyDocument, type ImportResult } from '../services/documentImporter';
import { pdfBookManager } from '../services/pdfBookManager';
import type { Notebook } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
  onImportBookComplete?: (bookNotebook: Notebook) => void;
  initialMode?: 'book' | 'convert';
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  onImportBookComplete,
  initialMode = 'book'
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'convert'>(initialMode);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPagesGuideOpen, setIsPagesGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStatus('Lettura file in corso...');

    try {
      if (activeTab === 'book') {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          throw new Error("Per la modalità Libro Fedele, seleziona un file in formato PDF (.pdf).");
        }

        setProgressStatus(`Apertura ${file.name}...`);
        const bookNotebook = await pdfBookManager.importBook(
          file,
          null,
          (percent, current, total) => {
            setProgressPercent(percent);
            if (total > 0) {
              setProgressStatus(`Elaborazione libro: ${current} di ${total} pagine...`);
            }
          }
        );

        if (onImportBookComplete) {
          onImportBookComplete(bookNotebook);
        }
        onClose();
      } else {
        setProgressStatus('Estrazione testo Word e formattazione...');
        const result = await importAnyDocument(file);
        onImportComplete(result);
        onClose();
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || "Errore durante l'importazione del file.");
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-[#18191e] border border-[#2c2d36] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262730] bg-[#141519]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              activeTab === 'book' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#007aff]/15 text-[#0a84ff]'
            }`}>
              {activeTab === 'book' ? <BookOpen className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">
                {activeTab === 'book' ? 'Importa Libro (PDF Fedele)' : 'Importa Documento Word'}
              </h3>
              <p className="text-xs text-slate-400">
                {activeTab === 'book' 
                  ? 'Layout originale 100% inalterato • Evidenziatore, Apple Pencil e note'
                  : 'PDF, Word (.docx), Apple Pages (.pages), Immagini'}
              </p>
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

        {/* Tab Selector: Libro Fedele vs Conversione Word */}
        <div className="flex border-b border-[#242630] bg-[#131418] px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'book'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Libro / PDF Fedele (Consigliato)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('convert')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'convert'
                ? 'border-[#007aff] text-[#0a84ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Converti in Testo Word</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Info Banner for Book Mode */}
          {activeTab === 'book' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-white block">Nessuna conversione o alterazione:</span>
                I libri e i manuali (come saggi, riviste o dispense universitarie) mantengono al 100% la grafica, le foto, le formule e l'impaginazione originale. Ideale per studiare ed evidenziare con Apple Pencil.
              </div>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : activeTab === 'book'
                ? 'border-[#2d3a33] bg-[#161d19] hover:bg-[#1a251f] hover:border-emerald-500/60'
                : 'border-[#33353e] bg-[#1d1f26] hover:bg-[#22242d] hover:border-[#007aff]/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={activeTab === 'book' ? '.pdf,application/pdf' : '.pdf,.docx,.pages,image/*,application/pdf'}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-2 w-full max-w-xs">
                <Loader2 className={`w-9 h-9 animate-spin ${activeTab === 'book' ? 'text-emerald-400' : 'text-[#007aff]'}`} />
                <span className="text-sm font-semibold text-slate-200">
                  {progressStatus || 'Importazione in corso...'}
                </span>
                {progressPercent > 0 && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${activeTab === 'book' ? 'bg-emerald-500' : 'bg-[#007aff]'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
                <span className="text-xs text-slate-400">
                  {activeTab === 'book'
                    ? 'Preparazione pagine ad alta risoluzione senza alterare il layout'
                    : 'Estrazione testo Word e formattazione'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                  activeTab === 'book' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#007aff]/15 text-[#0a84ff]'
                }`}>
                  {activeTab === 'book' ? <BookOpen className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">
                    {activeTab === 'book'
                      ? 'Tocca per selezionare il libro PDF dal tuo iPad o trascina qui'
                      : 'Tocca per selezionare documento o trascina qui'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {activeTab === 'book'
                      ? 'Supporta anche libri di centinaia di pagine (apertura immediata in meno di 1 secondo)'
                      : 'I documenti vengono convertiti in pagine Word modificabili'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Formats Supported Badges */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className={`p-3 rounded-2xl border flex flex-col gap-1 ${
              activeTab === 'book' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#1d1f26] border-[#2a2c36]'
            }`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <BookOpen className="w-4 h-4" /> Libri & Saggi
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Layout originale al 100%, pronto per evidenziare e annotare.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#1d1f26] border border-[#2a2c36] flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0a84ff]">
                <File className="w-4 h-4" /> Word (.docx)
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Impaginazione testo Word editabile con margini.
              </p>
            </div>

            <div
              onClick={() => setIsPagesGuideOpen(!isPagesGuideOpen)}
              className="p-3 rounded-2xl bg-[#1d1f26] border border-[#2a2c36] hover:border-amber-500/50 cursor-pointer flex flex-col gap-1 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Sparkles className="w-4 h-4" /> Apple Pages
                </div>
                <HelpCircle className="w-3.5 h-3.5 text-amber-400/80" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Tocca per guida esportazione veloce da Pages.
              </p>
            </div>
          </div>

          {/* Pages iPad Export Instructions Box */}
          {(errorMessage || isPagesGuideOpen) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Come esportare velocemente da Apple Pages in PDF su iPad:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                <li>Apri il documento nell'app <b>Pages</b> del tuo iPad.</li>
                <li>Tocca in alto il pulsante <b>Condividi</b> (o il titolo del file).</li>
                <li>Seleziona <b>Esporta</b> &gt; <b>PDF</b> e tocca <i>Salva su File</i>.</li>
                <li>Riapri questa finestra e seleziona il PDF appena salvato!</li>
              </ol>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !errorMessage.includes('Pages') && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
