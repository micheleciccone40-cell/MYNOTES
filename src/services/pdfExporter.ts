import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Notebook, Page } from '../types';
import { drawStrokeToContext } from '../utils/drawing';

/**
 * Renders a full page with background template, Word HTML text, floating images, and pencil strokes
 */
export async function renderPageToCanvas(page: Page, paperTemplate: string): Promise<HTMLCanvasElement> {
  // If the page has rich Word HTML content or floating images, create a temporary DOM element to render via html2canvas
  if (page.contentHtml || (page.images && page.images.length > 0)) {
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${page.width}px`;
    tempContainer.style.minHeight = `${page.height}px`;
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.backgroundColor = paperTemplate.startsWith('dark') ? '#1e293b' : '#ffffff';
    tempContainer.style.color = paperTemplate.startsWith('dark') ? '#f1f5f9' : '#0f172a';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.overflow = 'hidden';

    // 1. PDF Background if present
    if (page.backgroundImageData) {
      const bgImg = document.createElement('img');
      bgImg.src = page.backgroundImageData;
      bgImg.style.position = 'absolute';
      bgImg.style.inset = '0';
      bgImg.style.width = '100%';
      bgImg.style.height = '100%';
      bgImg.style.objectFit = 'contain';
      tempContainer.appendChild(bgImg);
    }

    // 2. Word Rich Text content
    const contentDiv = document.createElement('div');
    contentDiv.style.width = '100%';
    contentDiv.style.minHeight = `${page.height}px`;
    contentDiv.style.padding = '64px 60px';
    contentDiv.style.boxSizing = 'border-box';
    contentDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    contentDiv.style.lineHeight = '1.7';
    contentDiv.innerHTML = page.contentHtml || '';
    tempContainer.appendChild(contentDiv);

    // 3. Floating Images
    if (page.images) {
      for (const img of page.images) {
        const floatImg = document.createElement('img');
        floatImg.src = img.src;
        floatImg.style.position = 'absolute';
        floatImg.style.left = `${img.x}px`;
        floatImg.style.top = `${img.y}px`;
        floatImg.style.width = `${img.width}px`;
        floatImg.style.height = `${img.height}px`;
        floatImg.style.objectFit = 'cover';
        floatImg.style.borderRadius = '8px';
        tempContainer.appendChild(floatImg);
      }
    }

    document.body.appendChild(tempContainer);

    try {
      const renderedCanvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: paperTemplate.startsWith('dark') ? '#1e293b' : '#ffffff'
      });

      document.body.removeChild(tempContainer);

      // Superimpose Apple Pencil ink strokes
      const ctx = renderedCanvas.getContext('2d');
      if (ctx && page.strokes) {
        ctx.save();
        ctx.scale(1.5, 1.5);
        for (const stroke of page.strokes) {
          drawStrokeToContext(ctx, stroke);
        }
        ctx.restore();
      }

      return renderedCanvas;
    } catch (e) {
      console.warn('html2canvas render failed, falling back to 2D canvas', e);
      document.body.removeChild(tempContainer);
    }
  }

  // Fallback direct 2D canvas rendering
  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = paperTemplate.startsWith('dark') ? '#1e293b' : '#ffffff';
  ctx.fillRect(0, 0, page.width, page.height);

  if (page.backgroundImageData) {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, page.width, page.height);
        resolve();
      };
      img.onerror = reject;
      img.src = page.backgroundImageData!;
    });
  }

  // Draw floating images
  if (page.images) {
    for (const floatImg of page.images) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, floatImg.x, floatImg.y, floatImg.width, floatImg.height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = floatImg.src;
      });
    }
  }

  // Draw Strokes
  if (page.strokes) {
    for (const stroke of page.strokes) {
      drawStrokeToContext(ctx, stroke);
    }
  }

  return canvas;
}

/**
 * Export notebook to PDF and trigger browser download
 */
export async function exportNotebookToPdf(notebook: Notebook, onProgress?: (current: number, total: number) => void) {
  if (notebook.pages.length === 0) return;

  const firstPage = notebook.pages[0];
  const orientation = firstPage.width > firstPage.height ? 'l' : 'p';
  
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'px',
    format: [firstPage.width, firstPage.height],
    hotfixes: ['px_scaling']
  });

  for (let i = 0; i < notebook.pages.length; i++) {
    const page = notebook.pages[i];
    if (onProgress) onProgress(i + 1, notebook.pages.length);

    if (i > 0) {
      const pageOrientation = page.width > page.height ? 'l' : 'p';
      doc.addPage([page.width, page.height], pageOrientation);
    }

    const canvas = await renderPageToCanvas(page, notebook.paperTemplate);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, page.width, page.height);
  }

  doc.save(`${notebook.title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);
}
