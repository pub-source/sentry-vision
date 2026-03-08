import { useRef, useEffect, useState } from 'react';
import type { SaliencyMode } from '@/types/dashboard';

interface ThresholdViewProps {
  title: string;
  sourceCanvas: HTMLCanvasElement | null;
  saliencyMode: SaliencyMode;
  threshold: number;
  active: boolean;
}

export default function ThresholdView({ title, sourceCanvas, saliencyMode, threshold, active }: ThresholdViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Float32Array | null>(null);
  const animRef = useRef<number>(0);
  const [stats, setStats] = useState({ aboveThreshold: 0, belowThreshold: 0 });

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
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (tempCtx) {
          tempCtx.drawImage(sourceCanvas, 0, 0);
          const frameData = tempCtx.getImageData(0, 0, w, h);
          const src = frameData.data;

          // Grayscale
          const gray = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            gray[i] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
          }

          canvas.width = w;
          canvas.height = h;
          const out = ctx.createImageData(w, h);
          const dst = out.data;

          let above = 0;
          let below = 0;

          if (saliencyMode === 'motion' && prevFrameRef.current) {
            const prev = prevFrameRef.current;
            for (let i = 0; i < w * h; i++) {
              const diff = Math.abs(gray[i] - prev[i]);
              const pass = diff > threshold;
              const oi = i * 4;
              if (pass) {
                // Cyan for above threshold
                dst[oi] = 0;
                dst[oi + 1] = 230;
                dst[oi + 2] = 255;
                dst[oi + 3] = 255;
                above++;
              } else {
                // Dark background
                dst[oi] = 8;
                dst[oi + 1] = 12;
                dst[oi + 2] = 18;
                dst[oi + 3] = 255;
                below++;
              }
            }
          } else {
            // Edge-based threshold (Sobel or Laplacian)
            for (let y = 1; y < h - 1; y++) {
              for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                let mag = 0;

                if (saliencyMode === 'laplacian') {
                  const lap =
                    gray[(y - 1) * w + x] + gray[(y + 1) * w + x]
                    + gray[y * w + (x - 1)] + gray[y * w + (x + 1)]
                    - 4 * gray[idx];
                  mag = Math.abs(lap);
                } else {
                  // Sobel
                  const gx =
                    -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
                    - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
                    - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
                  const gy =
                    -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
                    + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
                  mag = Math.sqrt(gx * gx + gy * gy);
                }

                const pass = mag > threshold;
                const oi = idx * 4;
                if (pass) {
                  dst[oi] = 0;
                  dst[oi + 1] = 230;
                  dst[oi + 2] = 255;
                  dst[oi + 3] = 255;
                  above++;
                } else {
                  dst[oi] = 8;
                  dst[oi + 1] = 12;
                  dst[oi + 2] = 18;
                  dst[oi + 3] = 255;
                  below++;
                }
              }
            }
          }

          prevFrameRef.current = gray;
          ctx.putImageData(out, 0, 0);
          setStats({ aboveThreshold: above, belowThreshold: below });
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [active, sourceCanvas, saliencyMode, threshold]);

  const total = stats.aboveThreshold + stats.belowThreshold;
  const pct = total > 0 ? ((stats.aboveThreshold / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow h-full">
      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider">{title}</span>
          <span className="text-[10px] font-mono text-accent px-1.5 py-0.5 rounded bg-secondary/80">
            T:{threshold} | {pct}%
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full h-full object-cover aspect-video bg-background"
      />
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-xs font-mono text-muted-foreground">OFFLINE</span>
        </div>
      )}
    </div>
  );
}
