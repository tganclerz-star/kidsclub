import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Check } from 'lucide-react';

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
}

export default function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(!!value);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0A0A0A';

    // Restore existing signature if any
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    setupCanvas();

    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save to data URL
    const canvas = canvasRef.current;
    if (canvas && hasContent) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasContent(false);
    onChange('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ink/5 rounded-lg flex items-center justify-center">
            <Check className="w-4 h-4 text-ink/40" />
          </div>
          <div>
            <p className="font-bold text-sm text-ink">Parent Signature</p>
            <p className="text-[11px] text-ink/40">Sign below with your finger</p>
          </div>
        </div>
        {hasContent && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink font-medium px-2 py-1 rounded-lg hover:bg-cream-dark transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="relative bg-white rounded-2xl border-2 border-dashed border-cream-dark overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: 160 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />

        {/* Signature line */}
        <div className="absolute bottom-8 left-6 right-6 border-b border-ink/10" />
        <div className="absolute bottom-3 left-6">
          <span className="text-[10px] text-ink/20 font-medium">Sign here</span>
        </div>

        {/* Signed indicator */}
        {hasContent && (
          <div className="absolute top-2 right-2">
            <div className="w-5 h-5 rounded-full bg-mint flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
