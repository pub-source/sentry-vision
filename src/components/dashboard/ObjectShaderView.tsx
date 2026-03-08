import { useRef, useEffect } from 'react';
import type { DetectedObject } from '@/types/dashboard';

interface ObjectShaderViewProps {
  sourceCanvas: HTMLCanvasElement | null;
  objects: DetectedObject[];
  active: boolean;
}

export default function ObjectShaderView({ sourceCanvas, objects, active }: ObjectShaderViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
        canvas.width = w;
        canvas.height = h;

        // Draw original frame
        ctx.drawImage(sourceCanvas, 0, 0);

        if (objects.length > 0) {
          const frameData = ctx.getImageData(0, 0, w, h);
          const data = frameData.data;

          // Create mask: pixels inside bounding boxes get red shader
          const mask = new Uint8Array(w * h); // 0 = background, 1 = object

          for (const obj of objects) {
            const [bx, by, bw, bh] = obj.bbox;
            // Scale to canvas
            const sx = w / (sourceCanvas.width || w);
            const sy = h / (sourceCanvas.height || h);
            const x1 = Math.max(0, Math.floor(bx * sx));
            const y1 = Math.max(0, Math.floor(by * sy));
            const x2 = Math.min(w, Math.floor((bx + bw) * sx));
            const y2 = Math.min(h, Math.floor((by + bh) * sy));

            for (let y = y1; y < y2; y++) {
              for (let x = x1; x < x2; x++) {
                mask[y * w + x] = 1;
              }
            }
          }

          // Apply shader: objects = red tint overlay, background = desaturated blue
          for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            if (mask[i]) {
              // Object: bright red/orange shader overlay
              data[idx] = Math.min(255, Math.floor(r * 0.3 + 200));     // R boost
              data[idx + 1] = Math.min(255, Math.floor(g * 0.15 + 30)); // G reduced
              data[idx + 2] = Math.min(255, Math.floor(b * 0.1 + 20));  // B minimal
              data[idx + 3] = 255;
            } else {
              // Background: subtle blue-gray desaturation
              data[idx] = Math.floor(gray * 0.6);
              data[idx + 1] = Math.floor(gray * 0.65);
              data[idx + 2] = Math.floor(gray * 0.85 + 30);
              data[idx + 3] = 255;
            }
          }

          ctx.putImageData(frameData, 0, 0);

          // Draw object outlines
          for (const obj of objects) {
            const [bx, by, bw, bh] = obj.bbox;
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            const label = `${obj.label} ${(obj.confidence * 100).toFixed(0)}%`;
            ctx.font = '11px "JetBrains Mono", monospace';
            const tm = ctx.measureText(label);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(bx, by - 16, tm.width + 8, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, bx + 4, by - 4);
          }
        } else {
          // No objects: show desaturated version
          const frameData = ctx.getImageData(0, 0, w, h);
          const data = frameData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = Math.floor(gray * 0.6);
            data[i + 1] = Math.floor(gray * 0.65);
            data[i + 2] = Math.floor(gray * 0.85 + 30);
          }
          ctx.putImageData(frameData, 0, 0);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [active, sourceCanvas, objects]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className="w-full h-full object-contain aspect-video bg-background"
    />
  );
}
