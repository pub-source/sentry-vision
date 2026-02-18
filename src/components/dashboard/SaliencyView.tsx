import { useRef, useEffect } from 'react';
import type { SaliencyMode } from '@/types/dashboard';
import { computeSaliency, applyHeatmapColor, computeSaliencyScore } from '@/lib/saliency';

interface SaliencyViewProps {
  title: string;
  sourceCanvas: HTMLCanvasElement | null;
  saliencyMode: SaliencyMode;
  threshold: number;
  colored: boolean; // true = heatmap, false = raw grayscale (low-fi)
  active: boolean;
  score: number;
}

export default function SaliencyView({ title, sourceCanvas, saliencyMode, threshold, colored, active, score }: SaliencyViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      if (sourceCanvas && sourceCanvas.width > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceCanvas.width;
        tempCanvas.height = sourceCanvas.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (tempCtx) {
          tempCtx.drawImage(sourceCanvas, 0, 0);
          const frameData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const saliencyData = computeSaliency(frameData, prevFrameRef.current, saliencyMode, threshold);
          prevFrameRef.current = frameData;

          canvas.width = sourceCanvas.width;
          canvas.height = sourceCanvas.height;

          if (colored) {
            const heatmap = applyHeatmapColor(saliencyData);
            ctx.putImageData(heatmap, 0, 0);
          } else {
            ctx.putImageData(saliencyData, 0, 0);
          }
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [active, sourceCanvas, saliencyMode, threshold, colored]);

  return (
    <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">{title}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          score > 60 ? 'bg-destructive/80 text-destructive-foreground' :
          score > 30 ? 'bg-warning/80 text-warning-foreground' :
          'bg-secondary/80 text-secondary-foreground'
        }`}>
          {score}%
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full aspect-video bg-background"
      />
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-xs font-mono text-muted-foreground">OFFLINE</span>
        </div>
      )}
    </div>
  );
}
