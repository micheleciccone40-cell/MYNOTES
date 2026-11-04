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
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { syncService, DEFAULT_GOOGLE_CLIENT_ID } from '../services/googleDrive';
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
  const [clientId, setClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
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
    setClientId(id || DEFAULT_GOOGLE_CLIENT_ID);
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
      setActionSuccessMsg('Documenti e cartelle salvati con successo su Google Drive!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      await loadStatus();
    }
  };

  const handlePullFromDrive = async () => {
    if (!confirm("Scaricare i dati da Google Drive unirà e aggiornerà i tuoi documenti locali con quelli salvati nel Cloud. Vuoi procedere?")) {
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
      setActionSuccessMsg(`Backup importato! ${count} documenti caricati nella libreria.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Errore durante l'importazione del backup");
    }
  };

  const isAccessingViaRawIp = typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-[#18191e] border border-[#2c2d36] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262730] bg-[#141519]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#007aff]/15 text-[#0a84ff] flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">Sincronizzazione & Archiviazione</h3>
              <p className="text-xs text-slate-400">Salvataggio automatico oltre la memoria locale tra iPad, PC e iPhone</p>
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

        {/* Tab switcher */}
        <div className="flex border-b border-[#262730] px-6 pt-2 bg-[#121316]">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'cloud'
                ? 'border-[#007aff] text-[#0a84ff]'
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
                ? 'border-[#007aff] text-[#0a84ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Backup File Locale (.padnotes)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 text-sm">
          {actionSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Raw IP Warning for Google OAuth */}
          {isAccessingViaRawIp && activeTab === 'cloud' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block text-amber-300 mb-0.5">Nota importante per l'accesso da iPad:</span>
                Google per sicurezza rifiuta gli indirizzi IP numerici (come <code>{window.location.hostname}</code>).
                Per collegare Google Drive con successo, accedi dal link HTTPS Vercel:{' '}
                <a
                  href="https://mynotessss-ko3s9cq97-michele-s-projects9.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline text-[#0a84ff]"
                >
                  mynotessss-ko3s9cq97-michele-s-projects9.vercel.app
                </a>.
              </div>
            </div>
          )}

          {syncStatus.error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block mb-0.5">Avviso Google OAuth:</span>
                <span>{syncStatus.error}</span>
              </div>
            </div>
          )}

          {activeTab === 'cloud' ? (
            <div className="flex flex-col gap-4">
              {/* Status Card */}
              <div className="p-4 rounded-2xl bg-[#1d1f26] border border-[#2c2f3a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
                  <div>
                    <span className="font-semibold text-white text-sm block">
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
                  <div className="flex items-center gap-1.5 text-xs text-[#0a84ff] font-medium">
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
                  className="p-3.5 rounded-2xl bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  <span>Salva su Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromDrive}
                  disabled={syncStatus.isSyncing}
                  className="p-3.5 rounded-2xl bg-[#242630] hover:bg-[#2c2e3a] active:scale-95 text-slate-200 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 border border-[#343746] transition-all disabled:opacity-50"
                >
                  <Download className="w-5 h-5 text-[#0a84ff]" />
                  <span>Scarica da Google Drive</span>
                </button>
              </div>

              {/* Two Essential Setup Checklist Tips */}
              <div className="p-4 rounded-2xl bg-[#1d1f26] border border-[#2c2f3a] flex flex-col gap-2.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Info className="w-4 h-4 text-[#0a84ff]" />
                  <span>Guida Configurazione Google Cloud (Solo 2 passaggi):</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 pl-1 list-disc list-inside leading-relaxed">
                  <li>
                    <b>Utenti di Prova (Test Users):</b> Nella schermata di consenso OAuth su Google Cloud, aggiungi la tua email Google personale sotto <i>"Utenti di prova"</i>. Senza questo passaggio Google mostrerà errore 403.
                  </li>
                  <li>
                    <b>Origini JavaScript Autorizzate:</b> Nel tuo ID Client Web, assicurati che ci sia <code>https://mynotessss-ko3s9cq97-michele-s-projects9.vercel.app</code> e <code>http://localhost:5173</code>.
                  </li>
                </ul>
              </div>

              {/* Client ID Configuration Section */}
              <div className="pt-2 border-t border-[#262730] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#0a84ff]" /> ID Client Google OAuth
                  </label>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#0a84ff] hover:underline flex items-center gap-1"
                  >
                    Console Google Cloud <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="es. 123456789-abcdef.apps.googleusercontent.com"
                    className="flex-1 px-3 py-2 bg-[#1d1f26] border border-[#33353e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#007aff]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveClientId}
                    disabled={isSavingClientId}
                    className="px-4 py-2 bg-[#252834] hover:bg-[#2e3242] text-xs font-semibold text-white rounded-xl border border-[#373a4a] transition-colors"
                  >
                    Salva ID
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-[#1d1f26] border border-[#2c2f3a]">
                <h4 className="text-xs font-semibold text-white mb-1">Trasferimento Diretto tra Dispositivi (100% Offline)</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Puoi esportare in qualsiasi momento un unico file di backup compatto <code className="text-[#0a84ff]">.padnotes</code> contenente tutte le cartelle, documenti Word, tratti a penna e immagini, e importarlo con 1 tocco su iPad, PC o iPhone tramite AirDrop, Telegram, iCloud Drive o chiavetta USB.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportLocal}
                  className="p-4 rounded-2xl bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold text-xs flex flex-col items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-6 h-6" />
                  <span>Scarica File Backup (.padnotes)</span>
                </button>

                <label className="p-4 rounded-2xl bg-[#242630] hover:bg-[#2c2e3a] text-slate-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 border border-[#343746] cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-[#0a84ff]" />
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
