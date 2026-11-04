import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { Page } from '../types';

// Set up local PDF.js worker served directly by Vite (no external CDN required!)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ImportResult {
  title: string;
  pages: Page[];
  sourceType: 'pdf' | 'docx' | 'pages' | 'image';
  warning?: string;
}

/**
 * Import a PDF document and convert its pages into annotatable PadNotes pages
 */
export async function importPdf(file: File | Blob, originalFileName: string): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Configure loading task
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (numPages === 0) {
    throw new Error("Il file PDF selezionato non contiene pagine valide.");
  }

  const pages: Page[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    // Render at 1.5x scale for sharp iPad Retina display
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White background for transparent PDF pages
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.88);

      pages.push({
        id: `pdf-page-${Date.now()}-${i}`,
        pageNumber: i,
        backgroundType: 'pdf',
        pdfPageNumber: i,
        backgroundImageData: imageDataUrl,
        width: viewport.width,
        height: viewport.height,
        strokes: [],
        textBlocks: []
      });
    }
  }

  const cleanTitle = originalFileName.replace(/\.[^/.]+$/, "");
  return {
    title: cleanTitle || 'Documento PDF',
    pages,
    sourceType: 'pdf'
  };
}

/**
 * Import an Apple Pages (.pages) file.
 * Modern .pages files contain a QuickLook/Preview.pdf preview bundle that can be rendered as a PDF!
 */
export async function importPagesFile(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Look for QuickLook/Preview.pdf or preview.pdf inside the pages archive
  let previewPdfFile = zip.file("QuickLook/Preview.pdf") || 
                       zip.file("preview.pdf") || 
                       zip.file(/^QuickLook\/.*\.pdf$/i)[0];

  if (previewPdfFile) {
    const pdfBlob = await previewPdfFile.async("blob");
    const result = await importPdf(pdfBlob, file.name.replace(/\.pages$/i, ''));
    return {
      ...result,
      title: file.name.replace(/\.pages$/i, ''),
      sourceType: 'pages'
    };
  }

  // 2. Check for thumbnail image or high-res images in Data folder
  const thumbnailFile = zip.file("QuickLook/Thumbnail.jpg") || zip.file("Thumbnails/thumbnail.jpg");
  if (thumbnailFile) {
    const imgData = await thumbnailFile.async("base64");
    const dataUrl = `data:image/jpeg;base64,${imgData}`;
    const page: Page = {
      id: `pages-page-${Date.now()}-1`,
      pageNumber: 1,
      backgroundType: 'pages' as any,
      backgroundImageData: dataUrl,
      width: 820,
      height: 1160,
      strokes: [],
      textBlocks: [
        {
          id: `tb-pages-note`,
          x: 60,
          y: 40,
          width: 700,
          height: 60,
          text: `Anteprima estratta da ${file.name}. Per qualità vettoriale perfetta con tutte le pagine, aprilo su Pages e tocca Esporta > PDF.`,
          fontSize: 14,
          color: '#475569',
          fontFamily: 'system-ui'
        }
      ]
    };

    return {
      title: file.name.replace(/\.pages$/i, ''),
      pages: [page],
      sourceType: 'pages',
      warning: 'File Pages importato tramite anteprima QuickLook. Per pagine multiple, esporta da Pages come PDF.'
    };
  }

  // 3. Informative error with clear iPad instructions
  throw new Error(
    "Questo file Pages non contiene un'anteprima PDF incorporata (impostazione predefinita di iOS Pages). Per importarlo in 3 secondi: aprilo nell'app Pages sul tuo iPad, tocca Condividi (in alto a destra) > Esporta > PDF e selezionalo qui!"
  );
}

/**
 * Import a Word document (.docx)
 */
export async function importWordDocx(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const conversionResult = await mammoth.convertToHtml({ arrayBuffer });
  const htmlContent = conversionResult.value;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const elements = Array.from(tempDiv.children);

  const pages: Page[] = [];
  const pageWidth = 820;
  const pageHeight = 1160;
  const maxContentHeightPerPage = 980;

  let currentPageBlocks: any[] = [];
  let currentY = 80;
  let pageNum = 1;

  for (const el of elements) {
    const text = el.textContent?.trim();
    if (!text) continue;

    const isHeading1 = el.tagName === 'H1';
    const isHeading2 = el.tagName === 'H2';
    const isHeading3 = el.tagName === 'H3';

    let fontSize = 16;
    let color = '#1e293b';
    let blockHeight = Math.max(30, Math.ceil(text.length / 55) * 26);

    if (isHeading1) {
      fontSize = 28;
      color = '#0f172a';
      blockHeight = 50;
    } else if (isHeading2) {
      fontSize = 22;
      color = '#1e293b';
      blockHeight = 40;
    } else if (isHeading3) {
      fontSize = 18;
      color = '#334155';
      blockHeight = 34;
    }

    if (currentY + blockHeight > maxContentHeightPerPage && currentPageBlocks.length > 0) {
      pages.push({
        id: `docx-page-${Date.now()}-${pageNum}`,
        pageNumber: pageNum,
        backgroundType: 'word',
        width: pageWidth,
        height: pageHeight,
        strokes: [],
        textBlocks: [...currentPageBlocks]
      });
      pageNum++;
      currentPageBlocks = [];
      currentY = 80;
    }

    currentPageBlocks.push({
      id: `docx-tb-${Date.now()}-${Math.random()}`,
      x: 70,
      y: currentY,
      width: 680,
      height: blockHeight,
      text: text,
      fontSize: fontSize,
      color: color,
      fontFamily: 'system-ui'
    });

    currentY += blockHeight + 16;
  }

  if (currentPageBlocks.length > 0 || pages.length === 0) {
    pages.push({
      id: `docx-page-${Date.now()}-${pageNum}`,
      pageNumber: pageNum,
      backgroundType: 'word',
      width: pageWidth,
      height: pageHeight,
      strokes: [],
      textBlocks: currentPageBlocks
    });
  }

  return {
    title: file.name.replace(/\.docx$/i, ''),
    pages,
    sourceType: 'docx'
  };
}

/**
 * Import an image as a page
 */
export async function importImage(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > 1200) {
          const ratio = 1200 / width;
          width = 1200;
          height = Math.round(height * ratio);
        }

        const page: Page = {
          id: `img-page-${Date.now()}-1`,
          pageNumber: 1,
          backgroundType: 'image',
          backgroundImageData: dataUrl,
          width: width || 820,
          height: height || 1160,
          strokes: [],
          textBlocks: []
        };

        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""),
          pages: [page],
          sourceType: 'image'
        });
      };
      img.onerror = () => reject(new Error('Impossibile caricare l\'immagine'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Errore durante la lettura del file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Universal file importer dispatcher with Binary Magic Bytes check
 */
export async function importAnyDocument(file: File): Promise<ImportResult> {
  // Read first 12 bytes to detect true binary format
  const slice = await file.slice(0, 12).arrayBuffer();
  const headerBytes = new Uint8Array(slice);
  const headerStr = String.fromCharCode(...headerBytes.slice(0, 5));

  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. PDF Check: either starts with "%PDF" or has application/pdf MIME or .pdf extension
  if (headerStr.startsWith('%PDF') || file.type === 'application/pdf' || extension === 'pdf') {
    return importPdf(file, file.name);
  }

  // 2. ZIP archives: DOCX or Apple Pages
  if (headerBytes[0] === 0x50 && headerBytes[1] === 0x4B) { // 'PK' magic bytes
    if (extension === 'docx' || file.type.includes('wordprocessingml')) {
      return importWordDocx(file);
    }
    if (extension === 'pages' || file.name.toLowerCase().includes('.pages')) {
      return importPagesFile(file);
    }
    // Ambiguous zip: check internal files
    try {
      const zip = await JSZip.loadAsync(file.slice(0));
      if (zip.file("word/document.xml")) {
        return importWordDocx(file);
      }
      if (zip.file("QuickLook/Preview.pdf") || zip.file("Index/Document.iwa")) {
        return importPagesFile(file);
      }
    } catch (_) {}
  }

  // 3. Fallbacks
  if (extension === 'pages') {
    return importPagesFile(file);
  }
  if (extension === 'docx') {
    return importWordDocx(file);
  }
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension) || file.type.startsWith('image/')) {
    return importImage(file);
  }

  // If unsure, attempt PDF as last resort
  try {
    return await importPdf(file, file.name);
  } catch (_) {
    throw new Error(
      `Formato non riconosciuto (${file.name}). I formati supportati sono PDF, Word (.docx), Apple Pages (.pages) e immagini.`
    );
  }
}
