import { useState, useCallback, useRef } from 'react';
import CameraFeed from '@/components/dashboard/CameraFeed';
import SaliencyView from '@/components/dashboard/SaliencyView';
import ThresholdView from '@/components/dashboard/ThresholdView';
import AudioMeter from '@/components/dashboard/AudioMeter';
import AlertLog from '@/components/dashboard/AlertLog';
import ControlsPanel from '@/components/dashboard/ControlsPanel';
import DebugPanel from '@/components/dashboard/DebugPanel';
import AttentionGauge from '@/components/dashboard/AttentionGauge';
import ResearchPanel from '@/components/dashboard/ResearchPanel';
import { useCamera } from '@/hooks/useCamera';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import type { SaliencyMode, QualityMode, Alert, DetectedObject } from '@/types/dashboard';
import { DEFAULT_PRIORITY_OBJECTS } from '@/types/dashboard';

export default function Index() {
  const { cameras, devices, startCameras, stopCameras, updateCamera, enumerateDevices } = useCamera();
  const { audioFeatures, startAudio, stopAudio } = useAudioAnalysis();
  const { loadModel, detect, stats: detectionStats } = useObjectDetection();

  const [running, setRunning] = useState(false);
  const [saliencyMode, setSaliencyMode] = useState<SaliencyMode>('sobel');
  const [threshold, setThreshold] = useState(15);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [quality, setQuality] = useState<QualityMode>('SD');
  const [mirror, setMirror] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(50);
  const [simulationMode, setSimulationMode] = useState(false);
  const [priorityObjects, setPriorityObjects] = useState<string[]>(DEFAULT_PRIORITY_OBJECTS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors] = useState<string[]>([]);
  const [attentionScore, setAttentionScore] = useState(0);
  const [globalSaliencyScore, setGlobalSaliencyScore] = useState(0);
  const [researchMode, setResearchMode] = useState(false);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const alertCooldownRef = useRef<Record<string, number>>({});
  const snapshotCooldownRef = useRef(0);
  const [snapshots, setSnapshots] = useState<{ id: string; timestamp: Date; dataUrl: string; reason: string }[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<{ id: string; timestamp: Date; dataUrl: string; reason: string } | null>(null);
  const addAlert = useCallback((message: string, severity: Alert['severity'], cameraId: number, snapshotId?: string) => {
    const key = `${message}-${cameraId}`;
    const now = Date.now();
    if (alertCooldownRef.current[key] && now - alertCooldownRef.current[key] < 3000) return;
    alertCooldownRef.current[key] = now;

    setAlerts(prev => [{
      id: `${now}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      message,
      severity,
      cameraId,
      snapshotId,
    }, ...prev].slice(0, 200));
  }, []);

  const handleStart = useCallback(async () => {
    await enumerateDevices();
    loadModel(); // Start loading COCO-SSD model
    if (simulationMode) {
      setRunning(true);
      startAudio();
    } else {
      await startCameras(quality);
      await startAudio();
      setRunning(true);
    }
  }, [simulationMode, quality, startCameras, startAudio, enumerateDevices, loadModel]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopCameras();
    stopAudio();
    setAttentionScore(0);
    setGlobalSaliencyScore(0);
  }, [stopCameras, stopAudio]);

  const handleFpsUpdate = useCallback((fps: number) => {
    updateCamera(1, { fps });
  }, [updateCamera]);

  const handleObjectsUpdate = useCallback((objects: DetectedObject[]) => {
    updateCamera(1, { objects });
    objects.forEach(obj => {
      if (obj.label === 'person' && obj.confidence > 0.7) {
        addAlert('Person detected', 'medium', 1);
      }
      if (priorityObjects.includes(obj.label) && obj.label !== 'person') {
        addAlert(`Priority: ${obj.label} detected`, 'high', 1);
      }
    });
  }, [updateCamera, addAlert, priorityObjects]);

  const handleCameraSaliencyScore = useCallback((score: number) => {
    updateCamera(1, { saliencyScore: score });
    setGlobalSaliencyScore(score);

    // Attention = saliency + audio
    const audioBoost = audioFeatures.speechDetected ? 20 : 0;
    const dbBoost = Math.max(0, (audioFeatures.decibel + 30) * 0.5);
    const newAttention = Math.min(100, Math.round(score + audioBoost + dbBoost));
    setAttentionScore(newAttention);

    // Audio event classification alerts
    if (audioFeatures.audioEvent === 'clap') {
      addAlert('Clap detected', 'medium', 0);
    }
    if (audioFeatures.audioEvent === 'scream') {
      addAlert('Scream detected!', 'high', 0);
    }
    if (audioFeatures.audioEvent === 'bang') {
      addAlert('Bang/impact detected!', 'critical', 0);
    }
    if (audioFeatures.speechDetected) {
      addAlert('Speech detected', 'low', 0);
    }
    if (audioFeatures.decibel > -10) {
      addAlert('High noise level', 'medium', 0);
    }
    if (audioFeatures.speechDetected && score > 50) {
      // Auto-snapshot on high attention (cooldown 5s)
      const now = Date.now();
      let snapId: string | undefined;
      if (now - snapshotCooldownRef.current > 5000 && sourceCanvas) {
        snapshotCooldownRef.current = now;
        try {
          const dataUrl = sourceCanvas.toDataURL('image/png');
          snapId = `snap-${now}`;
          const snap = {
            id: snapId,
            timestamp: new Date(),
            dataUrl,
            reason: 'Person + loud speech (HIGH ATTENTION)',
          };
          setSnapshots(prev => [snap, ...prev].slice(0, 50));
          console.log('[AutoSnapshot] Captured snapshot:', snap.reason);

          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
          a.click();
        } catch (err) {
          console.error('[AutoSnapshot] Failed:', err);
        }
      }
      addAlert('Person + loud speech = HIGH ATTENTION', 'critical', 1, snapId);
    }
  }, [audioFeatures, addAlert, updateCamera, sourceCanvas]);

  const handleSaliencyViewScore = useCallback((score: number) => {
    setGlobalSaliencyScore(score);
  }, []);

  const handleDetectFrame = useCallback(async (video: HTMLVideoElement): Promise<DetectedObject[]> => {
    return detect(video, priorityObjects);
  }, [detect, priorityObjects]);

  const handleFrameCapture = useCallback((canvas: HTMLCanvasElement) => {
    setSourceCanvas(prev => prev === canvas ? prev : canvas);
  }, []);

  const exportCSV = useCallback(() => {
    const rows = [
      ['Timestamp', 'Message', 'Severity', 'Camera'],
      ...alerts.map(a => [a.timestamp.toISOString(), a.message, a.severity, `CAM ${a.cameraId}`]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saliency-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [alerts]);

  // Use only camera 1 for feed
  const mainCamera = cameras[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">
            MULTIMODAL SALIENCY DETECTION
          </h1>
          <span className="text-[9px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">v1.0</span>
          {researchMode && (
            <span className="text-[9px] font-mono text-accent border border-accent/30 bg-accent/5 px-1.5 py-0.5 rounded">
              RESEARCH
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono ${running ? 'text-success' : 'text-muted-foreground'}`}>
            {running ? '● LIVE' : '○ STANDBY'}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-41px)]">
        {/* Left: 2x2 grid */}
        <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 flex-1">
            {/* Panel 1: Camera Feed */}
            <CameraFeed
              camera={mainCamera}
              mirror={mirror}
              showBoundingBoxes={showBoundingBoxes}
              showHeatmap={showHeatmap}
              heatmapOpacity={heatmapOpacity}
              saliencyMode={saliencyMode}
              threshold={threshold}
              simulationMode={simulationMode && running}
              priorityObjects={priorityObjects}
              detectionStats={detectionStats}
              onFpsUpdate={handleFpsUpdate}
              onObjectsUpdate={handleObjectsUpdate}
              onSaliencyScoreUpdate={handleCameraSaliencyScore}
              onFrameCapture={handleFrameCapture}
              onDetectFrame={handleDetectFrame}
            />

            {/* Panel 2: Saliency Output (Colored Heatmap) */}
            <SaliencyView
              title="Saliency Output"
              sourceCanvas={sourceCanvas}
              saliencyMode={saliencyMode}
              threshold={threshold}
              colored={true}
              active={running}
              score={globalSaliencyScore}
              onScoreUpdate={handleSaliencyViewScore}
            />

            {/* Panel 3: Low-Fi Saliency (Grayscale) */}
            <SaliencyView
              title="Low-Fi Saliency"
              sourceCanvas={sourceCanvas}
              saliencyMode={saliencyMode}
              threshold={threshold}
              colored={false}
              active={running}
              score={globalSaliencyScore}
            />

            {/* Panel 4: Threshold Binary View */}
            <ThresholdView
              title="Threshold"
              sourceCanvas={sourceCanvas}
              saliencyMode={saliencyMode}
              threshold={threshold}
              active={running}
            />
          </div>

          {/* Bottom: Timeline */}
          <div className="bg-card rounded-md border border-border panel-glow p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Timeline</span>
              <span className="text-[9px] font-mono text-muted-foreground">{alerts.length} events</span>
            </div>
            <div className="flex gap-0.5 overflow-x-auto pb-1 items-end h-8">
              {alerts.slice(0, 80).map(alert => {
                const hasSnap = alert.snapshotId || snapshots.some(s => Math.abs(s.timestamp.getTime() - alert.timestamp.getTime()) < 5000);
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      const snap = alert.snapshotId
                        ? snapshots.find(s => s.id === alert.snapshotId)
                        : snapshots.find(s => Math.abs(s.timestamp.getTime() - alert.timestamp.getTime()) < 5000);
                      if (snap) setSelectedSnapshot(snap);
                    }}
                    className={`flex-shrink-0 w-1 rounded-t-full transition-all ${
                      hasSnap ? 'cursor-pointer hover:opacity-70 ring-1 ring-primary/50' : ''
                    } ${
                      alert.severity === 'critical' ? 'bg-destructive h-8' :
                      alert.severity === 'high' ? 'bg-destructive/60 h-6' :
                      alert.severity === 'medium' ? 'bg-warning h-4' :
                      'bg-primary/40 h-2'
                    }`}
                    title={`${alert.message} - ${alert.timestamp.toLocaleTimeString()}${hasSnap ? ' 📸 Click to view' : ''}`}
                  />
                );
              })}
              {alerts.length === 0 && (
                <span className="text-[9px] font-mono text-muted-foreground">No events recorded</span>
              )}
            </div>
            {/* Selected snapshot viewer */}
            {selectedSnapshot && (
              <div className="mt-2 p-2 bg-secondary/50 rounded border border-primary/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-primary">
                    📸 Playback — {selectedSnapshot.timestamp.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => setSelectedSnapshot(null)}
                    className="text-[9px] font-mono text-muted-foreground hover:text-destructive"
                  >
                    ✕ Close
                  </button>
                </div>
                <img
                  src={selectedSnapshot.dataUrl}
                  alt={selectedSnapshot.reason}
                  className="w-full max-h-48 object-contain rounded border border-border"
                />
                <span className="text-[8px] font-mono text-destructive">{selectedSnapshot.reason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 border-l border-border p-2 space-y-2 overflow-y-auto">
          <ControlsPanel
            running={running}
            saliencyMode={saliencyMode}
            threshold={threshold}
            showBoundingBoxes={showBoundingBoxes}
            showHeatmap={showHeatmap}
            showAlerts={showAlerts}
            quality={quality}
            mirror={mirror}
            heatmapOpacity={heatmapOpacity}
            simulationMode={simulationMode}
            priorityObjects={priorityObjects}
            onStart={handleStart}
            onStop={handleStop}
            onSaliencyModeChange={setSaliencyMode}
            onThresholdChange={setThreshold}
            onToggleBoundingBoxes={() => setShowBoundingBoxes(p => !p)}
            onToggleHeatmap={() => setShowHeatmap(p => !p)}
            onToggleAlerts={() => setShowAlerts(p => !p)}
            onQualityChange={setQuality}
            onToggleMirror={() => setMirror(p => !p)}
            onHeatmapOpacityChange={setHeatmapOpacity}
            onToggleSimulation={() => setSimulationMode(p => !p)}
            onPriorityObjectsChange={setPriorityObjects}
            onExportCSV={exportCSV}
          />

          <AttentionGauge score={attentionScore} />

          <AudioMeter features={audioFeatures} active={running} />

          <ResearchPanel
            active={running}
            researchMode={researchMode}
            attentionScore={attentionScore}
            saliencyScore={globalSaliencyScore}
            decibel={audioFeatures.decibel}
            speechDetected={audioFeatures.speechDetected}
            objectCount={mainCamera.objects.length}
            fps={mainCamera.fps}
            alerts={alerts}
            onToggleResearch={() => setResearchMode(p => !p)}
          />

          <AlertLog alerts={alerts} visible={showAlerts} snapshots={snapshots} />

          {/* Auto-Snapshots */}
          {snapshots.length > 0 && (
            <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  Auto-Snapshots ({snapshots.length})
                </span>
                <button
                  onClick={() => setSnapshots([])}
                  className="text-[9px] font-mono text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {snapshots.slice(0, 10).map(snap => (
                  <div key={snap.id} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {snap.timestamp.toLocaleTimeString()}
                      </span>
                      <a
                        href={snap.dataUrl}
                        download={`snapshot-${snap.id}.png`}
                        className="text-[9px] font-mono text-primary hover:underline"
                      >
                        ↓ Save
                      </a>
                    </div>
                    <img
                      src={snap.dataUrl}
                      alt={snap.reason}
                      className="w-full rounded border border-border"
                    />
                    <span className="text-[8px] font-mono text-destructive">{snap.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DebugPanel cameras={cameras} devices={devices} errors={errors} detectionStats={detectionStats} />
        </div>
      </div>
    </div>
  );
}
