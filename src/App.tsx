import { useState, useEffect, useCallback, useRef } from 'react';
import { db, seedInitialDataIfNeeded } from './services/db';
import { syncService } from './services/googleDrive';
import { exportNotebookToPdf } from './services/pdfExporter';
import type { Folder, Notebook, Page, Stroke, ToolType, PaperTemplate, SyncStatus, FloatingImage } from './types';
import type { ImportResult } from './services/documentImporter';

import { Sidebar } from './components/Sidebar';
import { NotebookGrid } from './components/NotebookGrid';
import { Toolbar } from './components/Toolbar';
import { DocumentEditor } from './components/DocumentEditor';
import { FolderModal } from './components/FolderModal';
import { ImportModal } from './components/ImportModal';
import { SyncModal } from './components/SyncModal';
import { NewNotebookModal } from './components/NewNotebookModal';

export function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'favorites' | 'shared' | 'trash'>('all');
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Tools State (Default is 'text' for Word typing immediately)
  const [activeTool, setActiveTool] = useState<ToolType>('text');
  const [strokeColor, setStrokeColor] = useState<string>('#0f172a');
  const [strokeSize, setStrokeSize] = useState<number>(5);
  const [applePencilOnly, setApplePencilOnly] = useState<boolean>(true); // Palm Rejection enabled

  // Word Typography State
  const [currentFontSizePx, setCurrentFontSizePx] = useState<number>(16);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // History Stacks (Undo / Redo) for strokes
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // UI Modals & Menus
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNewNotebookModalOpen, setIsNewNotebookModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null
  });

  // Network State & Offline/Online handling
  const [, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [networkToast, setNetworkToast] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setNetworkToast('🟢 Connesso a Internet • Sincronizzazione automatica con Google Drive...');
      setTimeout(() => setNetworkToast(null), 3500);

      const meta = await syncService.getSyncMetadata();
      if (meta.isConnected) {
        try {
          await syncService.syncToGoogleDrive();
          const updated = await syncService.getSyncMetadata();
          setSyncStatus(updated);
        } catch (e) {
          console.warn('Auto-sync on reconnect error:', e);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkToast('🟠 Modalità Offline • Gli appunti continuano a salvarsi al sicuro sul tuo iPad');
      setTimeout(() => setNetworkToast(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load database data
  const refreshData = useCallback(async () => {
    await seedInitialDataIfNeeded();
    const loadedFolders = await db.folders.toArray();
    const loadedNotebooks = await db.notebooks.toArray();
    setFolders(loadedFolders);
    setNotebooks(loadedNotebooks);

    const syncMeta = await syncService.getSyncMetadata();
    setSyncStatus(syncMeta);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Active notebook and current page
  const activeNotebook = notebooks.find((nb) => nb.id === activeNotebookId) || null;
  const currentPage = activeNotebook ? activeNotebook.pages[currentPageIndex] || activeNotebook.pages[0] : null;

  // Persist updated notebook to state and IndexedDB
  const saveNotebook = useCallback(async (updated: Notebook) => {
    setNotebooks((prev) => prev.map((nb) => (nb.id === updated.id ? updated : nb)));
    await db.notebooks.put(updated);
  }, []);

  // Update current page
  const handleUpdatePage = useCallback((pageUpdates: Partial<Page>) => {
    if (!activeNotebook || !currentPage) return;
    const updatedPages = activeNotebook.pages.map((p, idx) =>
      idx === currentPageIndex ? { ...p, ...pageUpdates } : p
    );
    const updatedNotebook: Notebook = {
      ...activeNotebook,
      pages: updatedPages,
      updatedAt: Date.now()
    };
    saveNotebook(updatedNotebook);
  }, [activeNotebook, currentPage, currentPageIndex, saveNotebook]);

  // Word Rich Text formatting execution
  const handleExecTextCommand = (command: string, value?: string) => {
    if (activeTool !== 'text') {
      setActiveTool('text');
    }
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current && currentPage) {
      handleUpdatePage({ contentHtml: editorRef.current.innerHTML });
    }
  };

  // Font size in px handler
  const handleChangeFontSizePx = (szPx: number) => {
    setCurrentFontSizePx(szPx);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement('span');
        span.style.fontSize = `${szPx}px`;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        if (editorRef.current && currentPage) {
          handleUpdatePage({ contentHtml: editorRef.current.innerHTML });
        }
      }
    }
  };

  // Freeform Floating Image Inserter
  const handleInsertFloatingImage = (file: File) => {
    if (!currentPage) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newImg: FloatingImage = {
        id: `img-${Date.now()}`,
        src: dataUrl,
        x: 80,
        y: 140,
        width: 320,
        height: 220
      };
      handleUpdatePage({
        images: [...(currentPage.images || []), newImg]
      });
    };
    reader.readAsDataURL(file);
  };

  // Undo (also triggered by 2-finger tap on screen!)
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !currentPage) return;
    const previousStrokes = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentPage.strokes]);
    handleUpdatePage({ strokes: previousStrokes });
  }, [undoStack, currentPage, handleUpdatePage]);

  // Redo (also triggered by 3-finger tap on screen!)
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !currentPage) return;
    const nextStrokes = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentPage.strokes]);
    handleUpdatePage({ strokes: nextStrokes });
  }, [redoStack, currentPage, handleUpdatePage]);

  // Keyboard Shortcuts (iPad Bluetooth keyboard or PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept normal typing inside contentEditable
      if (document.activeElement === editorRef.current) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          handleExecTextCommand('bold');
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          handleExecTextCommand('italic');
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
          e.preventDefault();
          handleExecTextCommand('underline');
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('highlighter');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Page Navigation & Creation
  const handleAddPage = () => {
    if (!activeNotebook) return;
    const newPageNum = activeNotebook.pages.length + 1;
    const newPage: Page = {
      id: `page-${Date.now()}-${newPageNum}`,
      pageNumber: newPageNum,
      backgroundType: 'template',
      width: 820,
      height: 1160,
      strokes: [],
      images: [],
      contentHtml: '<p><br></p>'
    };
    const updatedNotebook: Notebook = {
      ...activeNotebook,
      pages: [...activeNotebook.pages, newPage],
      updatedAt: Date.now()
    };
    saveNotebook(updatedNotebook);
    setCurrentPageIndex(activeNotebook.pages.length);
  };

  const handleChangeTitle = (newTitle: string) => {
    if (!activeNotebook) return;
    saveNotebook({ ...activeNotebook, title: newTitle, updatedAt: Date.now() });
  };

  const handleChangePaperTemplate = (tmpl: PaperTemplate) => {
    if (!activeNotebook) return;
    saveNotebook({ ...activeNotebook, paperTemplate: tmpl, updatedAt: Date.now() });
  };

  const handleExportPdf = async (nbToExport?: Notebook) => {
    const target = nbToExport || activeNotebook;
    if (!target) return;
    setIsExportingPdf(true);
    try {
      await exportNotebookToPdf(target);
    } catch (err: any) {
      alert("Errore durante l'esportazione PDF: " + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveFolder = async (name: string, color: string) => {
    const now = Date.now();
    if (folderToEdit) {
      const updated: Folder = { ...folderToEdit, name, color, updatedAt: now };
      await db.folders.put(updated);
    } else {
      const newFolder: Folder = {
        id: `folder-${now}`,
        name,
        color,
        parentId: null,
        createdAt: now,
        updatedAt: now
      };
      await db.folders.add(newFolder);
    }
    setFolderToEdit(null);
    refreshData();
  };

  const handleDeleteFolder = async (folderId: string) => {
    await db.folders.delete(folderId);
    if (selectedFolderId === folderId) {
      setSelectedFolderId('all');
    }
    refreshData();
  };

  const handleCreateNotebook = async (
    title: string,
    template: PaperTemplate,
    coverColor: string,
    folderId: string | null
  ) => {
    const now = Date.now();
    const newNotebook: Notebook = {
      id: `notebook-${now}`,
      title,
      folderId,
      createdAt: now,
      updatedAt: now,
      paperTemplate: template || 'blank', // BLANK Word di default
      coverColor,
      tags: [],
      pages: [
        {
          id: `page-${now}-1`,
          pageNumber: 1,
          backgroundType: 'template',
          width: 820,
          height: 1160,
          strokes: [],
          images: [],
          contentHtml: '<p><br></p>'
        }
      ]
    };
    await db.notebooks.add(newNotebook);
    await refreshData();
    setActiveNotebookId(newNotebook.id);
    setCurrentPageIndex(0);
    setActiveTool('text');
  };

  const handleImportComplete = async (result: ImportResult) => {
    const now = Date.now();
    const targetFolder = ['all', 'favorites', 'shared'].includes(selectedFolderId) ? null : (selectedFolderId as string);

    const importedNotebook: Notebook = {
      id: `doc-${now}`,
      title: result.title,
      folderId: targetFolder, // Sotto la cartella attiva!
      createdAt: now,
      updatedAt: now,
      paperTemplate: 'blank',
      coverColor: '#1e293b',
      tags: [result.sourceType],
      pages: result.pages
    };

    await db.notebooks.add(importedNotebook);
    await refreshData();
    setActiveNotebookId(importedNotebook.id);
    setCurrentPageIndex(0);
    setActiveTool('text');

    if (result.warning) {
      alert(result.warning);
    }
  };

  const handleToggleFavorite = async (notebookId: string) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) return;
    const updated = { ...nb, isFavorite: !nb.isFavorite, updatedAt: Date.now() };
    await db.notebooks.put(updated);
    refreshData();
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) return;
    if (nb.isDeleted || selectedFolderId === 'trash') {
      await db.notebooks.delete(notebookId);
    } else {
      const updated = { ...nb, isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() };
      await db.notebooks.put(updated);
    }
    if (activeNotebookId === notebookId) {
      setActiveNotebookId(null);
    }
    refreshData();
  };

  const handleRestoreNotebook = async (notebookId: string) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) return;
    const updated = { ...nb, isDeleted: false, deletedAt: undefined, updatedAt: Date.now() };
    await db.notebooks.put(updated);
    refreshData();
  };

  const handleEmptyTrash = async () => {
    const trashItems = notebooks.filter((n) => n.isDeleted);
    for (const item of trashItems) {
      await db.notebooks.delete(item.id);
    }
    refreshData();
  };

  const handleDuplicateNotebook = async (notebookId: string) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) return;
    const now = Date.now();
    const duplicated: Notebook = {
      ...nb,
      id: `notebook-${now}`,
      title: `${nb.title} (Copia)`,
      createdAt: now,
      updatedAt: now
    };
    await db.notebooks.add(duplicated);
    refreshData();
  };

  const handleMoveNotebook = async (notebookId: string, targetFolderId: string | null) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) return;
    const updated = { ...nb, folderId: targetFolderId, updatedAt: Date.now() };
    await db.notebooks.put(updated);
    refreshData();
  };

  const handleRenameNotebook = async (notebookId: string, newTitle: string) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb || !newTitle.trim()) return;
    const updated = { ...nb, title: newTitle.trim(), updatedAt: Date.now() };
    await db.notebooks.put(updated);
    refreshData();
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const f = folders.find((fd) => fd.id === folderId);
    if (!f || !newName.trim()) return;
    const updated = { ...f, name: newName.trim(), updatedAt: Date.now() };
    await db.folders.put(updated);
    refreshData();
  };

  const folderCounts: { [key: string]: number } = {
    all: notebooks.filter((n) => !n.isDeleted).length,
    favorites: notebooks.filter((n) => !n.isDeleted && n.isFavorite).length,
    trash: notebooks.filter((n) => !!n.isDeleted).length
  };
  folders.forEach((f) => {
    folderCounts[f.id] = notebooks.filter((n) => !n.isDeleted && n.folderId === f.id).length;
  });

  const displayNotebooks = notebooks.filter((nb) => {
    if (selectedFolderId === 'trash') return !!nb.isDeleted;
    if (nb.isDeleted) return false;
    if (selectedFolderId === 'all') return !nb.folderId; // Rimosso dal posto d'origine quando spostato in cartella!
    if (selectedFolderId === 'favorites') return !!nb.isFavorite;
    return nb.folderId === selectedFolderId;
  });

  const totalWords = activeNotebook?.pages.reduce((acc, p) => {
    const text = (p.contentHtml || '').replace(/<[^>]+>/g, ' ').trim();
    if (!text) return acc;
    const words = text.split(/\s+/).filter(Boolean);
    return acc + words.length;
  }, 0) || 0;

  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const currentFolderName =
    selectedFolderId === 'trash'
      ? 'Cestino'
      : selectedFolderId === 'all'
      ? 'Documenti'
      : selectedFolderId === 'favorites'
      ? 'Taccuini Preferiti'
      : currentFolder?.name || 'Cartella';

  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);
    if (tool === 'highlighter') {
      setStrokeColor('#fde047'); // Default giallo pastello opaco
      setStrokeSize(20);
    } else if (tool === 'pen') {
      if (strokeColor === '#fde047') {
        setStrokeColor('#0f172a');
      }
      setStrokeSize(3);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-black text-slate-100 overflow-hidden font-sans select-none">
      {/* Network Offline / Auto-sync Toast */}
      {networkToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-[#181a24]/95 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2">
          <span>{networkToast}</span>
        </div>
      )}
      {activeNotebook && currentPage ? (
        /* VIEW 1: WORD-STYLE DOCUMENT EDITOR WITH APPLE PENCIL */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Toolbar
            title={activeNotebook.title}
            currentPageIndex={currentPageIndex}
            totalPages={activeNotebook.pages.length}
            paperTemplate={activeNotebook.paperTemplate}
            activeTool={activeTool}
            strokeColor={strokeColor}
            strokeSize={strokeSize}
            applePencilOnly={applePencilOnly}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            isExportingPdf={isExportingPdf}
            onChangeTitle={handleChangeTitle}
            onSelectTool={handleSelectTool}
            onChangeColor={setStrokeColor}
            onChangeSize={setStrokeSize}
            onToggleApplePencilOnly={() => setApplePencilOnly(!applePencilOnly)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onPrevPage={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
            onNextPage={() => setCurrentPageIndex((prev) => Math.min(activeNotebook.pages.length - 1, prev + 1))}
            onAddPage={handleAddPage}
            onChangePaperTemplate={handleChangePaperTemplate}
            onInsertImage={handleInsertFloatingImage}
            onExportPdf={() => handleExportPdf()}
            onBackToLibrary={() => setActiveNotebookId(null)}
            onExecTextCommand={handleExecTextCommand}
            currentFontSizePx={currentFontSizePx}
            onChangeFontSizePx={handleChangeFontSizePx}
            zoom={zoom}
            onChangeZoom={setZoom}
            isZenMode={isZenMode}
            onToggleZenMode={() => setIsZenMode((prev) => !prev)}
            wordCount={totalWords}
          />

          {/* Document Centered Workspace with Continuous Vertical Scrolling */}
          <div className="flex-1 overflow-auto bg-[#0a0b0e] flex flex-col items-center">
            <div className="min-w-fit px-4 sm:px-10 flex flex-col items-center w-full">
            <DocumentEditor
              pages={activeNotebook.pages}
              paperTemplate={activeNotebook.paperTemplate}
              activeTool={activeTool}
              strokeColor={strokeColor}
              strokeSize={strokeSize}
              applePencilOnly={applePencilOnly}
              zoom={zoom}
              onChangeZoom={setZoom}
              onUpdatePage={(pageIdx, updates) => {
                const updatedPages = activeNotebook.pages.map((p, idx) =>
                  idx === pageIdx ? { ...p, ...updates } : p
                );
                saveNotebook({ ...activeNotebook, pages: updatedPages, updatedAt: Date.now() });
              }}
              onAddStroke={(pageIdx, stroke) => {
                const targetPage = activeNotebook.pages[pageIdx];
                if (!targetPage) return;
                setUndoStack((prev) => [...prev, targetPage.strokes || []]);
                setRedoStack([]);
                const updatedPages = activeNotebook.pages.map((p, idx) =>
                  idx === pageIdx ? { ...p, strokes: [...(p.strokes || []), stroke] } : p
                );
                saveNotebook({ ...activeNotebook, pages: updatedPages, updatedAt: Date.now() });
              }}
              onDeleteStroke={(pageIdx, strokeId) => {
                const targetPage = activeNotebook.pages[pageIdx];
                if (!targetPage) return;
                setUndoStack((prev) => [...prev, targetPage.strokes || []]);
                setRedoStack([]);
                const updatedPages = activeNotebook.pages.map((p, idx) =>
                  idx === pageIdx ? { ...p, strokes: (p.strokes || []).filter(s => s.id !== strokeId) } : p
                );
                saveNotebook({ ...activeNotebook, pages: updatedPages, updatedAt: Date.now() });
              }}
              onAddPageAt={(insertIndex) => {
                const newPage: Page = {
                  id: `page-${Date.now()}-${insertIndex + 1}`,
                  pageNumber: insertIndex + 1,
                  backgroundType: 'template',
                  width: 820,
                  height: 1160,
                  strokes: [],
                  images: [],
                  contentHtml: '<p><br></p>'
                };
                const updatedPages = [...activeNotebook.pages];
                updatedPages.splice(insertIndex, 0, newPage);
                updatedPages.forEach((p, i) => (p.pageNumber = i + 1));
                saveNotebook({ ...activeNotebook, pages: updatedPages, updatedAt: Date.now() });
              }}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
            />
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: LIBRARY & FOLDERS (GOODNOTES FORMAL AESTHETIC) */
        <div className="flex-1 flex h-full overflow-hidden">
          <Sidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            counts={folderCounts}
            syncStatus={syncStatus}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onSelectFolder={setSelectedFolderId}
            onCreateFolderClick={() => {
              setFolderToEdit(null);
              setIsFolderModalOpen(true);
            }}
            onEditFolderClick={(f) => {
              setFolderToEdit(f);
              setIsFolderModalOpen(true);
            }}
            onDeleteFolderClick={handleDeleteFolder}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onMoveNotebook={handleMoveNotebook}
          />

          <NotebookGrid
            notebooks={displayNotebooks}
            allNotebooks={notebooks}
            folders={folders}
            currentFolderId={selectedFolderId}
            currentFolderName={currentFolderName}
            onOpenNotebook={(id) => {
              setActiveNotebookId(id);
              setCurrentPageIndex(0);
              setUndoStack([]);
              setRedoStack([]);
              setActiveTool('text');
            }}
            onCreateNotebook={() => setIsNewNotebookModalOpen(true)}
            onCreateFolderClick={() => {
              setFolderToEdit(null);
              setIsFolderModalOpen(true);
            }}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onToggleFavorite={handleToggleFavorite}
            onDeleteNotebook={handleDeleteNotebook}
            onDuplicateNotebook={handleDuplicateNotebook}
            onMoveNotebook={handleMoveNotebook}
            onExportPdfDirect={handleExportPdf}
            onSelectFolder={setSelectedFolderId}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onRestoreNotebook={handleRestoreNotebook}
            onEmptyTrash={handleEmptyTrash}
            onRenameNotebook={handleRenameNotebook}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>
      )}

      {/* MODALS */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        onSave={handleSaveFolder}
        folderToEdit={folderToEdit}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onRefreshData={refreshData}
      />

      <NewNotebookModal
        isOpen={isNewNotebookModalOpen}
        folders={folders}
        currentFolderId={selectedFolderId}
        onClose={() => setIsNewNotebookModalOpen(false)}
        onCreate={handleCreateNotebook}
      />
    </div>
  );
}

export default App;
