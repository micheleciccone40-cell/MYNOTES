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
  Info,
  Copy,
  Check,
  Activity
} from 'lucide-react';
import { syncService, DEFAULT_GOOGLE_CLIENT_ID, type DiagnosticResult } from '../services/googleDrive';
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
  const [activeTab, setActiveTab] = useState<'cloud' | 'diagnostic' | 'local'>('cloud');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  // Diagnostic states
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[] | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

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

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

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

  const handleConnectAccount = async () => {
    try {
      setActionSuccessMsg(null);
      await syncService.requestAuthToken();
      await loadStatus();
      setActionSuccessMsg('Account Google collegato con successo!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      await loadStatus();
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

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const results = await syncService.runDiagnostic();
      setDiagnostics(results);
    } finally {
      setIsRunningDiagnostic(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#18191e] border border-[#2c2d36] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262730] bg-[#141519]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#007aff]/15 text-[#0a84ff] flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">Google Drive & Cloud Sync</h3>
              <p className="text-xs text-slate-400">Salvataggio automatico per sincronizzare i tuoi appunti ovunque</p>
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
            <Cloud className="w-4 h-4" /> Google Drive
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('diagnostic');
              if (!diagnostics) handleRunDiagnostic();
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'diagnostic'
                ? 'border-[#007aff] text-[#0a84ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Diagnostica Connessione
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
            <HardDrive className="w-4 h-4" /> File Locale (.padnotes)
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

          {syncStatus.error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block mb-0.5">Avviso Sincronizzazione:</span>
                <span>{syncStatus.error}</span>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
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
                        ? `Ultimo salvataggio: ${new Date(syncStatus.lastSyncedAt).toLocaleString('it-IT')}`
                        : 'Nessun salvataggio cloud recente'}
                    </span>
                  </div>
                </div>

                {!syncStatus.isConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectAccount}
                    className="px-3.5 py-1.5 bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white font-semibold text-xs rounded-xl shadow transition-all"
                  >
                    Connetti Google
                  </button>
                ) : syncStatus.isSyncing ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#0a84ff] font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In corso...
                  </div>
                ) : null}
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

              {/* Crucial Setup Checklist (The 2 things needed in Google Cloud) */}
              <div className="p-4 rounded-2xl bg-[#1d1f26] border border-[#2c2f3a] flex flex-col gap-3 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                  <Info className="w-4 h-4 text-[#0a84ff]" />
                  I 3 passaggi chiave su Google Cloud Console:
                </span>

                {/* 1. Abilita Google Drive API */}
                <div className="p-3 rounded-xl bg-[#14151b] border border-[#252834] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">1. Abilita la Google Drive API</span>
                    <a
                      href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=mynotes-513716"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0a84ff] font-semibold hover:underline flex items-center gap-1"
                    >
                      Abilita ora <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Nei progetti Google Cloud, la Google Drive API è <b>disattivata di default</b>. Clicca sul link e tocca il tasto blu <b>"ABILITA"</b>.
                  </p>
                </div>

                {/* 2. Origini autorizzate */}
                <div className="p-3 rounded-xl bg-[#14151b] border border-[#252834] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">2. Origini JavaScript autorizzate</span>
                    <button
                      type="button"
                      onClick={handleCopyOrigin}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[#252834] hover:bg-[#2e3242] text-[#0a84ff] rounded-lg border border-[#373a4a] transition-colors"
                    >
                      {copiedOrigin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOrigin ? 'Copiato!' : 'Copia'}</span>
                    </button>
                  </div>
                  <div className="bg-[#0e1014] px-2.5 py-1.5 rounded-lg border border-[#22242e] font-mono text-[#0a84ff] text-[11px] select-all">
                    {currentOrigin}
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Nelle credenziali del tuo Client ID, inserisci questo URL esatto (senza barra finale <code>/</code>).
                  </p>
                </div>

                {/* 3. Utenti di prova */}
                <div className="p-3 rounded-xl bg-[#14151b] border border-[#252834] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">3. Utenti di prova (Test Users)</span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials/consent?project=mynotes-513716"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0a84ff] font-semibold hover:underline flex items-center gap-1"
                    >
                      Verifica utenti <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Nella schermata di consenso OAuth, aggiungi la tua email Google personale sotto <b>"Utenti di prova"</b>.
                  </p>
                </div>
              </div>

              {/* Client ID Configuration */}
              <div className="pt-2 border-t border-[#262730] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#0a84ff]" /> ID Client Google OAuth
                  </label>
                  <a
                    href="https://console.cloud.google.com/apis/credentials?project=mynotes-513716"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#0a84ff] hover:underline flex items-center gap-1"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="138214289325-...apps.googleusercontent.com"
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
          )}

          {activeTab === 'diagnostic' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Diagnostica Connessione Google Drive</h4>
                  <p className="text-xs text-slate-400">Verifica in tempo reale tutti i punti di integrazione con Google</p>
                </div>
                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={isRunningDiagnostic}
                  className="px-4 py-2 bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
                  <span>{isRunningDiagnostic ? 'Test in corso...' : 'Esegui Diagnostica'}</span>
                </button>
              </div>

              {diagnostics && (
                <div className="flex flex-col gap-2.5">
                  {diagnostics.map((res, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                        res.status === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      {res.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-xs leading-relaxed">
                        <span className="font-bold block text-white text-sm mb-0.5">{res.step}</span>
                        <span>{res.message}</span>
                        {res.actionUrl && (
                          <div className="mt-2">
                            <a
                              href={res.actionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold rounded-lg shadow-sm"
                            >
                              <span>{res.actionText || 'Risolvi su Google Cloud'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'local' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-[#1d1f26] border border-[#2c2f3a] text-xs leading-relaxed text-slate-300">
                Puoi esportare l'intera libreria dei tuoi appunti in un unico file <code>.padnotes</code> da tenere su chiavetta o inviare via AirDrop/Telegram al tuo iPad o computer.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportLocal}
                  className="p-4 rounded-2xl bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white font-semibold text-xs flex flex-col items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-6 h-6" />
                  <span>Esporta File di Backup</span>
                </button>

                <label className="p-4 rounded-2xl bg-[#242630] hover:bg-[#2c2e3a] active:scale-95 text-slate-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 border border-[#343746] cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-[#0a84ff]" />
                  <span>Importa File di Backup</span>
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
