import { useState, useCallback, useRef, useEffect } from 'react';
import type { Alert } from '@/types/dashboard';

interface ResearchSession {
  startTime: Date;
  endTime: Date | null;
  dataPoints: ResearchDataPoint[];
}

interface ResearchDataPoint {
  timestamp: number;
  attentionScore: number;
  saliencyScore: number;
  decibel: number;
  speechDetected: boolean;
  objectCount: number;
  fps: number;
}

interface ResearchPanelProps {
  active: boolean;
  researchMode: boolean;
  attentionScore: number;
  saliencyScore: number;
  decibel: number;
  speechDetected: boolean;
  objectCount: number;
  fps: number;
  alerts: Alert[];
  onToggleResearch: () => void;
}

export default function ResearchPanel({
  active,
  researchMode,
  attentionScore,
  saliencyScore,
  decibel,
  speechDetected,
  objectCount,
  fps,
  alerts,
  onToggleResearch,
}: ResearchPanelProps) {
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [dataPoints, setDataPoints] = useState<ResearchDataPoint[]>([]);
  const intervalRef = useRef<number>(0);

  // Collect data every 500ms when research mode is active
  useEffect(() => {
    if (!researchMode || !active) {
      clearInterval(intervalRef.current);
      return;
    }

    if (!session) {
      setSession({ startTime: new Date(), endTime: null, dataPoints: [] });
      setDataPoints([]);
    }

    intervalRef.current = window.setInterval(() => {
      setDataPoints(prev => {
        const point: ResearchDataPoint = {
          timestamp: Date.now(),
          attentionScore,
          saliencyScore,
          decibel,
          speechDetected,
          objectCount,
          fps,
        };
        return [...prev, point].slice(-600); // Keep last 5 min at 2Hz
      });
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [researchMode, active, attentionScore, saliencyScore, decibel, speechDetected, objectCount, fps, session]);

  // Stop session
  useEffect(() => {
    if (!active && session && !session.endTime) {
      setSession(prev => prev ? { ...prev, endTime: new Date() } : null);
    }
  }, [active, session]);

  const stats = useCallback(() => {
    if (dataPoints.length === 0) return null;
    const attn = dataPoints.map(d => d.attentionScore);
    const sal = dataPoints.map(d => d.saliencyScore);
    const db = dataPoints.map(d => d.decibel);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const max = (arr: number[]) => Math.max(...arr);
    const min = (arr: number[]) => Math.min(...arr);
    const speechPct = (dataPoints.filter(d => d.speechDetected).length / dataPoints.length * 100);
    const duration = dataPoints.length > 1 ? (dataPoints[dataPoints.length - 1].timestamp - dataPoints[0].timestamp) / 1000 : 0;

    return {
      samples: dataPoints.length,
      duration: duration.toFixed(1),
      attention: { avg: avg(attn).toFixed(1), max: max(attn), min: min(attn) },
      saliency: { avg: avg(sal).toFixed(1), max: max(sal), min: min(sal) },
      audio: { avgDb: avg(db).toFixed(1), maxDb: max(db).toFixed(1), speechPct: speechPct.toFixed(1) },
      avgFps: avg(dataPoints.map(d => d.fps)).toFixed(1),
      alertCount: alerts.length,
    };
  }, [dataPoints, alerts]);

  const exportResearchCSV = useCallback(() => {
    const header = ['Timestamp', 'Elapsed_s', 'Attention', 'Saliency', 'Decibel', 'Speech', 'Objects', 'FPS'];
    const startTs = dataPoints[0]?.timestamp || 0;
    const rows = dataPoints.map(d => [
      new Date(d.timestamp).toISOString(),
      ((d.timestamp - startTs) / 1000).toFixed(2),
      d.attentionScore,
      d.saliencyScore,
      d.decibel.toFixed(2),
      d.speechDetected ? 1 : 0,
      d.objectCount,
      d.fps,
    ].join(','));

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dataPoints]);

  const exportReportTXT = useCallback(() => {
    const s = stats();
    if (!s) return;
    const report = [
      '═══════════════════════════════════════',
      ' MULTIMODAL SALIENCY RESEARCH REPORT',
      '═══════════════════════════════════════',
      '',
      `Session Start: ${session?.startTime.toISOString()}`,
      `Session End:   ${session?.endTime?.toISOString() || 'Ongoing'}`,
      `Duration:      ${s.duration}s`,
      `Samples:       ${s.samples}`,
      '',
      '── ATTENTION ──',
      `  Average: ${s.attention.avg}  Min: ${s.attention.min}  Max: ${s.attention.max}`,
      '',
      '── SALIENCY ──',
      `  Average: ${s.saliency.avg}  Min: ${s.saliency.min}  Max: ${s.saliency.max}`,
      '',
      '── AUDIO ──',
      `  Avg dB: ${s.audio.avgDb}  Max dB: ${s.audio.maxDb}`,
      `  Speech Detected: ${s.audio.speechPct}% of session`,
      '',
      '── PERFORMANCE ──',
      `  Average FPS: ${s.avgFps}`,
      `  Total Alerts: ${s.alertCount}`,
      '',
      '── ALERTS SUMMARY ──',
      ...alerts.slice(0, 20).map(a => `  [${a.severity.toUpperCase()}] ${a.timestamp.toISOString()} - ${a.message} (CAM ${a.cameraId})`),
      alerts.length > 20 ? `  ... and ${alerts.length - 20} more` : '',
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats, session, alerts]);

  const s = stats();

  // Mini sparkline
  const sparkline = dataPoints.slice(-60).map(d => d.attentionScore);

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Research Mode</span>
        <button
          onClick={onToggleResearch}
          className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all ${
            researchMode
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted-foreground hover:border-primary'
          }`}
        >
          {researchMode ? '● ON' : '○ OFF'}
        </button>
      </div>

      {researchMode && (
        <>
          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${active ? 'bg-destructive alert-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-[9px] font-mono text-muted-foreground">
              {active ? 'RECORDING' : 'PAUSED'} • {dataPoints.length} samples
            </span>
          </div>

          {/* Mini sparkline */}
          {sparkline.length > 1 && (
            <div className="flex items-end h-6 gap-px">
              {sparkline.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all duration-75"
                  style={{
                    height: `${Math.max(2, v)}%`,
                    backgroundColor: v > 75 ? 'hsl(var(--destructive))' : v > 40 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                    opacity: 0.6 + (i / sparkline.length) * 0.4,
                  }}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          {s && (
            <div className="space-y-1 text-[9px] font-mono">
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground text-right">{s.duration}s</span>
                <span className="text-muted-foreground">Avg Attention</span>
                <span className="text-foreground text-right">{s.attention.avg}</span>
                <span className="text-muted-foreground">Max Attention</span>
                <span className="text-foreground text-right">{s.attention.max}</span>
                <span className="text-muted-foreground">Avg Saliency</span>
                <span className="text-foreground text-right">{s.saliency.avg}</span>
                <span className="text-muted-foreground">Speech %</span>
                <span className="text-foreground text-right">{s.audio.speechPct}%</span>
                <span className="text-muted-foreground">Avg FPS</span>
                <span className="text-foreground text-right">{s.avgFps}</span>
                <span className="text-muted-foreground">Alerts</span>
                <span className="text-foreground text-right">{s.alertCount}</span>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={exportResearchCSV}
              disabled={dataPoints.length === 0}
              className="flex-1 text-[9px] font-mono py-1.5 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all disabled:opacity-30"
            >
              ↓ CSV Data
            </button>
            <button
              onClick={exportReportTXT}
              disabled={dataPoints.length === 0}
              className="flex-1 text-[9px] font-mono py-1.5 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all disabled:opacity-30"
            >
              ↓ Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}
