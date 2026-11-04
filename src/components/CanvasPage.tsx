import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Page, Stroke, TextBlock, ToolType } from '../types';
import { drawStrokeToContext, isPointNearStroke } from '../utils/drawing';
import { Undo2, Redo2 } from 'lucide-react';

interface CanvasPageProps {
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
}

export const CanvasPage: React.FC<CanvasPageProps> = ({
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // In-progress stroke
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<[number, number, number][]>([]);
  const [activeTextBlockId, setActiveTextBlockId] = useState<string | null>(null);

  // 2-finger tap gesture tracking for Undo
  const touchStartTimeRef = useRef<number>(0);
  const touchStartCountRef = useRef<number>(0);
  const touchStartPositionsRef = useRef<{ x: number; y: number }[]>([]);
  const [gestureToast, setGestureToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setGestureToast(text);
    setTimeout(() => {
      setGestureToast(null);
    }, 1200);
  };

  // Redraw canvas with all existing strokes + temporary live stroke
  const redrawCanvas = useCallback((tempStroke?: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear transparent drawing overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved strokes
    for (const stroke of page.strokes) {
      drawStrokeToContext(ctx, stroke);
    }

    // Draw active live stroke if present
    if (tempStroke) {
      drawStrokeToContext(ctx, tempStroke);
    }
  }, [page.strokes]);

  // Redraw when strokes change
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
    if (e.touches.length === 2) {
      touchStartTimeRef.current = Date.now();
      touchStartPositionsRef.current = [
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY }
      ];
    } else if (e.touches.length === 3) {
      touchStartTimeRef.current = Date.now();
      touchStartPositionsRef.current = [
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY },
        { x: e.touches[2].clientX, y: e.touches[2].clientY }
      ];
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const duration = Date.now() - touchStartTimeRef.current;

    // 2-FINGER TAP DETECTED: TRIGGER UNDO (GOODNOTES / PROCREATE GESTURE)
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

  // Pointer event handlers with Apple Pencil palm rejection
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): [number, number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0, 0.5];
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    // Apple Pencil gives accurate pressure from 0.0 to 1.0; fallback to 0.5 for mouse/standard touch
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return [x, y, pressure];
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If multiple fingers touch, do not draw
    if (touchStartCountRef.current >= 2) {
      return;
    }

    // PALM REJECTION: If "Apple Pencil Only" mode is enabled, ignore finger touches!
    if (applePencilOnly && e.pointerType === 'touch') {
      return;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const [x, y, pressure] = getCoordinates(e);

    // TEXT TOOL
    if (activeTool === 'text') {
      const newBlock: TextBlock = {
        id: `tb-${Date.now()}`,
        x: Math.round(x),
        y: Math.round(y),
        width: 280,
        height: 60,
        text: '',
        fontSize: 18,
        color: strokeColor,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        isEditing: true
      };
      const updatedBlocks = [...page.textBlocks, newBlock];
      onUpdatePage({ textBlocks: updatedBlocks });
      setActiveTextBlockId(newBlock.id);
      return;
    }

    // ERASER TOOL (Stroke Eraser)
    if (activeTool === 'eraser') {
      isDrawingRef.current = true;
      const strokeToErase = page.strokes.slice().reverse().find(s => isPointNearStroke(x, y, s, 22));
      if (strokeToErase) {
        onDeleteStroke(strokeToErase.id);
      }
      return;
    }

    // DRAWING TOOLS (pen, highlighter, line, rect, circle)
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

  const handleUpdateTextBlock = (id: string, updates: Partial<TextBlock>) => {
    const updated = page.textBlocks.map(b => b.id === id ? { ...b, ...updates } : b);
    onUpdatePage({ textBlocks: updated });
  };

  const handleDeleteTextBlock = (id: string) => {
    const filtered = page.textBlocks.filter(b => b.id !== id);
    onUpdatePage({ textBlocks: filtered });
    if (activeTextBlockId === id) setActiveTextBlockId(null);
  };

  const getPaperBgClass = () => {
    if (page.backgroundType === 'pdf' || page.backgroundType === 'image') {
      return 'bg-white';
    }
    return `paper-${paperTemplate}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto shadow-2xl rounded-sm transition-all select-none overflow-hidden ${getPaperBgClass()}`}
      style={{
        width: page.width * zoom,
        height: page.height * zoom,
      }}
    >
      {/* 2-Finger Gesture HUD Toast */}
      {gestureToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl border border-white/20 animate-fade-in flex items-center gap-2">
          <span>{gestureToast}</span>
        </div>
      )}

      {/* Floating iPad Undo/Redo Thumb Buttons (in basso a sinistra per rapido tocco con pollice) */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-xl">
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
            canUndo
              ? 'text-white hover:bg-white/20 active:scale-95'
              : 'text-white/30 cursor-not-allowed'
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
            canRedo
              ? 'text-white hover:bg-white/20 active:scale-95'
              : 'text-white/30 cursor-not-allowed'
          }`}
          title="Ripristina (anche con tap 3 dita!)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Background Layer: PDF page or imported image */}
      {page.backgroundImageData && (
        <img
          src={page.backgroundImageData}
          alt={`Pagina ${page.pageNumber}`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      )}

      {/* 2. Text Blocks Layer */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {page.textBlocks.map((block) => (
          <div
            key={block.id}
            style={{
              left: `${block.x}px`,
              top: `${block.y}px`,
              width: `${block.width}px`,
              minHeight: `${block.height}px`,
            }}
            className={`absolute pointer-events-auto rounded p-1 group transition-colors ${
              activeTextBlockId === block.id ? 'ring-2 ring-blue-500 bg-white/90 shadow-lg' : 'hover:ring-1 hover:ring-blue-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTextBlockId(block.id);
            }}
          >
            {activeTextBlockId === block.id ? (
              <div className="flex flex-col">
                <textarea
                  autoFocus
                  value={block.text}
                  onChange={(e) => handleUpdateTextBlock(block.id, { text: e.target.value })}
                  placeholder="Scrivi qui con la tastiera Bluetooth..."
                  style={{
                    fontSize: `${block.fontSize}px`,
                    color: block.color,
                    fontFamily: block.fontFamily,
                  }}
                  className="w-full bg-transparent resize-none border-none outline-none leading-relaxed min-h-[50px] p-0 font-normal"
                  rows={Math.max(2, block.text.split('\n').length)}
                />
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 mt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateTextBlock(block.id, { fontSize: Math.max(12, block.fontSize - 2) })}
                      className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      A-
                    </button>
                    <span className="text-xs text-slate-500">{block.fontSize}px</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTextBlock(block.id, { fontSize: Math.min(48, block.fontSize + 2) })}
                      className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      A+
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteTextBlock(block.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-1"
                    >
                      Elimina
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTextBlockId(null)}
                      className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                    >
                      Fine
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: `${block.fontSize}px`,
                  color: block.color,
                  fontFamily: block.fontFamily,
                }}
                className="whitespace-pre-wrap leading-relaxed cursor-text"
              >
                {block.text || <span className="text-slate-400 italic">Tocca per modificare testo...</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. Drawing Canvas Layer for Apple Pencil and Touch Gestures */}
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
        }}
        className="drawing-layer absolute inset-0 cursor-crosshair"
      />
    </div>
  );
};
