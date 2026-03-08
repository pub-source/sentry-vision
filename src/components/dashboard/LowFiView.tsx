import { useRef, useEffect } from 'react';
import type { SaliencyMode } from '@/types/dashboard';
import { computeSaliency } from '@/lib/saliency';

interface LowFiViewProps {
  sourceCanvas: HTMLCanvasElement | null;
  saliencyMode: SaliencyMode;
  threshold: number;
  active: boolean;
}

export default function LowFiView({ sourceCanvas, saliencyMode, threshold, active }: LowFiViewProps) {
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
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (tempCtx) {
          tempCtx.drawImage(sourceCanvas, 0, 0);
          const frameData = tempCtx.getImageData(0, 0, w, h);
          
          // Compute saliency (grayscale)
          const saliencyData = computeSaliency(frameData, prevFrameRef.current, saliencyMode, threshold);
          prevFrameRef.current = frameData;

          canvas.width = w;
          canvas.height = h;

          // Apply region-based low-fi look: block-average into superpixel-like regions
          const blockSize = 6;
          const src = saliencyData.data;
          const out = ctx.createImageData(w, h);
          const dst = out.data;

          for (let by = 0; by < h; by += blockSize) {
            for (let bx = 0; bx < w; bx += blockSize) {
              let sum = 0;
              let count = 0;

              // Average the block
              for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
                for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
                  const idx = ((by + dy) * w + (bx + dx)) * 4;
                  sum += src[idx];
                  count++;
                }
              }

              const avg = Math.floor(sum / count);

              // Fill the block with average
              for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
                for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
                  const idx = ((by + dy) * w + (bx + dx)) * 4;
                  dst[idx] = avg;
                  dst[idx + 1] = avg;
                  dst[idx + 2] = avg;
                  dst[idx + 3] = 255;
                }
              }
            }
          }

          ctx.putImageData(out, 0, 0);
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

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className="w-full h-full object-contain aspect-video bg-background"
    />
  );
}
