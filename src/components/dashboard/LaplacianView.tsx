import { useRef, useEffect, useState } from 'react';

interface LaplacianViewProps {
  sourceCanvas: HTMLCanvasElement | null;
  threshold: number;
  active: boolean;
}

export default function LaplacianView({ sourceCanvas, threshold, active }: LaplacianViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [edgePercent, setEdgePercent] = useState(0);

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

          // Convert to grayscale
          const gray = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            gray[i] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
          }

          canvas.width = w;
          canvas.height = h;
          const out = ctx.createImageData(w, h);
          const dst = out.data;

          let edgeCount = 0;
          let totalPixels = 0;

          // Laplacian operator: ∇²I = I(x-1,y) + I(x+1,y) + I(x,y-1) + I(x,y+1) - 4·I(x,y)
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              const lap =
                gray[(y - 1) * w + x] + gray[(y + 1) * w + x]
                + gray[y * w + (x - 1)] + gray[y * w + (x + 1)]
                - 4 * gray[idx];
              
              const mag = Math.abs(lap);
              const pass = mag > threshold;
              const oi = idx * 4;
              totalPixels++;

              if (pass) {
                // Bright magenta/purple for Laplacian edges
                const intensity = Math.min(255, mag * 2);
                dst[oi] = Math.floor(intensity * 0.8);      // R
                dst[oi + 1] = 0;                              // G
                dst[oi + 2] = intensity;                      // B (purple tint)
                dst[oi + 3] = 255;
                edgeCount++;
              } else {
                // Dark background
                dst[oi] = 6;
                dst[oi + 1] = 6;
                dst[oi + 2] = 12;
                dst[oi + 3] = 255;
              }
            }
          }

          ctx.putImageData(out, 0, 0);
          setEdgePercent(totalPixels > 0 ? parseFloat(((edgeCount / totalPixels) * 100).toFixed(1)) : 0);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [active, sourceCanvas, threshold]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full h-full object-contain aspect-video bg-background"
      />
      <div className="absolute bottom-1 right-1 z-10">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/80 text-secondary-foreground">
          ∇²:{edgePercent}%
        </span>
      </div>
    </div>
  );
}
