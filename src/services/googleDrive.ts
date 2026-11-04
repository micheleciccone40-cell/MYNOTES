import { db } from './db';
import type { Folder, Notebook, SyncStatus } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

export interface WorkspaceBackup {
  version: number;
  exportedAt: number;
  folders: Folder[];
  notebooks: Notebook[];
}

export interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  actionUrl?: string;
  actionText?: string;
}

const SYNC_SETTINGS_KEY = 'google_drive_sync_settings';
const DEFAULT_CLIENT_ID_KEY = 'gdrive_client_id';

// Default Google OAuth Client ID provided by user
export const DEFAULT_GOOGLE_CLIENT_ID = '138214289325-ovuuesoedmgu7669cs25cr99alqgmfij.apps.googleusercontent.com';

export class GoogleDriveSyncService {
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private isPreinitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Eagerly pre-load GIS script in background so popups are never blocked by Safari
      setTimeout(() => this.preinitialize(), 800);
    }
  }

  async getClientId(): Promise<string> {
    const item = await db.settings.get(DEFAULT_CLIENT_ID_KEY);
    if (item && item.value && item.value.trim().length > 0) {
      return item.value.trim();
    }
    return DEFAULT_GOOGLE_CLIENT_ID;
  }

  async setClientId(clientId: string): Promise<void> {
    await db.settings.put({ key: DEFAULT_CLIENT_ID_KEY, value: clientId.trim() });
    this.tokenClient = null;
    this.isPreinitialized = false;
  }

  async getSyncMetadata(): Promise<SyncStatus> {
    const item = await db.settings.get(SYNC_SETTINGS_KEY);
    return item?.value || {
      isConnected: false,
      isSyncing: false,
      lastSyncedAt: null,
      userEmail: undefined,
      error: null
    };
  }

  async saveSyncMetadata(status: Partial<SyncStatus>): Promise<void> {
    const current = await this.getSyncMetadata();
    const updated = { ...current, ...status };
    await db.settings.put({ key: SYNC_SETTINGS_KEY, value: updated });
  }

  /**
   * Pre-loads Google Identity Services library and creates token client upfront
   * This is CRITICAL for iPad Safari: prevents popup blocker from blocking Google login!
   */
  async preinitialize(): Promise<void> {
    if (this.isPreinitialized && this.tokenClient) return;

    try {
      await this.ensureGoogleScriptLoaded();
      const clientId = await this.getClientId();
      if (!clientId || !window.google?.accounts?.oauth2) return;

      this.initTokenClientInternal(clientId);
      this.isPreinitialized = true;
    } catch (e) {
      console.warn('Pre-initialization error (non-fatal):', e);
    }
  }

  private async ensureGoogleScriptLoaded(): Promise<void> {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      return;
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.google?.accounts?.oauth2) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 30) {
            clearInterval(interval);
            reject(new Error("Timeout caricamento Google Identity Services. Ricarica la pagina."));
          }
        }, 100);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (window.google?.accounts?.oauth2) {
              clearInterval(interval);
              resolve();
            } else if (attempts > 20) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        };
        script.onerror = () => reject(new Error("Impossibile caricare il servizio Google Identity. Verifica la connessione a Internet."));
        document.head.appendChild(script);
      }
    });
  }

  private initTokenClientInternal(clientId: string): void {
    if (!window.google?.accounts?.oauth2) return;

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
      callback: () => {
        // Callback will be overridden per request
      },
      error_callback: (error: any) => {
        console.error('Google OAuth token error:', error);
      }
    });
  }

  /**
   * Initializes OAuth Token Client with Google Identity Services (GIS)
   */
  async requestAuthToken(): Promise<string> {
    await this.ensureGoogleScriptLoaded();

    const clientId = await this.getClientId();
    if (!clientId) {
      throw new Error("Client ID di Google non configurato. Inserisci il tuo Google Client ID nelle impostazioni Cloud.");
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error("Libreria Google Identity Services non ancora disponibile. Riprova tra pochi istanti.");
    }

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error !== undefined) {
              let errorMsg = `Errore autenticazione Google (${response.error})`;
              if (response.error === 'popup_closed_by_user') {
                errorMsg = 'La finestra di accesso Google è stata chiusa o bloccata dal browser Safari (verifica se Safari mostra un avviso "Finestra a comparsa bloccata").';
              } else if (response.error === 'access_denied') {
                errorMsg = 'Accesso negato da Google: assicurati di aver aggiunto la tua email Google personale negli "Utenti di prova" (Test users) nella schermata di consenso OAuth di Google Cloud Console.';
              } else if (response.error === 'idpiframe_initialization_failed' || response.error_subtype === 'origin_mismatch') {
                errorMsg = `Origine non autorizzata: aggiungi "${currentOrigin}" (senza barra finale) nelle "Origini JavaScript autorizzate" dell'ID Client su Google Cloud Console.`;
              }
              await this.saveSyncMetadata({ isSyncing: false, error: errorMsg });
              reject(new Error(errorMsg));
              return;
            }

            this.accessToken = response.access_token;

            // Fetch user email
            let email = 'Account Google';
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${this.accessToken}` }
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                email = userData.email;
              }
            } catch (e) {
              console.warn('Could not fetch email', e);
            }

            await this.saveSyncMetadata({
              isConnected: true,
              userEmail: email,
              error: null
            });

            resolve(response.access_token);
          },
          error_callback: (err: any) => {
            console.error('GIS Error callback:', err);
            reject(new Error('Finestra popup di Google bloccata dal browser Safari. Consenti le finestre a comparsa nelle Impostazioni di Safari per accedere a Google.'));
          }
        });

        // Prompt user to select account if not already connected
        this.tokenClient.requestAccessToken({ prompt: this.accessToken ? '' : 'select_account' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Push current workspace data to Google Drive
   * Uses 2-step REST upload:
   * 1. Check if file exists or create metadata
   * 2. Upload file binary data using uploadType=media (100% reliable, no multipart bugs!)
   */
  async syncToGoogleDrive(): Promise<void> {
    await this.saveSyncMetadata({ isSyncing: true, error: null });

    try {
      if (!this.accessToken) {
        await this.requestAuthToken();
      }

      const folders = await db.folders.toArray();
      const notebooks = await db.notebooks.toArray();

      const backupData: WorkspaceBackup = {
        version: 1,
        exportedAt: Date.now(),
        folders,
        notebooks
      };

      const fileContent = JSON.stringify(backupData);
      const fileName = 'PadNotes_Workspace_Cloud.json';

      // 1. Search if file already exists in Drive
      let listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name = '${fileName}' and trashed = false&fields=files(id, name)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      // Handle 401 token expiry automatically
      if (listRes.status === 401) {
        this.accessToken = null;
        await this.requestAuthToken();
        listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name = '${fileName}' and trashed = false&fields=files(id, name)`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` }
          }
        );
      }

      if (!listRes.ok) {
        const errData = await listRes.json().catch(() => null);
        const errMsg = errData?.error?.message || listRes.statusText;
        if (listRes.status === 403 && (errMsg.includes('not been used') || errMsg.includes('disabled') || errMsg.includes('accessNotConfigured'))) {
          throw new Error(`⚠️ La "Google Drive API" non è ancora stata ABILITATA sul tuo progetto Google Cloud! Vai nella Libreria API di Google Cloud e tocca "Abilita".`);
        }
        throw new Error(`Errore consultazione Google Drive (${listRes.status}): ${errMsg}`);
      }

      const listData = await listRes.json();
      const existingFile = listData.files && listData.files.length > 0 ? listData.files[0] : null;

      if (existingFile) {
        // Update existing file content directly via uploadType=media
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: fileContent
          }
        );

        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => null);
          throw new Error(errData?.error?.message || `Errore salvataggio file su Google Drive (${updateRes.status})`);
        }
      } else {
        // Step 1: Create file metadata
        const createRes = await fetch(
          'https://www.googleapis.com/drive/v3/files',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: fileName,
              mimeType: 'application/json',
              description: 'PadNotes Cloud Sync Backup'
            })
          }
        );

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => null);
          const errMsg = errData?.error?.message || createRes.statusText;
          if (createRes.status === 403 && (errMsg.includes('not been used') || errMsg.includes('disabled') || errMsg.includes('accessNotConfigured'))) {
            throw new Error(`⚠️ La "Google Drive API" non è ancora stata ABILITATA sul tuo progetto Google Cloud! Vai nella Libreria API di Google Cloud e tocca "Abilita".`);
          }
          throw new Error(`Errore creazione file su Google Drive (${createRes.status}): ${errMsg}`);
        }

        const newFile = await createRes.json();

        // Step 2: Upload file content via uploadType=media
        const uploadRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${newFile.id}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: fileContent
          }
        );

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => null);
          throw new Error(errData?.error?.message || `Errore caricamento dati su Google Drive (${uploadRes.status})`);
        }
      }

      await this.saveSyncMetadata({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null
      });

    } catch (err: any) {
      await this.saveSyncMetadata({
        isSyncing: false,
        error: err.message || 'Errore durante la sincronizzazione con Google Drive'
      });
      throw err;
    }
  }

  /**
   * Pull backup data from Google Drive and restore into local IndexedDB
   */
  async restoreFromGoogleDrive(): Promise<WorkspaceBackup> {
    await this.saveSyncMetadata({ isSyncing: true, error: null });

    try {
      if (!this.accessToken) {
        await this.requestAuthToken();
      }

      const fileName = 'PadNotes_Workspace_Cloud.json';
      let listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name = '${fileName}' and trashed = false&fields=files(id, name, modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if (listRes.status === 401) {
        this.accessToken = null;
        await this.requestAuthToken();
        listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name = '${fileName}' and trashed = false&fields=files(id, name, modifiedTime)`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` }
          }
        );
      }

      if (!listRes.ok) {
        const errData = await listRes.json().catch(() => null);
        const errMsg = errData?.error?.message || listRes.statusText;
        if (listRes.status === 403 && (errMsg.includes('not been used') || errMsg.includes('disabled') || errMsg.includes('accessNotConfigured'))) {
          throw new Error(`⚠️ La "Google Drive API" non è ancora stata ABILITATA sul tuo progetto Google Cloud! Vai nella Libreria API di Google Cloud e tocca "Abilita".`);
        }
        throw new Error(`Errore consultazione Google Drive (${listRes.status}): ${errMsg}`);
      }

      const listData = await listRes.json();
      if (!listData.files || listData.files.length === 0) {
        throw new Error("Nessun salvataggio di PadNotes trovato su questo account Google Drive. Esegui prima un salvataggio con 'Salva su Google Drive'.");
      }

      const fileId = listData.files[0].id;
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if (!downloadRes.ok) {
        throw new Error(`Errore scaricamento file da Google Drive (${downloadRes.status})`);
      }

      const backup: WorkspaceBackup = await downloadRes.json();

      // Restore into Dexie database
      if (backup.folders && backup.folders.length > 0) {
        await db.folders.bulkPut(backup.folders);
      }

      if (backup.notebooks && backup.notebooks.length > 0) {
        await db.notebooks.bulkPut(backup.notebooks);
      }

      await this.saveSyncMetadata({
        isSyncing: false,
        lastSyncedAt: Date.now(),
        error: null
      });

      return backup;
    } catch (err: any) {
      await this.saveSyncMetadata({
        isSyncing: false,
        error: err.message || 'Errore durante il download dal Cloud'
      });
      throw err;
    }
  }

  /**
   * Run end-to-end diagnostic test
   */
  async runDiagnostic(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    // Step 1: Script check
    try {
      await this.ensureGoogleScriptLoaded();
      results.push({
        step: 'Libreria Google GIS',
        status: 'success',
        message: 'Libreria Google Identity Services caricata con successo.'
      });
    } catch (e: any) {
      results.push({
        step: 'Libreria Google GIS',
        status: 'error',
        message: e.message || 'Errore caricamento script Google.'
      });
      return results;
    }

    // Step 2: Client ID check
    const clientId = await this.getClientId();
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      results.push({
        step: 'Client ID OAuth',
        status: 'error',
        message: 'Client ID non valido o mancante.'
      });
      return results;
    } else {
      results.push({
        step: 'Client ID OAuth',
        status: 'success',
        message: `Client ID configurato: ${clientId.slice(0, 15)}...`
      });
    }

    // Step 3: Origin check
    results.push({
      step: 'Origine JavaScript',
      status: 'success',
      message: `Origine attuale: ${currentOrigin} (deve essere identica in Google Cloud Console).`
    });

    // Step 4: Authentication check
    try {
      const token = await this.requestAuthToken();
      results.push({
        step: 'Accesso Google OAuth',
        status: 'success',
        message: `Autenticato con successo! Token attivo.`
      });

      // Step 5: Drive API test
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id, name)`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (listRes.ok) {
        results.push({
          step: 'Google Drive API',
          status: 'success',
          message: 'Google Drive API attiva e funzionante al 100%!'
        });
      } else {
        const errData = await listRes.json().catch(() => null);
        const errMsg = errData?.error?.message || listRes.statusText;
        results.push({
          step: 'Google Drive API',
          status: 'error',
          message: `Errore Drive API: ${errMsg}`,
          actionUrl: `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=mynotes-513716`,
          actionText: 'Abilita Google Drive API su Google Cloud'
        });
      }
    } catch (e: any) {
      results.push({
        step: 'Accesso Google OAuth',
        status: 'error',
        message: e.message || 'Errore durante l\'autenticazione.'
      });
    }

    return results;
  }

  /**
   * Export all local data as a JSON file for offline backup / cross-device transfer
   */
  async exportLocalBackup(): Promise<void> {
    const folders = await db.folders.toArray();
    const notebooks = await db.notebooks.toArray();

    const backup: WorkspaceBackup = {
      version: 1,
      exportedAt: Date.now(),
      folders,
      notebooks
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PadNotes_Backup_${new Date().toISOString().slice(0, 10)}.padnotes`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import a local backup file (.padnotes or .json)
   */
  async importLocalBackup(file: File): Promise<number> {
    const text = await file.text();
    const backup: WorkspaceBackup = JSON.parse(text);

    if (!backup.folders || !backup.notebooks) {
      throw new Error("Il file selezionato non è un backup valido di PadNotes.");
    }

    await db.folders.bulkPut(backup.folders);
    await db.notebooks.bulkPut(backup.notebooks);

    return backup.notebooks.length;
  }
}

export const syncService = new GoogleDriveSyncService();
