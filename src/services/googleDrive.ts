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

const SYNC_SETTINGS_KEY = 'google_drive_sync_settings';
const DEFAULT_CLIENT_ID_KEY = 'gdrive_client_id';

// Default Google OAuth Client ID provided by user
export const DEFAULT_GOOGLE_CLIENT_ID = '138214289325-ovuuesoedmgu7669cs25cr99alqgmfij.apps.googleusercontent.com';

export class GoogleDriveSyncService {
  private accessToken: string | null = null;
  private tokenClient: any = null;

  async getClientId(): Promise<string> {
    const item = await db.settings.get(DEFAULT_CLIENT_ID_KEY);
    if (item && item.value && item.value.trim().length > 0) {
      return item.value.trim();
    }
    return DEFAULT_GOOGLE_CLIENT_ID;
  }

  async setClientId(clientId: string): Promise<void> {
    await db.settings.put({ key: DEFAULT_CLIENT_ID_KEY, value: clientId.trim() });
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
   * Initializes OAuth Token Client with Google Identity Services (GIS)
   */
  async requestAuthToken(): Promise<string> {
    const clientId = await this.getClientId();
    if (!clientId) {
      throw new Error("Client ID di Google non configurato. Inserisci il tuo Google Client ID nelle impostazioni Cloud.");
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error("Libreria Google Identity Services non ancora caricata. Verifica la connessione internet.");
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error !== undefined) {
              let errorMsg = `Errore autenticazione Google (${response.error})`;
              if (response.error === 'popup_closed_by_user') {
                errorMsg = 'Accesso annullato (la finestra di Google è stata chiusa). Riprova.';
              } else if (response.error === 'access_denied') {
                errorMsg = 'Accesso negato: assicurati di aver aggiunto la tua email Google tra gli "Utenti di prova" (Test users) nella schermata di consenso OAuth su Google Cloud Console.';
              } else if (response.error === 'idpiframe_initialization_failed' || response.error_subtype === 'origin_mismatch') {
                errorMsg = 'Origine non autorizzata: aggiungi il dominio https://mynotessss-ko3s9cq97-michele-s-projects9.vercel.app nelle "Origini JavaScript autorizzate" su Google Cloud Console.';
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
        });

        // Request token; prompt user if needed
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Push current workspace data to Google Drive
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

      // 1. Check if file already exists in Drive
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id, name)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if (!listRes.ok) {
        throw new Error(`Errore consultazione Google Drive: ${listRes.statusText}`);
      }

      const listData = await listRes.json();
      const existingFile = listData.files && listData.files.length > 0 ? listData.files[0] : null;

      if (existingFile) {
        // Update file
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
          throw new Error(`Errore aggiornamento file su Google Drive`);
        }
      } else {
        // Create new file with metadata
        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          description: 'PadNotes Cloud Sync Backup'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.accessToken}`
            },
            body: form
          }
        );

        if (!createRes.ok) {
          throw new Error(`Errore creazione file su Google Drive`);
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
        error: err.message || 'Errore durante la sincronizzazione'
      });
      throw err;
    }
  }

  /**
   * Pull backup data from Google Drive and merge/restore into local IndexedDB
   */
  async restoreFromGoogleDrive(): Promise<WorkspaceBackup> {
    await this.saveSyncMetadata({ isSyncing: true, error: null });

    try {
      if (!this.accessToken) {
        await this.requestAuthToken();
      }

      const fileName = 'PadNotes_Workspace_Cloud.json';
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id, name, modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if (!listRes.ok) {
        throw new Error(`Errore richiesta elenco file su Google Drive`);
      }

      const listData = await listRes.json();
      if (!listData.files || listData.files.length === 0) {
        throw new Error("Nessun backup di PadNotes trovato su questo account Google Drive.");
      }

      const fileId = listData.files[0].id;
      const downloadRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if (!downloadRes.ok) {
        throw new Error(`Errore scaricamento file da Google Drive`);
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
