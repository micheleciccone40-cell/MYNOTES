import { jsPDF } from 'jspdf';
import type { Notebook, Page } from '../types';
import { drawStrokeToContext } from '../utils/drawing';

/**
 * Renders a full page with background template, PDF background, strokes, and text blocks to a high-res canvas
 */
export async function renderPageToCanvas(page: Page, paperTemplate: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 1. Draw Paper Background
  if (page.backgroundType === 'pdf' || page.backgroundType === 'image' || page.backgroundImageData) {
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
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, page.width, page.height);
    }
  } else {
    // Standard template
    const isDark = paperTemplate.startsWith('dark-');
    ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, page.width, page.height);

    // Draw lines/grid if template requires
    if (paperTemplate.includes('ruled')) {
      ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = 32; y < page.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(page.width, y);
        ctx.stroke();
      }
    } else if (paperTemplate.includes('grid')) {
      ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = 24; x < page.width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, page.height);
        ctx.stroke();
      }
      for (let y = 24; y < page.height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(page.width, y);
        ctx.stroke();
      }
    } else if (paperTemplate.includes('dots')) {
      ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
      for (let x = 24; x < page.width; x += 24) {
        for (let y = 24; y < page.height; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 2. Draw Text Blocks
  for (const block of page.textBlocks) {
    ctx.save();
    ctx.font = `${block.fontSize}px ${block.fontFamily || 'system-ui, sans-serif'}`;
    ctx.fillStyle = block.color;
    
    // Multi-line support
    const lines = block.text.split('\n');
    let currentY = block.y + block.fontSize;
    for (const line of lines) {
      ctx.fillText(line, block.x, currentY);
      currentY += block.fontSize * 1.3;
    }
    ctx.restore();
  }

  // 3. Draw Digital Ink Strokes (Apple Pencil annotations)
  for (const stroke of page.strokes) {
    drawStrokeToContext(ctx, stroke);
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
