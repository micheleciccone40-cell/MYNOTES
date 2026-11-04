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
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress(15, 0, 100);

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

    if (onProgress) onProgress(40, 1, totalPages);

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

    const bookPdfId = `book-pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Store raw PDF in IndexedDB
    const storedFile: StoredPdfFile = {
      id: bookPdfId,
      name: file.name,
      size: file.size,
      data: arrayBuffer,
      totalPages,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.pdfFiles.put(storedFile);

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

    const cleanTitle = file.name
      .replace(/\.pdf$/i, '')
      .replace(/--.*$/, '') // Clean up long Anna's Archive / library suffixes
      .replace(/_/g, ' ')
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

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(stored.data),
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
        console.warn(`Error rendering page ${pageNumber} of ${bookPdfId}:`, err);
      }
    }
  }

  /**
   * Check if a book's raw PDF data is stored in IndexedDB
   */
  async hasBookData(bookPdfId: string): Promise<boolean> {
    if (documentCache.has(bookPdfId)) return true;
    const count = await db.pdfFiles.where('id').equals(bookPdfId).count();
    return count > 0;
  }
}

export const pdfBookManager = new PdfBookManager();
