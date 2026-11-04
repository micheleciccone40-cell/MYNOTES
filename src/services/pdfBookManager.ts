import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { db, type StoredPdfFile } from './db';
import type { Notebook, Page } from '../types';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

// In-memory cache for open PDF documents to achieve 0ms page rendering
const documentCache = new Map<string, any>();
// WeakMap to keep track of active render tasks per canvas element to cancel obsolete renders on fast scroll
const canvasRenderTasks = new WeakMap<HTMLCanvasElement, any>();

export class PdfBookManager {
  /**
   * Import a PDF book in 100% faithful raw mode:
   * ZERO text conversion, ZERO formatting distortion!
   * Original graphics, formulas, tables, and typography preserved pixel-perfect.
   */
  async importBook(
    file: File,
    folderId: string | null = null,
    onProgress?: (percent: number, current: number, total: number) => void
  ): Promise<Notebook> {
    if (onProgress) onProgress(10, 0, 100);

    // 1. Store as pure Blob in IndexedDB: Blob is native to IndexedDB, avoids ArrayBuffer detach entirely!
    const bookPdfId = `book-pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pdfBlob: Blob = file.slice(0, file.size, 'application/pdf');

    const storedFile: StoredPdfFile = {
      id: bookPdfId,
      name: file.name,
      size: file.size,
      data: pdfBlob,
      totalPages: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.pdfFiles.put(storedFile);

    if (onProgress) onProgress(20, 0, 100);

    // 2. Read ArrayBuffer for pdfjsLib worker
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (totalPages === 0) {
      throw new Error("Il file PDF selezionato non contiene pagine valide.");
    }

    // Update totalPages in IndexedDB
    await db.pdfFiles.update(bookPdfId, { totalPages });

    if (onProgress) onProgress(45, 1, totalPages);

    // Get first page to compute standard aspect ratio
    const page1 = await pdfDoc.getPage(1);
    const unscaledVp = page1.getViewport({ scale: 1 });
    const ratio = unscaledVp.height / unscaledVp.width;
    const standardWidth = 820;
    const standardHeight = Math.round(820 * ratio);

    // Generate crisp cover thumbnail for library view
    let coverThumbnail: string | undefined = undefined;
    try {
      const thumbCanvas = document.createElement('canvas');
      const thumbWidth = 320;
      const thumbHeight = Math.round(320 * ratio);
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      const thumbVp = page1.getViewport({ scale: thumbWidth / unscaledVp.width });
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        await page1.render({ canvasContext: thumbCtx, viewport: thumbVp }).promise;
        coverThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn('Cover thumbnail generation skipped:', e);
    }

    if (onProgress) onProgress(70, Math.floor(totalPages / 2), totalPages);

    // Cache the loaded doc in memory
    documentCache.set(bookPdfId, pdfDoc);

    // Build the virtual pages list with exact book aspect ratio
    const pages: Page[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        id: `page-${bookPdfId}-${i}`,
        pageNumber: i,
        backgroundType: 'pdf',
        bookPdfId,
        pdfPageNumber: i,
        width: standardWidth,
        height: standardHeight,
        strokes: [],
        images: [],
        contentHtml: '', // Pure PDF: no text conversion!
      });
    }

    // Clean up title for elegant display
    const cleanTitle = file.name
      .replace(/\.pdf$/i, '')
      .replace(/--\s*Anna[’']s Archive.*$/i, '')
      .replace(/--\s*[0-9a-f]{32}.*$/i, '')
      .replace(/--\s*isbn13\s+\d+.*$/i, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Libro Senza Titolo';

    const now = Date.now();
    const bookNotebook: Notebook = {
      id: `notebook-${now}`,
      title: cleanTitle,
      folderId,
      createdAt: now,
      updatedAt: now,
      paperTemplate: 'blank',
      coverColor: '#0f172a',
      isBook: true,
      bookPdfId,
      coverThumbnail,
      tags: ['libro', 'pdf-fedele'],
      pages
    };

    await db.notebooks.add(bookNotebook);

    if (onProgress) onProgress(100, totalPages, totalPages);

    return bookNotebook;
  }

  /**
   * Retrieves an open PDFDocumentProxy from memory cache, or loads from IndexedDB
   */
  async getPdfDocument(bookPdfId: string): Promise<any> {
    if (documentCache.has(bookPdfId)) {
      return documentCache.get(bookPdfId);
    }

    const stored = await db.pdfFiles.get(bookPdfId);
    if (!stored) {
      throw new Error(`File PDF del libro non trovato nella memoria locale (ID: ${bookPdfId})`);
    }

    let buffer: ArrayBuffer;
    if (stored.data instanceof Blob) {
      buffer = await stored.data.arrayBuffer();
    } else if (stored.data instanceof ArrayBuffer) {
      buffer = stored.data;
    } else {
      buffer = new Uint8Array(stored.data as any).buffer;
    }

    // Always create a separate slice so worker detaching its copy won't affect stored.data
    const workerCopy = new Uint8Array(buffer).slice(0);

    const loadingTask = pdfjsLib.getDocument({
      data: workerCopy,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    documentCache.set(bookPdfId, pdfDoc);
    return pdfDoc;
  }

  /**
   * Renders a specific book page onto a canvas element at high retina resolution
   */
  async renderPageToCanvas(
    bookPdfId: string,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    targetWidth: number
  ): Promise<void> {
    try {
      // Cancel previous ongoing render on this canvas if user scrolled past
      if (canvasRenderTasks.has(canvas)) {
        try {
          const prevTask = canvasRenderTasks.get(canvas);
          prevTask.cancel();
        } catch {
          // Ignore cancellation errors
        }
        canvasRenderTasks.delete(canvas);
      }

      const pdfDoc = await this.getPdfDocument(bookPdfId);
      const page = await pdfDoc.getPage(pageNumber);

      const unscaledViewport = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for battery & smooth iPad scroll
      const scale = (targetWidth / unscaledViewport.width) * dpr;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderTask = page.render({ canvasContext: ctx, viewport });
      canvasRenderTasks.set(canvas, renderTask);

      await renderTask.promise;
      canvasRenderTasks.delete(canvas);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`Error rendering page ${pageNumber} of book ${bookPdfId}:`, err);
      }
    }
  }

  /**
   * Remove cached document when book is closed or deleted to free RAM
   */
  clearCache(bookPdfId?: string): void {
    if (bookPdfId) {
      documentCache.delete(bookPdfId);
    } else {
      documentCache.clear();
    }
  }
}

export const pdfBookManager = new PdfBookManager();
