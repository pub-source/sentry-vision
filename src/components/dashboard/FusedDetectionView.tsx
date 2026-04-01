import { useRef, useEffect, useState, useCallback } from 'react';
import type { DetectedObject, AudioFeatures } from '@/types/dashboard';
import { Maximize2, Minimize2, Mic, MicOff } from 'lucide-react';

interface FusedDetectionViewProps {
  sourceCanvas: HTMLCanvasElement | null;
  objects: DetectedObject[];
  audioFeatures: AudioFeatures;
  attentionScore: number;
  saliencyScore: number;
  active: boolean;
  transcript: string;
  interimTranscript: string;
  speechListening: boolean;
  onToggleSpeech: () => void;
}

// Infer activity from detected objects
function inferActivity(objects: DetectedObject[], audioFeatures: AudioFeatures): string {
  if (objects.length === 0) {
    if (audioFeatures.speechDetected) return 'Speaking (no visual subject)';
    return 'No activity detected';
  }

  const labels = objects.map(o => o.label);
  const hasPerson = labels.includes('person');
  const personCount = labels.filter(l => l === 'person').length;

  if (!hasPerson) {
    const items = [...new Set(labels)].slice(0, 3).join(', ');
    return `Objects visible: ${items}`;
  }

  // Person + object combinations for activity inference
  const activities: string[] = [];

  if (labels.includes('laptop') || labels.includes('keyboard') || labels.includes('mouse')) {
    activities.push('Working on computer');
  }
  if (labels.includes('cell phone')) {
    activities.push('Using phone');
  }
  if (labels.includes('book')) {
    activities.push('Reading');
  }
  if (labels.includes('cup') || labels.includes('wine glass') || labels.includes('bottle')) {
    activities.push('Drinking');
  }
  if (labels.includes('fork') || labels.includes('knife') || labels.includes('spoon') || labels.includes('bowl')) {
    activities.push('Eating');
  }
  if (labels.includes('pizza') || labels.includes('sandwich') || labels.includes('hot dog') || labels.includes('cake') || labels.includes('donut')) {
    activities.push('Eating food');
  }
  if (labels.includes('tv') || labels.includes('remote')) {
    activities.push('Watching TV');
  }
  if (labels.includes('scissors')) {
    activities.push('Cutting/Crafting');
  }
  if (labels.includes('toothbrush')) {
    activities.push('Brushing teeth');
  }
  if (labels.includes('hair drier')) {
    activities.push('Drying hair');
  }
  if (labels.includes('tie') || labels.includes('backpack') || labels.includes('handbag') || labels.includes('suitcase')) {
    activities.push('Getting ready / Traveling');
  }
  if (labels.includes('umbrella')) {
    activities.push('Holding umbrella');
  }
  if (labels.includes('sports ball') || labels.includes('tennis racket') || labels.includes('baseball bat') || labels.includes('frisbee')) {
    activities.push('Playing sports');
  }
  if (labels.includes('skateboard') || labels.includes('surfboard') || labels.includes('snowboard') || labels.includes('skis')) {
    activities.push('Doing sports');
  }
  if (labels.includes('bicycle') || labels.includes('motorcycle')) {
    activities.push('Riding');
  }
  if (labels.includes('car') || labels.includes('bus') || labels.includes('truck') || labels.includes('train')) {
    activities.push('Near vehicle');
  }
  if (labels.includes('cat') || labels.includes('dog')) {
    activities.push('With pet');
  }
  if (labels.includes('chair') || labels.includes('couch') || labels.includes('bed')) {
    activities.push('Sitting/Resting');
  }
  if (labels.includes('dining table')) {
    activities.push('At table');
  }
  if (labels.includes('microwave') || labels.includes('oven') || labels.includes('toaster') || labels.includes('sink') || labels.includes('refrigerator')) {
    activities.push('In kitchen');
  }
  if (labels.includes('potted plant') || labels.includes('vase')) {
    activities.push('Near plants');
  }
  if (labels.includes('clock')) {
    activities.push('Checking time');
  }

  if (audioFeatures.speechDetected) {
    activities.push('Speaking');
  }
  if (audioFeatures.audioEvent === 'scream') {
    activities.push('⚠ Screaming');
  }

  if (activities.length === 0) {
    if (personCount > 1) return `${personCount} people present — Standing/Moving`;
    return 'Person present — Standing/Moving';
  }

  const prefix = personCount > 1 ? `${personCount} people — ` : '';
  return prefix + activities.slice(0, 3).join(' • ');
}

export default function FusedDetectionView({
  sourceCanvas,
  objects,
  audioFeatures,
  attentionScore,
  saliencyScore,
  active,
  transcript,
  interimTranscript,
  speechListening,
  onToggleSpeech,
}: FusedDetectionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activity, setActivity] = useState('No activity detected');

  // Update activity inference
  useEffect(() => {
    setActivity(inferActivity(objects, audioFeatures));
  }, [objects, audioFeatures]);

  // Render loop: draw source + overlay all detection info
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const w = canvas.width;
      const h = canvas.height;

      // Draw source frame
      if (sourceCanvas && sourceCanvas.width > 0) {
        ctx.drawImage(sourceCanvas, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
      }

      // Draw bounding boxes with enhanced styling
      objects.forEach(obj => {
        const [bx, by, bw, bh] = obj.bbox;
        const sx = w / (sourceCanvas?.width || w);
        const sy = h / (sourceCanvas?.height || h);
        const dx = bx * sx;
        const dy = by * sy;
        const dw = bw * sx;
        const dh = bh * sy;

        // Glow effect
        ctx.shadowColor = obj.confidence > 0.8 ? '#00e5ff' : obj.confidence > 0.5 ? '#ffab00' : '#ff1744';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = ctx.shadowColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(dx, dy, dw, dh);
        ctx.shadowBlur = 0;

        // Corner brackets for emphasis
        const cornerLen = Math.min(dw, dh) * 0.2;
        ctx.lineWidth = 3;
        // Top-left
        ctx.beginPath(); ctx.moveTo(dx, dy + cornerLen); ctx.lineTo(dx, dy); ctx.lineTo(dx + cornerLen, dy); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(dx + dw - cornerLen, dy); ctx.lineTo(dx + dw, dy); ctx.lineTo(dx + dw, dy + cornerLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(dx, dy + dh - cornerLen); ctx.lineTo(dx, dy + dh); ctx.lineTo(dx + cornerLen, dy + dh); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(dx + dw - cornerLen, dy + dh); ctx.lineTo(dx + dw, dy + dh); ctx.lineTo(dx + dw, dy + dh - cornerLen); ctx.stroke();

        // Label with confidence
        const labelText = `${obj.label} ${(obj.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const tm = ctx.measureText(labelText);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(dx, dy - 18, tm.width + 10, 18);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(labelText, dx + 5, dy - 5);
      });

      // Activity bar at bottom
      const actBarH = 28;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, h - actBarH, w, actBarH);
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText('🎯 ' + activity, 8, h - 10);

      // Attention score badge top-right
      const scoreText = `ATT: ${attentionScore}`;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      const stm = ctx.measureText(scoreText);
      const scoreColor = attentionScore > 70 ? '#ff1744' : attentionScore > 40 ? '#ffab00' : '#00e676';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(w - stm.width - 16, 24, stm.width + 12, 20);
      ctx.fillStyle = scoreColor;
      ctx.fillText(scoreText, w - stm.width - 10, 39);

      // Object count
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(w - 70, 46, 66, 16);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`${objects.length} objects`, w - 64, 57);

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [active, sourceCanvas, objects, activity, attentionScore]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative bg-card rounded-md overflow-hidden border border-border panel-glow group flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
          CAM 2 — Fused Detection
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent/20 text-accent">AI+COCO+SALIENCY</span>
          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success' : 'bg-destructive'}`} />
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full aspect-video object-contain bg-background"
      />

      {/* Speech transcript overlay */}
      <div className="absolute bottom-8 left-0 right-12 z-10 px-2">
        {(transcript || interimTranscript) && (
          <div className="bg-background/80 backdrop-blur-sm rounded px-2 py-1 border border-border">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[8px] font-mono text-accent uppercase">💬 Speech</span>
            </div>
            <p className="text-[10px] font-mono text-foreground leading-tight">
              {transcript && <span>{transcript.split(' ').slice(-15).join(' ')} </span>}
              {interimTranscript && <span className="text-muted-foreground italic">{interimTranscript}</span>}
            </p>
          </div>
        )}
        {!transcript && !interimTranscript && speechListening && active && (
          <div className="bg-background/60 rounded px-2 py-1 border border-border/50">
            <span className="text-[9px] font-mono text-muted-foreground">💬 Listening for speech...</span>
          </div>
        )}
      </div>

      {/* Fit to screen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-2 right-2 z-20 p-1.5 rounded bg-background/70 hover:bg-background border border-border hover:border-primary/50 transition-all group-hover:opacity-100 opacity-60"
        title={isFullscreen ? 'Exit fullscreen' : 'Fit to screen'}
      >
        {isFullscreen ? (
          <Minimize2 className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5 text-primary" />
        )}
      </button>

      {/* Speech toggle button */}
      <button
        onClick={onToggleSpeech}
        className={`absolute bottom-2 right-10 z-20 p-1.5 rounded border transition-all group-hover:opacity-100 opacity-60 ${
          speechListening
            ? 'bg-success/20 border-success/50 hover:bg-success/30'
            : 'bg-background/70 border-border hover:border-primary/50 hover:bg-background'
        }`}
        title={speechListening ? 'Stop speech recognition' : 'Start speech recognition'}
      >
        {speechListening ? (
          <Mic className="w-3.5 h-3.5 text-success" />
        ) : (
          <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Status badges */}
      <div className="absolute bottom-2 left-1 z-10 flex gap-1">
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
          active ? 'bg-success/20 text-success' : 'bg-muted/50 text-muted-foreground'
        }`}>
          {active ? 'FUSED' : 'OFFLINE'}
        </span>
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
          attentionScore > 70 ? 'bg-destructive/20 text-destructive' :
          attentionScore > 40 ? 'bg-warning/20 text-warning' :
          'bg-success/20 text-success'
        }`}>
          α:{attentionScore}
        </span>
      </div>

      {/* Inactive overlay */}
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-xs font-mono text-muted-foreground">NO SIGNAL</span>
        </div>
      )}
    </div>
  );
}
