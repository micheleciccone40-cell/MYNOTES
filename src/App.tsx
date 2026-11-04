import { useState, useEffect, useCallback } from 'react';
import { db, seedInitialDataIfNeeded } from './services/db';
import { syncService } from './services/googleDrive';
import { exportNotebookToPdf } from './services/pdfExporter';
import type { Folder, Notebook, Page, Stroke, ToolType, PaperTemplate, SyncStatus } from './types';
import type { ImportResult } from './services/documentImporter';

import { Sidebar } from './components/Sidebar';
import { NotebookGrid } from './components/NotebookGrid';
import { Toolbar } from './components/Toolbar';
import { CanvasPage } from './components/CanvasPage';
import { FolderModal } from './components/FolderModal';
import { ImportModal } from './components/ImportModal';
import { SyncModal } from './components/SyncModal';
import { NewNotebookModal } from './components/NewNotebookModal';

export function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'favorites' | 'recent'>('all');
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#0f172a');
  const [strokeSize, setStrokeSize] = useState<number>(5);
  const [applePencilOnly, setApplePencilOnly] = useState<boolean>(true); // Palm Rejection enabled by default!

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

  // Add Stroke with Undo History
  const handleAddStroke = useCallback((stroke: Stroke) => {
    if (!currentPage) return;
    setUndoStack((prev) => [...prev, currentPage.strokes]);
    setRedoStack([]); // Clear redo on new action
    handleUpdatePage({
      strokes: [...currentPage.strokes, stroke]
    });
  }, [currentPage, handleUpdatePage]);

  // Delete Stroke (used by eraser)
  const handleDeleteStroke = useCallback((strokeId: string) => {
    if (!currentPage) return;
    setUndoStack((prev) => [...prev, currentPage.strokes]);
    setRedoStack([]);
    handleUpdatePage({
      strokes: currentPage.strokes.filter((s) => s.id !== strokeId)
    });
  }, [currentPage, handleUpdatePage]);

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !currentPage) return;
    const previousStrokes = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentPage.strokes]);
    handleUpdatePage({ strokes: previousStrokes });
  }, [undoStack, currentPage, handleUpdatePage]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !currentPage) return;
    const nextStrokes = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentPage.strokes]);
    handleUpdatePage({ strokes: nextStrokes });
  }, [redoStack, currentPage, handleUpdatePage]);

  // Keyboard Shortcuts (especially great for Bluetooth keyboard on iPad or PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input/textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
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
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('text');
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
      textBlocks: []
    };
    const updatedNotebook: Notebook = {
      ...activeNotebook,
      pages: [...activeNotebook.pages, newPage],
      updatedAt: Date.now()
    };
    saveNotebook(updatedNotebook);
    setCurrentPageIndex(activeNotebook.pages.length);
  };

  // Change title
  const handleChangeTitle = (newTitle: string) => {
    if (!activeNotebook) return;
    saveNotebook({ ...activeNotebook, title: newTitle, updatedAt: Date.now() });
  };

  // Change paper template
  const handleChangePaperTemplate = (tmpl: PaperTemplate) => {
    if (!activeNotebook) return;
    saveNotebook({ ...activeNotebook, paperTemplate: tmpl, updatedAt: Date.now() });
  };

  // Export to PDF
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

  // Create new folder
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

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    await db.folders.delete(folderId);
    if (selectedFolderId === folderId) {
      setSelectedFolderId('all');
    }
    refreshData();
  };

  // Create new notebook
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
      paperTemplate: template,
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
          textBlocks: []
        }
      ]
    };
    await db.notebooks.add(newNotebook);
    await refreshData();
    setActiveNotebookId(newNotebook.id);
    setCurrentPageIndex(0);
  };

  // Handle Document Import (PDF, Word, Pages, Images)
  const handleImportComplete = async (result: ImportResult) => {
    const now = Date.now();
    const defaultFolder = ['all', 'favorites', 'recent'].includes(selectedFolderId) ? null : (selectedFolderId as string);

    const importedNotebook: Notebook = {
      id: `imported-${now}`,
      title: result.title,
      folderId: defaultFolder,
      createdAt: now,
      updatedAt: now,
      paperTemplate: 'blank',
      coverColor: result.sourceType === 'pdf' ? '#dc2626' : result.sourceType === 'pages' ? '#d97706' : '#2563eb',
      tags: [result.sourceType, 'importato'],
      pages: result.pages
    };

    await db.notebooks.add(importedNotebook);
    await refreshData();
    setActiveNotebookId(importedNotebook.id);
    setCurrentPageIndex(0);

    if (result.warning) {
      alert(result.warning);
    }
  };

  // Notebook card actions
  const handleToggleFavorite = async (notebookId: string) => {
    const nb = notebooks.find((n) => n.id === notebookId);
    if (!nb) return;
    const updated = { ...nb, isFavorite: !nb.isFavorite, updatedAt: Date.now() };
    await db.notebooks.put(updated);
    refreshData();
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    await db.notebooks.delete(notebookId);
    if (activeNotebookId === notebookId) {
      setActiveNotebookId(null);
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

  // Calculate counts per folder
  const folderCounts: { [key: string]: number } = {
    all: notebooks.length,
    favorites: notebooks.filter((n) => n.isFavorite).length
  };
  folders.forEach((f) => {
    folderCounts[f.id] = notebooks.filter((n) => n.folderId === f.id).length;
  });

  // Filter notebooks for the grid view
  const displayNotebooks = notebooks.filter((nb) => {
    if (selectedFolderId === 'all') return true;
    if (selectedFolderId === 'favorites') return !!nb.isFavorite;
    return nb.folderId === selectedFolderId;
  });

  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const currentFolderName =
    selectedFolderId === 'all'
      ? 'Tutti i taccuini'
      : selectedFolderId === 'favorites'
      ? 'Taccuini Preferiti'
      : currentFolder?.name || 'Cartella';

  return (
    <div className="h-full w-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {activeNotebook && currentPage ? (
        /* VIEW 1: NOTEBOOK EDITOR (Goodnotes Style Digital Canvas) */
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
            onSelectTool={setActiveTool}
            onChangeColor={setStrokeColor}
            onChangeSize={setStrokeSize}
            onToggleApplePencilOnly={() => setApplePencilOnly(!applePencilOnly)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onPrevPage={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
            onNextPage={() => setCurrentPageIndex((prev) => Math.min(activeNotebook.pages.length - 1, prev + 1))}
            onAddPage={handleAddPage}
            onChangePaperTemplate={handleChangePaperTemplate}
            onExportPdf={() => handleExportPdf()}
            onBackToLibrary={() => setActiveNotebookId(null)}
          />

          {/* Canvas Scrollable Workspace */}
          <div className="flex-1 overflow-auto bg-[#0a0b0e] p-4 sm:p-8 flex items-start justify-center">
            <CanvasPage
              key={currentPage.id}
              page={currentPage}
              paperTemplate={activeNotebook.paperTemplate}
              activeTool={activeTool}
              strokeColor={strokeColor}
              strokeSize={strokeSize}
              applePencilOnly={applePencilOnly}
              onUpdatePage={handleUpdatePage}
              onAddStroke={handleAddStroke}
              onDeleteStroke={handleDeleteStroke}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
            />
          </div>
        </div>
      ) : (
        /* VIEW 2: LIBRARY & FOLDERS VIEW */
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
          />

          <NotebookGrid
            notebooks={displayNotebooks}
            folders={folders}
            currentFolderId={selectedFolderId}
            currentFolderName={currentFolderName}
            onOpenNotebook={(id) => {
              setActiveNotebookId(id);
              setCurrentPageIndex(0);
              setUndoStack([]);
              setRedoStack([]);
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
