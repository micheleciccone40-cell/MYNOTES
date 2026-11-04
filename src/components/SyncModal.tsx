import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Upload,
  Download,
  AlertCircle,
  HardDrive,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { syncService } from '../services/googleDrive';
import type { SyncStatus } from '../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onRefreshData
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: null
  });
  const [clientId, setClientId] = useState('');
  const [isSavingClientId, setIsSavingClientId] = useState(false);
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    const status = await syncService.getSyncMetadata();
    const id = await syncService.getClientId();
    setSyncStatus(status);
    setClientId(id);
  };

  if (!isOpen) return null;

  const handleSaveClientId = async () => {
    setIsSavingClientId(true);
    try {
      await syncService.setClientId(clientId);
      setActionSuccessMsg('Client ID salvato con successo!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingClientId(false);
    }
  };

  const handlePushToDrive = async () => {
    try {
      setActionSuccessMsg(null);
      await syncService.syncToGoogleDrive();
      await loadStatus();
      setActionSuccessMsg('Taccuini e cartelle salvati con successo su Google Drive!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      await loadStatus();
    }
  };

  const handlePullFromDrive = async () => {
    if (!confirm("Scaricare i dati da Google Drive unirà e aggiornerà i tuoi taccuini locali con quelli del Cloud. Vuoi procedere?")) {
      return;
    }
    try {
      setActionSuccessMsg(null);
      await syncService.restoreFromGoogleDrive();
      await loadStatus();
      onRefreshData();
      setActionSuccessMsg('Dati ripristinati da Google Drive con successo!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      await loadStatus();
    }
  };

  const handleExportLocal = async () => {
    await syncService.exportLocalBackup();
  };

  const handleImportLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await syncService.importLocalBackup(file);
      onRefreshData();
      setActionSuccessMsg(`Backup importato! ${count} taccuini caricati nella libreria.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Errore durante l\'importazione del backup');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Sincronizzazione & Archiviazione</h3>
              <p className="text-xs text-slate-400">Salvataggio oltre la memoria locale tra iPad, PC e iPhone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'cloud'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" /> Google Drive Cloud
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'local'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Backup File Locale (.padnotes)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-sm">
          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {syncStatus.error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{syncStatus.error}</span>
            </div>
          )}

          {activeTab === 'cloud' ? (
            <div className="flex flex-col gap-4">
              {/* Status Card */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
                  <div>
                    <span className="font-semibold text-slate-200 text-sm block">
                      {syncStatus.isConnected ? (syncStatus.userEmail || 'Connesso a Google Drive') : 'In attesa di connessione'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {syncStatus.lastSyncedAt
                        ? `Ultimo sync: ${new Date(syncStatus.lastSyncedAt).toLocaleString('it-IT')}`
                        : 'Nessun salvataggio cloud recente'}
                    </span>
                  </div>
                </div>

                {syncStatus.isSyncing && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In corso...
                  </div>
                )}
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handlePushToDrive}
                  disabled={syncStatus.isSyncing}
                  className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs flex flex-col items-center justify-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  <span>Carica su Google Drive (Push)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromDrive}
                  disabled={syncStatus.isSyncing}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium text-xs flex flex-col items-center justify-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50"
                >
                  <Download className="w-5 h-5 text-indigo-400" />
                  <span>Scarica da Google Drive (Pull)</span>
                </button>
              </div>

              {/* Client ID Configuration Section */}
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Google OAuth Client ID
                  </label>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="es. 123456789-abcdef.apps.googleusercontent.com"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveClientId}
                    disabled={isSavingClientId}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition-colors"
                  >
                    Salva ID
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Per sincronizzare i tuoi file con il tuo spazio privato Google Drive, basta creare un ID client OAuth gratuito (applicazione web) con origine <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">http://localhost:5173</code> o il dominio di pubblicazione.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-200 mb-1">Trasferimento Diretto tra Dispositivi</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Se preferisci non configurare le API Google, puoi esportare in qualsiasi momento un unico file di backup <code className="text-indigo-400">.padnotes</code> contenente tutte le tue cartelle, taccuini, tratti a penna e testi, e importarlo con 1 tocco su PC o iPhone tramite AirDrop, email, Telegram o iCloud Drive.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportLocal}
                  className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex flex-col items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-6 h-6" />
                  <span>Scarica Backup (.padnotes)</span>
                </button>

                <label className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex flex-col items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-indigo-400" />
                  <span>Importa Backup (.padnotes)</span>
                  <input
                    type="file"
                    accept=".padnotes,.json"
                    onChange={handleImportLocal}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
