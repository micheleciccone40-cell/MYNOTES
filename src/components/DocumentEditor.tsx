import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Page, Stroke, FloatingImage, ToolType } from '../types';
import { drawStrokeToContext, isPointNearStroke } from '../utils/drawing';
import { Undo2, Redo2, Trash2, Move } from 'lucide-react';

interface DocumentEditorProps {
  page: Page;
  paperTemplate: string;
  activeTool: ToolType;
  strokeColor: string;
  strokeSize: number;
  applePencilOnly: boolean;
  onUpdatePage: (updated: Partial<Page>) => void;
  onAddStroke: (stroke: Stroke) => void;
  onDeleteStroke: (strokeId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  zoom?: number;
  editorRef?: React.RefObject<HTMLDivElement | null>;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  page,
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
  canUndo = false,
  canRedo = false,
  zoom = 1,
  editorRef: externalEditorRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalEditorRef = useRef<HTMLDivElement | null>(null);
  const richEditorRef = externalEditorRef || internalEditorRef;

  // In-progress stroke
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<[number, number, number][]>([]);

  // 2-Finger tap gesture tracking for Undo
  const touchStartTimeRef = useRef<number>(0);
  const touchStartCountRef = useRef<number>(0);
  const [gestureToast, setGestureToast] = useState<string | null>(null);

  // Selected floating image for moving/resizing
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const isDraggingImageRef = useRef<boolean>(false);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const showToast = (text: string) => {
    setGestureToast(text);
    setTimeout(() => setGestureToast(null), 1200);
  };

  // Redraw canvas with all existing strokes + temporary live stroke
  const redrawCanvas = useCallback((tempStroke?: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of page.strokes) {
      drawStrokeToContext(ctx, stroke);
    }

    if (tempStroke) {
      drawStrokeToContext(ctx, tempStroke);
    }
  }, [page.strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Setup high DPI canvas sizing
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

  // Touch gesture listeners for 2-finger tap (Undo) and 3-finger tap (Redo)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartCountRef.current = e.touches.length;
    if (e.touches.length === 2 || e.touches.length === 3) {
      touchStartTimeRef.current = Date.now();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const duration = Date.now() - touchStartTimeRef.current;

    // 2-FINGER TAP UNDO GESTURE
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

  // Coordinates helper
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): [number, number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0, 0.5];
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return [x, y, pressure];
  };

  // Drawing pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If in Text mode, let the user click directly into the Word document!
    if (activeTool === 'text') {
      return;
    }

    if (touchStartCountRef.current >= 2) return;
    if (applePencilOnly && e.pointerType === 'touch') return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const [x, y, pressure] = getCoordinates(e);

    if (activeTool === 'eraser') {
      isDrawingRef.current = true;
      const strokeToErase = page.strokes.slice().reverse().find(s => isPointNearStroke(x, y, s, 22));
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
      const strokeToErase = page.strokes.slice().reverse().find(s => isPointNearStroke(x, y, s, 20));
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

  // Sync contentEditable changes back to page.contentHtml
  const handleContentInput = () => {
    if (richEditorRef.current) {
      onUpdatePage({ contentHtml: richEditorRef.current.innerHTML });
    }
  };

  // Freeform Image dragging and resizing
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

  // Paper Background style
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
    <div
      ref={containerRef}
      className={`relative mx-auto rounded shadow-[0_20px_50px_rgba(0,0,0,0.6)] select-text transition-all overflow-hidden ${getPaperClass()}`}
      style={{
        width: page.width * zoom,
        minHeight: page.height * zoom,
      }}
      onClick={() => {
        // If clicking on paper in text mode, focus the document surface immediately
        if (activeTool === 'text' && richEditorRef.current) {
          richEditorRef.current.focus();
        }
      }}
    >
      {/* 2-Finger Gesture HUD Toast */}
      {gestureToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2">
          <span>{gestureToast}</span>
        </div>
      )}

      {/* Floating iPad Quick Undo/Redo Thumb Buttons */}
      <div className="absolute bottom-5 left-5 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onUndo) {
              onUndo();
              showToast('↩ Annulla');
            }
          }}
          disabled={!canUndo}
          className={`p-2.5 rounded-xl transition-all ${
            canUndo ? 'text-white hover:bg-white/20 active:scale-95' : 'text-white/30 cursor-not-allowed'
          }`}
          title="Annulla (anche con tap 2 dita sullo schermo!)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onRedo) {
              onRedo();
              showToast('↪ Ripristina');
            }
          }}
          disabled={!canRedo}
          className={`p-2.5 rounded-xl transition-all ${
            canRedo ? 'text-white hover:bg-white/20 active:scale-95' : 'text-white/30 cursor-not-allowed'
          }`}
          title="Ripristina (anche con tap 3 dita!)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* 1. PDF / Background Document Image Layer (if imported) */}
      {page.backgroundImageData && (
        <img
          src={page.backgroundImageData}
          alt={`Pagina ${page.pageNumber}`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      )}

      {/* 2. Direct Word Document Rich-Text Surface ("Scrivo Subito, Niente Blocchi") */}
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

      {/* 3. Freeform Floating Images Layer (Impaginazione libera: sposta dove vuoi!) */}
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
            className={`group rounded-lg select-none ${isSelected ? 'ring-2 ring-blue-500 shadow-2xl' : 'hover:ring-1 hover:ring-blue-300'}`}
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

            {/* Handle for free movement */}
            <div
              onPointerDown={(e) => handleStartMoveImage(e, img)}
              className="absolute -top-3 -left-3 p-1.5 bg-blue-600 text-white rounded-full shadow-lg cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
              title="Trascina per spostare liberamente"
            >
              <Move className="w-3.5 h-3.5" />
            </div>

            {/* Resizing controls */}
            {isSelected && (
              <div className="absolute -bottom-3 -right-3 flex items-center gap-1 bg-[#181a24] border border-slate-700 px-2 py-0.5 rounded-full shadow-lg text-[10px] text-white">
                <button
                  type="button"
                  onClick={(e) => handleResizeImage(e, img, -30)}
                  className="px-1 hover:text-blue-400 font-bold"
                  title="Rimpicciolisci"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={(e) => handleResizeImage(e, img, 30)}
                  className="px-1 hover:text-blue-400 font-bold"
                  title="Ingrandisci"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  className="px-1 text-red-400 hover:text-red-300 ml-1"
                  title="Elimina immagine"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* 4. Apple Pencil Drawing Canvas Overlay */}
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
  );
};
