import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2, ShieldCheck, Sparkles, FileSignature } from 'lucide-react';

interface DigitalSignaturePadProps {
  title: string;
  roleBadge: string;
  signeeName: string;
  signeeDocument: string;
  signeeSubtitle: string;
  initialSignature?: string | null;
  onSignatureChange: (dataUrl: string | null, meta: SignatureMeta) => void;
  accentColor?: 'emerald' | 'blue' | 'indigo';
}

export interface SignatureMeta {
  signedAt: string;
  hashToken: string;
  signeeName: string;
  signeeDocument: string;
  isVerified: boolean;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  title,
  roleBadge,
  signeeName,
  signeeDocument,
  signeeSubtitle,
  initialSignature = null,
  onSignatureChange,
  accentColor = 'emerald',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialSignature));
  const [signatureUrl, setSignatureUrl] = useState<string | null>(initialSignature);
  const [signatureMeta, setSignatureMeta] = useState<SignatureMeta>(() => {
    const now = new Date();
    const token = 'SENA-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + now.getFullYear();
    return {
      signedAt: now.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
      hashToken: token,
      signeeName,
      signeeDocument,
      isVerified: Boolean(initialSignature),
    };
  });

  // Setup canvas resolution and initial rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set background to transparent or light
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#0f172a';

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCurrentCanvas();
  };

  const saveCurrentCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);

    const now = new Date();
    const token = 'SENA-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + now.getFullYear();
    const meta: SignatureMeta = {
      signedAt: now.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
      hashToken: signatureMeta.hashToken || token,
      signeeName,
      signeeDocument,
      isVerified: true,
    };
    setSignatureMeta(meta);
    onSignatureChange(dataUrl, meta);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureUrl(null);
    const updatedMeta = { ...signatureMeta, isVerified: false };
    setSignatureMeta(updatedMeta);
    onSignatureChange(null, updatedMeta);
  };

  const handleStampOfficialSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';

    // Draw stylized signature calligraphy
    const w = canvas.width;
    const h = canvas.height;

    ctx.beginPath();
    // First initial loop
    ctx.moveTo(w * 0.15, h * 0.65);
    ctx.bezierCurveTo(w * 0.18, h * 0.25, w * 0.28, h * 0.2, w * 0.32, h * 0.55);
    ctx.bezierCurveTo(w * 0.35, h * 0.75, w * 0.25, h * 0.85, w * 0.22, h * 0.7);
    ctx.bezierCurveTo(w * 0.2, h * 0.45, w * 0.38, h * 0.35, w * 0.45, h * 0.6);

    // Dynamic wave strokes
    ctx.bezierCurveTo(w * 0.5, h * 0.75, w * 0.55, h * 0.45, w * 0.62, h * 0.58);
    ctx.bezierCurveTo(w * 0.68, h * 0.7, w * 0.75, h * 0.38, w * 0.82, h * 0.55);

    // Underline flourish
    ctx.moveTo(w * 0.18, h * 0.82);
    ctx.bezierCurveTo(w * 0.45, h * 0.8, w * 0.65, h * 0.88, w * 0.88, h * 0.78);
    ctx.stroke();

    // Small dot at the end
    ctx.beginPath();
    ctx.arc(w * 0.9, h * 0.76, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    setHasDrawn(true);
    saveCurrentCanvas();
  };

  return (
    <div className="border border-slate-300 rounded-xl p-3 bg-white space-y-2.5 text-xs text-slate-800 shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <FileSignature className="w-4 h-4 text-emerald-700" />
          <strong className="font-bold text-slate-900 text-xs">{title}</strong>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            hasDrawn
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          {hasDrawn ? '✓ Rúbrica Lista' : '⚠️ Pendiente de Firma'}
        </span>
      </div>

      {/* Signee Info */}
      <div className="text-[11px] leading-tight">
        <div className="font-semibold text-slate-900">{signeeName}</div>
        <div className="text-slate-600 font-mono text-[10px]">{signeeDocument}</div>
        <div className="text-slate-500 text-[10px]">{signeeSubtitle}</div>
      </div>

      {/* Interactive Drawing Canvas */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/70 p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={110}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-24 bg-white rounded cursor-crosshair touch-none"
        />

        {/* Placeholder guide line */}
        <div className="pointer-events-none absolute bottom-5 left-6 right-6 border-b border-slate-300/80 flex items-center justify-between">
          <span className="text-[8px] text-slate-400 font-mono">Línea de rúbrica digital</span>
          <span className="text-[8px] text-slate-400">SENA Guía 16</span>
        </div>

        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-slate-400 font-medium bg-white/90 px-2 py-0.5 rounded shadow-sm border border-slate-200">
              Dibuje su firma aquí (mouse o táctil)
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <button
          type="button"
          onClick={handleStampOfficialSignature}
          className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded border border-indigo-200 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-indigo-600" />
          <span>Estampar Rúbrica Oficial</span>
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 px-2 py-1 rounded border border-slate-200 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Limpiar</span>
        </button>
      </div>

      {/* Digital Stamp Certificate */}
      {hasDrawn && (
        <div className="p-2 rounded bg-emerald-50/80 border border-emerald-200/80 text-[9px] text-emerald-950 space-y-0.5">
          <div className="flex items-center gap-1 font-bold text-emerald-900">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Firma Digital Certificada Radicada</span>
          </div>
          <div className="font-mono text-slate-600 text-[8px]">
            Token: <span className="font-bold text-slate-800">{signatureMeta.hashToken}</span> • {signatureMeta.signedAt}
          </div>
        </div>
      )}
    </div>
  );
};
