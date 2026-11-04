import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Page, Stroke, FloatingImage, ToolType } from '../types';
import { drawStrokeToContext, isPointNearStroke, straightenHighlighterPoints } from '../utils/drawing';
import { pdfBookManager } from '../services/pdfBookManager';
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
  onChangeZoom?: (zoom: number) => void;
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
  onChangeZoom,
}) => {
  const [gestureToast, setGestureToast] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Single gesture controller for pinch-to-zoom
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(zoom);
  const isPinchingRef = useRef<boolean>(false);

  const showToast = (text: string) => {
    setGestureToast(text);
    setTimeout(() => setGestureToast(null), 1000);
  };

  // Safari Gesture & Trackpad Wheel Listener
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Safari iOS Gesture Event (smoothest native pinch)
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      pinchStartZoomRef.current = zoom;
      isPinchingRef.current = true;
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      if (!onChangeZoom) return;
      const targetZoom = Number(Math.min(2.5, Math.max(0.4, pinchStartZoomRef.current * e.scale)).toFixed(2));
      onChangeZoom(targetZoom);
      showToast(`🔍 ${Math.round(targetZoom * 100)}%`);
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
      setTimeout(() => {
        isPinchingRef.current = false;
      }, 150);
    };

    // Trackpad Pinch & Ctrl+Wheel zoom
    const handleWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && onChangeZoom) {
        e.preventDefault();
        const delta = -e.deltaY * 0.003;
        const targetZoom = Number(Math.min(2.5, Math.max(0.4, zoom + delta)).toFixed(2));
        onChangeZoom(targetZoom);
        showToast(`🔍 ${Math.round(targetZoom * 100)}%`);
      }
    };

    el.addEventListener('gesturestart', handleGestureStart as any, { passive: false });
    el.addEventListener('gesturechange', handleGestureChange as any, { passive: false });
    el.addEventListener('gestureend', handleGestureEnd as any, { passive: false });
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('gesturestart', handleGestureStart as any);
      el.removeEventListener('gesturechange', handleGestureChange as any);
      el.removeEventListener('gestureend', handleGestureEnd as any);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, onChangeZoom]);

  // Touch fallback pinch-to-zoom (for standard touch events across Android/iOS)
  const handleTouchStartWrapper = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      isPinchingRef.current = false;
    }
  };

  const handleTouchMoveWrapper = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current && onChangeZoom) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = Math.abs(currentDist - pinchStartDistRef.current);
      if (diff > 10) {
        isPinchingRef.current = true;
        const scale = currentDist / pinchStartDistRef.current;
        const targetZoom = Number(Math.min(2.5, Math.max(0.4, pinchStartZoomRef.current * scale)).toFixed(2));
        onChangeZoom(targetZoom);
        showToast(`🔍 ${Math.round(targetZoom * 100)}%`);
      }
    }
  };

  const handleTouchEndWrapper = () => {
    pinchStartDistRef.current = null;
    setTimeout(() => {
      isPinchingRef.current = false;
    }, 150);
  };

  return (
    <div
      ref={wrapperRef}
      onTouchStart={handleTouchStartWrapper}
      onTouchMove={handleTouchMoveWrapper}
      onTouchEnd={handleTouchEndWrapper}
      className="w-full flex flex-col items-center gap-10 py-6 select-text"
    >
      {/* Zoom / Gesture Toast HUD */}
      {gestureToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in duration-100">
          <span>{gestureToast}</span>
        </div>
      )}

      {/* Floating iPad Quick Undo/Redo Thumb Buttons */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
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
              showToast('↪ Ripristina');
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
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1c24] hover:bg-[#252834] text-slate-200 border border-[#2b2e3b] rounded-2xl text-xs font-semibold shadow-lg transition-all active:scale-95"
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
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const richEditorRef = useRef<HTMLDivElement | null>(null);

  const isBookPage = page.backgroundType === 'pdf' && !!page.bookPdfId;
  const [isVisible, setIsVisible] = useState(pageIndex < 2);
  const [isPdfRendered, setIsPdfRendered] = useState(false);

  // Lazy render observer to keep iPad memory low even with 400+ page books!
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else if (pageIndex >= 3) {
          // Offload canvas when very far from viewport to preserve iPad memory
          setIsVisible(false);
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageIndex]);

  // Render raw PDF page when visible
  useEffect(() => {
    if (!isVisible || !isBookPage || !page.bookPdfId || !pdfCanvasRef.current) return;
    let isCancelled = false;
    pdfBookManager.renderPageToCanvas(page.bookPdfId, page.pageNumber, pdfCanvasRef.current, page.width)
      .then(() => {
        if (!isCancelled) setIsPdfRendered(true);
      })
      .catch((err) => {
        if (!isCancelled) console.warn('Render error:', err);
      });
    return () => { isCancelled = true; };
  }, [isVisible, isBookPage, page.bookPdfId, page.pageNumber, page.width]);

  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<[number, number, number][]>([]);

  // 2-Finger tap gesture tracking for Undo/Redo
  const touchStartTimeRef = useRef<number>(0);
  const touchStartCountRef = useRef<number>(0);
  const touchMovedDistRef = useRef<number>(0);
  const touchInitialPosRef = useRef<{ x: number; y: number } | null>(null);

  // Floating image selection
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const isDraggingImageRef = useRef<boolean>(false);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Redraw canvas with high-fidelity strokes
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

  // 2-Finger Tap detection (Undo / Redo) without conflicting with zoom pinch
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartCountRef.current = e.touches.length;
    touchStartTimeRef.current = Date.now();
    touchMovedDistRef.current = 0;
    if (e.touches.length > 0) {
      touchInitialPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (touchInitialPosRef.current && e.touches.length > 0) {
      const dx = e.touches[0].clientX - touchInitialPosRef.current.x;
      const dy = e.touches[0].clientY - touchInitialPosRef.current.y;
      touchMovedDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const duration = Date.now() - touchStartTimeRef.current;
    const moved = touchMovedDistRef.current;

    // Only trigger if fingers DID NOT drag/pinch (moved < 12px) and was a quick tap (< 350ms)
    if (moved < 12 && duration < 350 && e.touches.length === 0) {
      if (touchStartCountRef.current === 2 && onUndo) {
        onUndo();
        showToast('↩ Annulla (2 dita)');
      } else if (touchStartCountRef.current === 3 && onRedo) {
        onRedo();
        showToast('↪ Ripristina (3 dita)');
      }
    }

    touchStartCountRef.current = 0;
    touchInitialPosRef.current = null;
  };

  // TRUE WORD COORDINATES CALCULATION:
  // Since the canvas is visually scaled by CSS transform: scale(zoom),
  // rect.width = page.width * zoom.
  // Dividing (clientX - rect.left) by zoom yields the exact coordinate on the unscaled 820px sheet!
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

    // Apple Pencil Palm rejection
    if (applePencilOnly && e.pointerType === 'touch') {
      return;
    }

    // Eraser Tool
    if (activeTool === 'eraser') {
      const [x, y] = getCoordinates(e);
      const hit = (page.strokes || []).find((s) => isPointNearStroke(x, y, s, 15));
      if (hit) {
        onDeleteStroke(hit.id);
      }
      isDrawingRef.current = true;
      return;
    }

    // Pen / Highlighter Drawing
    isDrawingRef.current = true;
    const coords = getCoordinates(e);
    currentPointsRef.current = [coords];

    const tempStroke: Stroke = {
      id: `stroke-temp-${Date.now()}`,
      tool: activeTool as any,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.48 : 1.0,
      points: currentPointsRef.current
    };
    redrawCanvas(tempStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    if (applePencilOnly && e.pointerType === 'touch') {
      return;
    }

    const coords = getCoordinates(e);

    if (activeTool === 'eraser') {
      const [x, y] = coords;
      const hit = (page.strokes || []).find((s) => isPointNearStroke(x, y, s, 15));
      if (hit) {
        onDeleteStroke(hit.id);
      }
      return;
    }

    currentPointsRef.current.push(coords);

    const tempStroke: Stroke = {
      id: `stroke-temp-${Date.now()}`,
      tool: activeTool as any,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.48 : 1.0,
      points: currentPointsRef.current
    };
    redrawCanvas(tempStroke);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool !== 'eraser' && currentPointsRef.current.length > 0) {
      let finalPoints = currentPointsRef.current;
      if (activeTool === 'highlighter') {
        finalPoints = straightenHighlighterPoints(finalPoints);
      }

      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tool: activeTool as any,
        color: strokeColor,
        size: strokeSize,
        opacity: activeTool === 'highlighter' ? 0.48 : 1.0,
        points: finalPoints
      };
      onAddStroke(newStroke);
    }
    currentPointsRef.current = [];
    redrawCanvas();
  };

  const handleContentInput = () => {
    if (!richEditorRef.current) return;
    onUpdatePage({ contentHtml: richEditorRef.current.innerHTML });
  };

  const handleStartMoveImage = (e: React.PointerEvent, img: FloatingImage) => {
    e.stopPropagation();
    setSelectedImageId(img.id);
    isDraggingImageRef.current = true;
    dragStartOffsetRef.current = {
      x: e.clientX / zoom - img.x,
      y: e.clientY / zoom - img.y
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
    if (paperTemplate === 'dark-blank') return 'paper-dark-blank';
    if (paperTemplate === 'dark-ruled') return 'paper-dark-ruled';
    if (paperTemplate === 'dark-grid') return 'paper-dark-grid';
    return 'paper-blank';
  };

  return (
    <div className="flex flex-col items-center group/page select-text">
      {/* Page Header Indicator */}
      <div
        className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1 transition-all"
        style={{ width: `${page.width * zoom}px` }}
      >
        <span>{isBookPage ? 'Libro' : 'Pagina'} {pageIndex + 1} di {totalPages}</span>
        <span className="opacity-0 group-hover/page:opacity-100 transition-opacity text-slate-400">
          {isBookPage ? 'PDF Fedele Originale' : 'Formato Word A4'} • {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* 
        TRUE WORD ZOOM ARCHITECTURE:
        Outer container holds layout space for the scaled page (width: page.width * zoom).
        Inner sheet keeps fixed width so strokes and background never shift, scaled via CSS transform!
      */}
      <div
        style={{
          width: `${page.width * zoom}px`,
          height: `${page.height * zoom}px`,
        }}
        className="relative overflow-hidden rounded shadow-[0_20px_50px_rgba(0,0,0,0.65)] bg-white transition-size duration-75"
      >
        <div
          ref={containerRef}
          className={`relative select-text transition-transform duration-75 ${getPaperClass()}`}
          style={{
            width: `${page.width}px`,
            height: `${page.height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          onClick={() => {
            if (!isBookPage && activeTool === 'text' && richEditorRef.current) {
              richEditorRef.current.focus();
            }
          }}
        >
          {/* High-Fidelity Vector Book PDF Canvas (Crisp 100% original layout) */}
          {isBookPage ? (
            <div className="absolute inset-0 w-full h-full bg-white flex items-center justify-center">
              <canvas
                ref={pdfCanvasRef}
                className="w-full h-full object-contain pointer-events-none"
              />
              {!isPdfRendered && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5">
                  <span className="text-[11px] text-slate-400 font-mono">Caricamento pagina {page.pageNumber}...</span>
                </div>
              )}
            </div>
          ) : page.backgroundImageData ? (
            <img
              src={page.backgroundImageData}
              alt={`Pagina ${page.pageNumber}`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : null}

          {/* Real Word Rich Text Surface (Hidden for books, enabled for Word docs) */}
          {!isBookPage && (
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
          )}

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
                  title="Trascina per spostare"
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
                      <Trash2 className="w-3.5 h-3.5" />
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
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: `${page.width}px`,
              height: `${page.height}px`,
              pointerEvents: activeTool === 'text' ? 'none' : 'auto',
            }}
            className="drawing-layer absolute inset-0 cursor-crosshair z-20"
          />
        </div>
      </div>
    </div>
  );
};
