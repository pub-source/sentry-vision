import { useRef, useEffect, useState, useCallback } from 'react';
import type { CameraState, SaliencyMode, DetectedObject } from '@/types/dashboard';
import { computeSaliency, applyHeatmapColor, computeSaliencyScore } from '@/lib/saliency';

interface CameraFeedProps {
  camera: CameraState;
  mirror: boolean;
  showBoundingBoxes: boolean;
  showHeatmap: boolean;
  heatmapOpacity: number;
  saliencyMode: SaliencyMode;
  threshold: number;
  simulationMode: boolean;
  onFpsUpdate: (fps: number) => void;
  onObjectsUpdate: (objects: DetectedObject[]) => void;
  onSaliencyScoreUpdate: (score: number) => void;
  onFrameCapture?: (canvas: HTMLCanvasElement) => void;
}

export default function CameraFeed({
  camera,
  mirror,
  showBoundingBoxes,
  showHeatmap,
  heatmapOpacity,
  saliencyMode,
  threshold,
  simulationMode,
  onFpsUpdate,
  onObjectsUpdate,
  onSaliencyScoreUpdate,
  onFrameCapture,
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const fpsCountRef = useRef(0);
  const fpsTimeRef = useRef(Date.now());
  const animRef = useRef<number>(0);
  const [simObjects] = useState<DetectedObject[]>(() => {
    if (!simulationMode) return [];
    return [
      { label: 'person', confidence: 0.92, bbox: [50, 30, 120, 200] },
      { label: 'laptop', confidence: 0.85, bbox: [200, 150, 100, 80] },
      { label: 'cup', confidence: 0.73, bbox: [320, 180, 40, 50] },
    ];
  });

  // Set stream on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !camera.stream) return;
    video.srcObject = camera.stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [camera.stream]);

  // Main render loop
  useEffect(() => {
    if (!camera.active && !simulationMode) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;

      // Draw video frame or simulation
      if (video && video.readyState >= 2) {
        ctx.save();
        if (mirror) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else if (simulationMode) {
        // Generate animated simulation pattern
        const t = Date.now() / 1000;
        const imgData = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const nx = x / w;
            const ny = y / h;
            const v = Math.sin(nx * 10 + t) * Math.cos(ny * 8 + t * 0.7) * 0.5 + 0.5;
            imgData.data[i] = Math.floor(v * 30 + 10);
            imgData.data[i + 1] = Math.floor(v * 40 + 15);
            imgData.data[i + 2] = Math.floor(v * 50 + 20);
            imgData.data[i + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Compute saliency
      try {
        const frameData = ctx.getImageData(0, 0, w, h);
        const saliencyData = computeSaliency(frameData, prevFrameRef.current, saliencyMode, threshold);
        prevFrameRef.current = frameData;

        const score = computeSaliencyScore(saliencyData);
        onSaliencyScoreUpdate(score);

        // Draw heatmap overlay
        if (showHeatmap) {
          const heatmap = applyHeatmapColor(saliencyData);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(heatmap, 0, 0);
            ctx.globalAlpha = heatmapOpacity / 100;
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.globalAlpha = 1;
          }
        }
      } catch {
        // Skip saliency on error
      }

      // Draw bounding boxes
      if (showBoundingBoxes) {
        const objects = simulationMode ? simObjects : camera.objects;
        if (objects.length > 0) {
          objects.forEach(obj => {
            const [bx, by, bw, bh] = obj.bbox;
            ctx.strokeStyle = obj.confidence > 0.8 ? '#00e5ff' : obj.confidence > 0.5 ? '#ffab00' : '#ff1744';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            const labelText = `${obj.label} ${(obj.confidence * 100).toFixed(0)}%`;
            ctx.font = '11px "JetBrains Mono", monospace';
            const tm = ctx.measureText(labelText);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(bx, by - 16, tm.width + 8, 16);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(labelText, bx + 4, by - 4);
          });
          onObjectsUpdate(objects);
        }
      }

      // Capture frame for saliency panel
      onFrameCapture?.(canvas);

      // FPS counter
      fpsCountRef.current++;
      const now = Date.now();
      if (now - fpsTimeRef.current >= 1000) {
        onFpsUpdate(fpsCountRef.current);
        fpsCountRef.current = 0;
        fpsTimeRef.current = now;
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [camera.active, camera.objects, simulationMode, mirror, showBoundingBoxes, showHeatmap, heatmapOpacity, saliencyMode, threshold, simObjects, onFpsUpdate, onObjectsUpdate, onSaliencyScoreUpdate, onFrameCapture]);

  return (
    <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow group">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
          {camera.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            {camera.fps} FPS
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${camera.active || simulationMode ? 'bg-success' : 'bg-destructive'}`} />
        </div>
      </div>

      {/* Video (hidden, used as source) */}
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
      />

      {/* Canvas (displayed) */}
      <canvas
        ref={canvasRef}
        width={camera.active ? 640 : 320}
        height={camera.active ? 480 : 240}
        className="w-full h-full object-cover aspect-video"
      />

      {/* Saliency score badge */}
      <div className="absolute bottom-1 right-1 z-10">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          camera.saliencyScore > 60 ? 'bg-destructive/80 text-destructive-foreground' :
          camera.saliencyScore > 30 ? 'bg-warning/80 text-warning-foreground' :
          'bg-secondary/80 text-secondary-foreground'
        }`}>
          S:{camera.saliencyScore}
        </span>
      </div>

      {/* Inactive overlay */}
      {!camera.active && !simulationMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-xs font-mono text-muted-foreground">NO SIGNAL</span>
        </div>
      )}
    </div>
  );
}
