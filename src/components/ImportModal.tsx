import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, File, Sparkles, AlertCircle, Loader2, Share2, HelpCircle } from 'lucide-react';
import { importAnyDocument, type ImportResult } from '../services/documentImporter';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPagesGuideOpen, setIsPagesGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await importAnyDocument(file);
      onImportComplete(result);
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'Errore durante l\'importazione del file.');
    } finally {
      setIsProcessing(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-[#16181f] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#121318]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">Importa Documento</h3>
              <p className="text-xs text-slate-400">PDF, Word (.docx), Apple Pages (.pages), Immagini</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800/60 hover:border-blue-500/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.pages,image/*,application/pdf"
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
                <span className="text-sm font-semibold text-slate-200">
                  Caricamento e conversione pagine...
                </span>
                <span className="text-xs text-slate-400">
                  Rendering vettoriale per Apple Pencil
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-200 block">
                    Tocca per selezionare il file o trascinalo qui
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Verrà creato un taccuino con tutte le pagine su cui scrivere ed evidenziare
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Formats Supported Badges */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <FileText className="w-4 h-4" /> PDF
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Pagine nitide pronte per Apple Pencil.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                <File className="w-4 h-4" /> Word (.docx)
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Testo impaginato con margini per appunti.
              </p>
            </div>

            <div
              onClick={() => setIsPagesGuideOpen(!isPagesGuideOpen)}
              className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 cursor-pointer flex flex-col gap-1 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Sparkles className="w-4 h-4" /> Pages (.pages)
                </div>
                <HelpCircle className="w-3.5 h-3.5 text-amber-400/80" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Anteprima nativa Apple o esporta in PDF.
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
