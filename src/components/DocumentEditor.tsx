import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Page, Stroke, FloatingImage, ToolType } from '../types';
import { drawStrokeToContext, isPointNearStroke } from '../utils/drawing';
import { Undo2, Redo2, Trash2, Move, Plus } from 'lucide-react';

interface DocumentEditorProps {
  pages: Page[];
  paperTemplate: string;
  activeTool: ToolType;
  strokeColor: string;
  strokeSize: number;
  applePencilOnly: boolean;
  onUpdatePage: (pageIndex: number, updated: Partial<Page>) => void;
  onAddStroke: (pageIndex: number, stroke: Stroke) => void;
  onDeleteStroke: (pageIndex: number, strokeId: string) => void;
  onAddPageAt: (index: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  zoom?: number;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  pages,
  paperTemplate,
  activeTool,
  strokeColor,
  strokeSize,
  applePencilOnly,
  onUpdatePage,
  onAddStroke,
  onDeleteStroke,
  onAddPageAt,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  zoom = 1,
}) => {
  const [gestureToast, setGestureToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setGestureToast(text);
    setTimeout(() => setGestureToast(null), 1200);
  };

  return (
    <div className="w-full flex flex-col items-center gap-10 py-6 select-text">
      {/* 2-Finger Gesture HUD Toast */}
      {gestureToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2">
          <span>{gestureToast}</span>
        </div>
      )}

      {/* Floating iPad Quick Undo/Redo Thumb Buttons (in basso a sinistra fisso) */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onUndo) {
              onUndo();
              showToast('↩ Annulla (2 dita)');
            }
          }}
          disabled={!canUndo}
          className={`p-2.5 rounded-xl transition-all ${
            canUndo ? 'text-white hover:bg-white/20 active:scale-95' : 'text-white/30 cursor-not-allowed'
          }`}
          title="Annulla ultimo tratto (anche con tap 2 dita!)"
        >
          <Undo2 className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onRedo) {
              onRedo();
              showToast('↪ Ripristina (3 dita)');
            }
          }}
          disabled={!canRedo}
          className={`p-2.5 rounded-xl transition-all ${
            canRedo ? 'text-white hover:bg-white/20 active:scale-95' : 'text-white/30 cursor-not-allowed'
          }`}
          title="Ripristina (anche con tap 3 dita!)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
      </div>

      {/* CONTINUOUS VERTICAL SCROLLING PAGES LIST */}
      {pages.map((page, index) => (
        <SingleDocumentPage
          key={page.id}
          page={page}
          pageIndex={index}
          totalPages={pages.length}
          paperTemplate={paperTemplate}
          activeTool={activeTool}
          strokeColor={strokeColor}
          strokeSize={strokeSize}
          applePencilOnly={applePencilOnly}
          onUpdatePage={(updates) => onUpdatePage(index, updates)}
          onAddStroke={(stroke) => onAddStroke(index, stroke)}
          onDeleteStroke={(strokeId) => onDeleteStroke(index, strokeId)}
          onAddPageAfter={() => onAddPageAt(index + 1)}
          onUndo={onUndo}
          onRedo={onRedo}
          showToast={showToast}
          zoom={zoom}
        />
      ))}

      {/* Bottom Add Page Button */}
      <div className="py-4">
        <button
          type="button"
          onClick={() => onAddPageAt(pages.length)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1c24] hover:bg-[#252834] text-slate-200 border border-[#2b2e3b] rounded-2xl text-xs font-semibold shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          <span>Aggiungi Nuova Pagina al Documento</span>
        </button>
      </div>
    </div>
  );
};

interface SingleDocumentPageProps {
  page: Page;
  pageIndex: number;
  totalPages: number;
  paperTemplate: string;
  activeTool: ToolType;
  strokeColor: string;
  strokeSize: number;
  applePencilOnly: boolean;
  onUpdatePage: (updated: Partial<Page>) => void;
  onAddStroke: (stroke: Stroke) => void;
  onDeleteStroke: (strokeId: string) => void;
  onAddPageAfter: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  showToast: (msg: string) => void;
  zoom?: number;
}

const SingleDocumentPage: React.FC<SingleDocumentPageProps> = ({
  page,
  pageIndex,
  totalPages,
  paperTemplate,
  activeTool,
  strokeColor,
  strokeSize,
  applePencilOnly,
  onUpdatePage,
  onAddStroke,
  onDeleteStroke,
  onUndo,
  onRedo,
  showToast,
  zoom = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const richEditorRef = useRef<HTMLDivElement | null>(null);

  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<[number, number, number][]>([]);

  // 2-Finger tap gesture tracking
  const touchStartTimeRef = useRef<number>(0);
  const touchStartCountRef = useRef<number>(0);

  // Floating image selection
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const isDraggingImageRef = useRef<boolean>(false);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Redraw canvas
  const redrawCanvas = useCallback((tempStroke?: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of page.strokes || []) {
      drawStrokeToContext(ctx, stroke);
    }

    if (tempStroke) {
      drawStrokeToContext(ctx, tempStroke);
    }
  }, [page.strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // High DPI sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = page.width * dpr;
    canvas.height = page.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    redrawCanvas();
  }, [page.width, page.height, redrawCanvas]);

  // Touch gesture listeners (2-finger tap undo)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartCountRef.current = e.touches.length;
    if (e.touches.length === 2 || e.touches.length === 3) {
      touchStartTimeRef.current = Date.now();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const duration = Date.now() - touchStartTimeRef.current;

    if (touchStartCountRef.current === 2 && duration < 380 && e.touches.length === 0) {
      if (onUndo) {
        onUndo();
        showToast('↩ Annulla (2 dita)');
      }
    } else if (touchStartCountRef.current === 3 && duration < 380 && e.touches.length === 0) {
      if (onRedo) {
        onRedo();
        showToast('↪ Ripristina (3 dita)');
      }
    }
    touchStartCountRef.current = 0;
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): [number, number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0, 0.5];
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return [x, y, pressure];
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'text') return;
    if (touchStartCountRef.current >= 2) return;
    if (applePencilOnly && e.pointerType === 'touch') return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const [x, y, pressure] = getCoordinates(e);

    if (activeTool === 'eraser') {
      isDrawingRef.current = true;
      const strokeToErase = (page.strokes || []).slice().reverse().find(s => isPointNearStroke(x, y, s, 22));
      if (strokeToErase) {
        onDeleteStroke(strokeToErase.id);
      }
      return;
    }

    if (['pen', 'highlighter', 'line', 'rect', 'circle'].includes(activeTool)) {
      isDrawingRef.current = true;
      currentPointsRef.current = [[x, y, pressure]];

      const tempStroke: Stroke = {
        id: 'temp',
        tool: activeTool as any,
        color: strokeColor,
        size: strokeSize,
        opacity: activeTool === 'highlighter' ? 0.38 : 1,
        points: currentPointsRef.current
      };
      redrawCanvas(tempStroke);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (applePencilOnly && e.pointerType === 'touch') return;

    const [x, y, pressure] = getCoordinates(e);

    if (activeTool === 'eraser') {
      const strokeToErase = (page.strokes || []).slice().reverse().find(s => isPointNearStroke(x, y, s, 20));
      if (strokeToErase) {
        onDeleteStroke(strokeToErase.id);
      }
      return;
    }

    currentPointsRef.current.push([x, y, pressure]);

    const tempStroke: Stroke = {
      id: 'temp',
      tool: activeTool as any,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.38 : 1,
      points: currentPointsRef.current
    };
    redrawCanvas(tempStroke);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (activeTool === 'eraser') return;

    if (currentPointsRef.current.length > 0) {
      const finalStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool: activeTool as any,
        color: strokeColor,
        size: strokeSize,
        opacity: activeTool === 'highlighter' ? 0.38 : 1,
        points: [...currentPointsRef.current]
      };
      currentPointsRef.current = [];
      onAddStroke(finalStroke);
    }
  };

  const handleContentInput = () => {
    if (richEditorRef.current) {
      onUpdatePage({ contentHtml: richEditorRef.current.innerHTML });
    }
  };

  const handleStartMoveImage = (e: React.PointerEvent, img: FloatingImage) => {
    e.stopPropagation();
    setSelectedImageId(img.id);
    isDraggingImageRef.current = true;
    dragStartOffsetRef.current = {
      x: e.clientX - img.x,
      y: e.clientY - img.y
    };
  };

  const handleResizeImage = (e: React.MouseEvent, img: FloatingImage, delta: number) => {
    e.stopPropagation();
    const newWidth = Math.max(100, Math.min(750, img.width + delta));
    const ratio = img.height / img.width;
    const newHeight = Math.round(newWidth * ratio);
    const updated = (page.images || []).map(i => i.id === img.id ? { ...i, width: newWidth, height: newHeight } : i);
    onUpdatePage({ images: updated });
  };

  const handleDeleteImage = (imgId: string) => {
    const updated = (page.images || []).filter(i => i.id !== imgId);
    onUpdatePage({ images: updated });
    if (selectedImageId === imgId) setSelectedImageId(null);
  };

  const getPaperClass = () => {
    if (paperTemplate === 'blank') return 'paper-blank';
    if (paperTemplate === 'ruled') return 'paper-ruled';
    if (paperTemplate === 'grid') return 'paper-grid';
    if (paperTemplate === 'dots') return 'paper-dots';
    if (paperTemplate === 'dark-ruled') return 'paper-dark-ruled';
    if (paperTemplate === 'dark-grid') return 'paper-dark-grid';
    return 'paper-blank';
  };

  return (
    <div className="flex flex-col items-center group/page relative">
      {/* Page Header Indicator */}
      <div className="w-full max-w-[820px] flex items-center justify-between px-3 py-1 text-[11px] text-slate-500 font-mono">
        <span>Pagina {pageIndex + 1} di {totalPages}</span>
        <span className="opacity-0 group-hover/page:opacity-100 transition-opacity">Foglio Bianco Word</span>
      </div>

      {/* Sheet Body */}
      <div
        ref={containerRef}
        className={`relative rounded shadow-[0_20px_50px_rgba(0,0,0,0.6)] select-text transition-all overflow-hidden ${getPaperClass()}`}
        style={{
          width: page.width * zoom,
          minHeight: page.height * zoom,
        }}
        onClick={() => {
          if (activeTool === 'text' && richEditorRef.current) {
            richEditorRef.current.focus();
          }
        }}
      >
        {/* PDF Background (if raster/scanned PDF) */}
        {page.backgroundImageData && (
          <img
            src={page.backgroundImageData}
            alt={`Pagina ${page.pageNumber}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}

        {/* Real Editable Word Rich Text Surface */}
        <div
          ref={richEditorRef}
          contentEditable={activeTool === 'text'}
          suppressContentEditableWarning
          onInput={handleContentInput}
          onBlur={handleContentInput}
          style={{
            minHeight: `${page.height}px`,
            padding: '64px 60px',
            outline: 'none',
            color: paperTemplate.startsWith('dark') ? '#f1f5f9' : '#0f172a',
            fontSize: '16px',
            lineHeight: '1.7',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          className="w-full prose max-w-none cursor-text leading-relaxed select-text"
          dangerouslySetInnerHTML={{ __html: page.contentHtml || '<p><br></p>' }}
        />

        {/* Freeform Floating Images */}
        {(page.images || []).map((img) => {
          const isSelected = selectedImageId === img.id;
          return (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                left: `${img.x}px`,
                top: `${img.y}px`,
                width: `${img.width}px`,
                height: `${img.height}px`,
                zIndex: 25,
              }}
              className={`group/img rounded-lg select-none ${isSelected ? 'ring-2 ring-blue-500 shadow-2xl' : 'hover:ring-1 hover:ring-blue-300'}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageId(img.id);
              }}
            >
              <img
                src={img.src}
                alt="Immagine inserita"
                className="w-full h-full object-cover rounded-lg pointer-events-none"
                draggable={false}
              />

              <div
                onPointerDown={(e) => handleStartMoveImage(e, img)}
                className="absolute -top-3 -left-3 p-1.5 bg-blue-600 text-white rounded-full shadow-lg cursor-move opacity-0 group-hover/img:opacity-100 transition-opacity"
                title="Trascina per spostare liberamente"
              >
                <Move className="w-3.5 h-3.5" />
              </div>

              {isSelected && (
                <div className="absolute -bottom-3 -right-3 flex items-center gap-1 bg-[#181a24] border border-slate-700 px-2 py-0.5 rounded-full shadow-lg text-[10px] text-white">
                  <button
                    type="button"
                    onClick={(e) => handleResizeImage(e, img, -30)}
                    className="px-1 hover:text-blue-400 font-bold"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleResizeImage(e, img, 30)}
                    className="px-1 hover:text-blue-400 font-bold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="px-1 text-red-400 hover:text-red-300 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Apple Pencil Canvas Layer */}
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: page.width * zoom,
            height: page.height * zoom,
            pointerEvents: activeTool === 'text' ? 'none' : 'auto',
          }}
          className="drawing-layer absolute inset-0 cursor-crosshair z-20"
        />
      </div>
    </div>
  );
};
