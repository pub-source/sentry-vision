import { useRef, useEffect, useState } from 'react';

interface MotionViewProps {
  sourceCanvas: HTMLCanvasElement | null;
  threshold: number;
  active: boolean;
}

export default function MotionView({ sourceCanvas, threshold, active }: MotionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevGrayRef = useRef<Float32Array | null>(null);
  const animRef = useRef<number>(0);
  const [motionPercent, setMotionPercent] = useState(0);

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

          let motionCount = 0;

          if (prevGrayRef.current) {
            const prev = prevGrayRef.current;
            // Motion detection: |I(t) - I(t-1)| > τ
            for (let i = 0; i < w * h; i++) {
              const diff = Math.abs(gray[i] - prev[i]);
              const pass = diff > threshold;
              const oi = i * 4;

              if (pass) {
                // Green-tinted motion visualization
                const intensity = Math.min(255, diff * 3);
                dst[oi] = 0;                                   // R
                dst[oi + 1] = intensity;                       // G (bright green)
                dst[oi + 2] = Math.floor(intensity * 0.3);    // B (slight teal)
                dst[oi + 3] = 255;
                motionCount++;
              } else {
                // Dark background
                dst[oi] = 6;
                dst[oi + 1] = 8;
                dst[oi + 2] = 6;
                dst[oi + 3] = 255;
              }
            }
          } else {
            // No previous frame yet — dark screen
            for (let i = 0; i < w * h; i++) {
              const oi = i * 4;
              dst[oi] = 6;
              dst[oi + 1] = 8;
              dst[oi + 2] = 6;
              dst[oi + 3] = 255;
            }
          }

          prevGrayRef.current = gray;
          ctx.putImageData(out, 0, 0);
          setMotionPercent(w * h > 0 ? parseFloat(((motionCount / (w * h)) * 100).toFixed(1)) : 0);
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
          Δ:{motionPercent}%
        </span>
      </div>
    </div>
  );
}
