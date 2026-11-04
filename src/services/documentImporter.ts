import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { Page } from '../types';

// Set up local PDF.js worker served directly by Vite
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
 * Extracts real text content and rich structure (bold, italics, headings, columns) from a PDF page
 * and converts it into editable Word-style HTML
 */
async function convertPdfPageToEditableHtml(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName?: string;
  }>;

  if (!items || items.length === 0) {
    return '<p><br></p>';
  }

  const styles = (textContent.styles || {}) as Record<string, { fontFamily?: string }>;

  // Sort items by Y descending (top to bottom), then by X ascending (left to right)
  const sortedItems = [...items].sort((a, b) => {
    const yA = a.transform[5];
    const yB = b.transform[5];
    const yDiff = yB - yA;
    if (Math.abs(yDiff) > 6) {
      return yDiff; // Different lines
    }
    return a.transform[4] - b.transform[4]; // Same line, left to right
  });

  interface TextChunk {
    text: string;
    isBold: boolean;
    isItalic: boolean;
    x: number;
    width: number;
  }

  interface TextLine {
    y: number;
    fontSize: number;
    chunks: TextChunk[];
  }

  const lines: TextLine[] = [];
  let currentLine: TextLine | null = null;

  for (const item of sortedItems) {
    const text = item.str;
    if (!text && text !== ' ') continue;

    const x = Math.round(item.transform[4]);
    const y = Math.round(item.transform[5]);
    const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1]));

    const fontId = item.fontName || '';
    const styleObj = styles[fontId] || {};
    const fontDesc = (fontId + ' ' + (styleObj.fontFamily || '')).toLowerCase();
    const isBold = fontDesc.includes('bold') || fontDesc.includes('black') || fontDesc.includes('heavy') || fontDesc.includes('semibold');
    const isItalic = fontDesc.includes('italic') || fontDesc.includes('oblique');

    const chunk: TextChunk = {
      text,
      isBold,
      isItalic,
      x,
      width: Math.round(item.width || 0)
    };

    if (!currentLine || Math.abs(currentLine.y - y) > 6) {
      if (currentLine && currentLine.chunks.length > 0) {
        lines.push(currentLine);
      }
      currentLine = { y, fontSize, chunks: [chunk] };
    } else {
      currentLine.chunks.push(chunk);
      currentLine.fontSize = Math.max(currentLine.fontSize, fontSize);
    }
  }

  if (currentLine && currentLine.chunks.length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return '<p><br></p>';
  }

  // Calculate median body font size to detect headings vs regular text
  const fontSizes = lines.map(l => l.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  // Build semantic editable HTML preserving bold, italics and table/column gaps
  let html = '';
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineText = line.chunks.map(c => c.text).join('').trim();
    if (!lineText) continue;

    const isLargeHeading = line.fontSize >= medianFontSize * 1.45;
    const isMediumHeading = line.fontSize >= medianFontSize * 1.2 && !isLargeHeading;

    // Build line HTML preserving bold, italics and spacing between table columns
    let lineContentHtml = '';
    for (let c = 0; c < line.chunks.length; c++) {
      const chunk = line.chunks[c];
      const prevChunk = c > 0 ? line.chunks[c - 1] : null;

      // Detect table column separation or large horizontal indentation
      if (prevChunk) {
        const gap = chunk.x - (prevChunk.x + prevChunk.width);
        if (gap > 24) {
          // Table column / tab gap
          lineContentHtml += `<span style="display:inline-block; min-width: ${Math.min(180, Math.max(24, gap))}px;"> </span>`;
        } else if (!prevChunk.text.endsWith(' ') && !chunk.text.startsWith(' ')) {
          lineContentHtml += ' ';
        }
      }

      let formattedText = escapeHtml(chunk.text);
      if (chunk.isBold && chunk.isItalic) {
        formattedText = `<strong><em>${formattedText}</em></strong>`;
      } else if (chunk.isBold) {
        formattedText = `<strong>${formattedText}</strong>`;
      } else if (chunk.isItalic) {
        formattedText = `<em>${formattedText}</em>`;
      }

      lineContentHtml += formattedText;
    }

    if (isLargeHeading) {
      if (inParagraph) {
        html += '</p>\n';
        inParagraph = false;
      }
      html += `<h1 style="font-size: 24px; font-weight: 700; margin: 22px 0 10px; color: #0f172a; line-height: 1.3;">${lineContentHtml}</h1>\n`;
    } else if (isMediumHeading) {
      if (inParagraph) {
        html += '</p>\n';
        inParagraph = false;
      }
      html += `<h2 style="font-size: 19px; font-weight: 600; margin: 18px 0 8px; color: #1e293b; line-height: 1.4;">${lineContentHtml}</h2>\n`;
    } else {
      if (!inParagraph) {
        html += `<p style="font-size: 16px; line-height: 1.7; margin-bottom: 12px; color: #1e293b;">`;
        inParagraph = true;
      } else {
        html += ' ';
      }
      html += lineContentHtml;

      // End paragraph if line ends with period or punctuation
      if (lineText.endsWith('.') || lineText.endsWith(':') || lineText.endsWith('?') || lineText.endsWith('!')) {
        html += '</p>\n';
        inParagraph = false;
      }
    }
  }

  if (inParagraph) {
    html += '</p>\n';
  }

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Import a PDF document and convert into 100% EDITABLE Word-style pages!
 */
export async function importPdf(file: File | Blob, originalFileName: string): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();

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

    // 1. Extract REAL editable HTML text from the PDF!
    const editableHtml = await convertPdfPageToEditableHtml(page);

    // 2. If PDF has no extractable digital text (e.g. scanned notes or image slides), render canvas fallback
    let backgroundImageData: string | undefined = undefined;
    const plainText = (editableHtml || '').replace(/<[^>]*>?/gm, '').trim();
    if (plainText.length < 8) {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        backgroundImageData = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    pages.push({
      id: `pdf-page-${Date.now()}-${i}`,
      pageNumber: i,
      backgroundType: 'word', // Convert to editable Word format!
      width: 820,
      height: 1160,
      contentHtml: editableHtml || '<p><br></p>',
      backgroundImageData,
      images: [],
      strokes: []
    });
  }

  const cleanTitle = originalFileName.replace(/\.[^/.]+$/, "");
  return {
    title: cleanTitle || 'Documento Convertito',
    pages,
    sourceType: 'pdf'
  };
}

/**
 * Import an Apple Pages (.pages) file
 */
export async function importPagesFile(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Look for QuickLook/Preview.pdf or preview.pdf inside the pages archive
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

  throw new Error(
    "Questo file Pages non contiene un'anteprima PDF incorporata (impostazione predefinita di iOS Pages). Per importarlo in 3 secondi: aprilo nell'app Pages sul tuo iPad, tocca Condividi (in alto a destra) > Esporta > PDF e selezionalo qui!"
  );
}

/**
 * Import a Word document (.docx)
 * Converts directly into clean Word-style blank pages with rich HTML formatting!
 */
export async function importWordDocx(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const conversionResult = await mammoth.convertToHtml({ arrayBuffer });
  const htmlContent = conversionResult.value;

  const page: Page = {
    id: `docx-page-${Date.now()}-1`,
    pageNumber: 1,
    backgroundType: 'word',
    width: 820,
    height: 1160,
    strokes: [],
    images: [],
    contentHtml: htmlContent || '<p>Documento Word vuoto</p>'
  };

  return {
    title: file.name.replace(/\.docx$/i, ''),
    pages: [page],
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
          images: [],
          contentHtml: ''
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
  const slice = await file.slice(0, 12).arrayBuffer();
  const headerBytes = new Uint8Array(slice);
  const headerStr = String.fromCharCode(...headerBytes.slice(0, 5));
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. PDF Check
  if (headerStr.startsWith('%PDF') || file.type === 'application/pdf' || extension === 'pdf') {
    return importPdf(file, file.name);
  }

  // 2. ZIP archives: DOCX or Apple Pages
  if (headerBytes[0] === 0x50 && headerBytes[1] === 0x4B) {
    if (extension === 'docx' || file.type.includes('wordprocessingml')) {
      return importWordDocx(file);
    }
    if (extension === 'pages' || file.name.toLowerCase().includes('.pages')) {
      return importPagesFile(file);
    }
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
  if (extension === 'pages') return importPagesFile(file);
  if (extension === 'docx') return importWordDocx(file);
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension) || file.type.startsWith('image/')) {
    return importImage(file);
  }

  try {
    return await importPdf(file, file.name);
  } catch (_) {
    throw new Error(
      `Formato non riconosciuto (${file.name}). I formati supportati sono PDF, Word (.docx), Apple Pages (.pages) e immagini.`
    );
  }
}
