import { useState, useCallback, useRef } from 'react';
import CameraFeed from '@/components/dashboard/CameraFeed';
import SaliencyView from '@/components/dashboard/SaliencyView';
import AudioMeter from '@/components/dashboard/AudioMeter';
import AlertLog from '@/components/dashboard/AlertLog';
import ControlsPanel from '@/components/dashboard/ControlsPanel';
import DebugPanel from '@/components/dashboard/DebugPanel';
import AttentionGauge from '@/components/dashboard/AttentionGauge';
import { useCamera } from '@/hooks/useCamera';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import type { SaliencyMode, QualityMode, Alert, DetectedObject } from '@/types/dashboard';
import { DEFAULT_PRIORITY_OBJECTS } from '@/types/dashboard';

export default function Index() {
  const { cameras, devices, startCameras, stopCameras, updateCamera, enumerateDevices } = useCamera();
  const { audioFeatures, startAudio, stopAudio } = useAudioAnalysis();

  const [running, setRunning] = useState(false);
  const [saliencyMode, setSaliencyMode] = useState<SaliencyMode>('sobel');
  const [threshold, setThreshold] = useState(30);
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

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alertCooldownRef = useRef<Record<string, number>>({});

  const addAlert = useCallback((message: string, severity: Alert['severity'], cameraId: number) => {
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
    }, ...prev].slice(0, 100));
  }, []);

  const handleStart = useCallback(async () => {
    await enumerateDevices();
    if (simulationMode) {
      setRunning(true);
      startAudio();
    } else {
      await startCameras(quality);
      await startAudio();
      setRunning(true);
    }
  }, [simulationMode, quality, startCameras, startAudio, enumerateDevices]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopCameras();
    stopAudio();
    setAttentionScore(0);
    setGlobalSaliencyScore(0);
  }, [stopCameras, stopAudio]);

  const handleFpsUpdate = useCallback((camId: number, fps: number) => {
    updateCamera(camId, { fps });
  }, [updateCamera]);

  const handleObjectsUpdate = useCallback((camId: number, objects: DetectedObject[]) => {
    updateCamera(camId, { objects });
    // Generate alerts
    objects.forEach(obj => {
      if (obj.label === 'person' && obj.confidence > 0.7) {
        addAlert('Person detected', 'medium', camId);
      }
      if (priorityObjects.includes(obj.label) && obj.label !== 'person') {
        addAlert(`Priority: ${obj.label} detected`, 'high', camId);
      }
    });
  }, [updateCamera, addAlert, priorityObjects]);

  const handleSaliencyScoreUpdate = useCallback((camId: number, score: number) => {
    updateCamera(camId, { saliencyScore: score });

    // Compute global scores
    const scores = cameras.map(c => c.id === camId ? score : c.saliencyScore);
    const avgSaliency = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    setGlobalSaliencyScore(avgSaliency);

    // Attention = saliency + audio
    const audioBoost = audioFeatures.speechDetected ? 20 : 0;
    const dbBoost = Math.max(0, (audioFeatures.decibel + 30) * 0.5);
    setAttentionScore(Math.min(100, Math.round(avgSaliency + audioBoost + dbBoost)));

    // Audio-based alerts
    if (audioFeatures.speechDetected) {
      addAlert('Speech detected', 'low', 0);
    }
    if (audioFeatures.decibel > -10) {
      addAlert('High noise level', 'medium', 0);
    }
    if (audioFeatures.speechDetected && score > 50) {
      addAlert('Person + loud speech = HIGH ATTENTION', 'critical', camId);
    }
  }, [cameras, audioFeatures, addAlert, updateCamera]);

  const handleFrameCapture = useCallback((canvas: HTMLCanvasElement) => {
    sourceCanvasRef.current = canvas;
  }, []);

  const exportCSV = useCallback(() => {
    const rows = [
      ['Timestamp', 'Message', 'Severity', 'Camera'],
      ...alerts.map(a => [
        a.timestamp.toISOString(),
        a.message,
        a.severity,
        `CAM ${a.cameraId}`,
      ]),
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">
            MULTIMODAL SALIENCY DETECTION
          </h1>
          <span className="text-[9px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded">
            v1.0
          </span>
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
        {/* Left: Camera feeds */}
        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {cameras.map(cam => (
              <CameraFeed
                key={cam.id}
                camera={cam}
                mirror={mirror}
                showBoundingBoxes={showBoundingBoxes}
                showHeatmap={showHeatmap}
                heatmapOpacity={heatmapOpacity}
                saliencyMode={saliencyMode}
                threshold={threshold}
                simulationMode={simulationMode && running}
                onFpsUpdate={fps => handleFpsUpdate(cam.id, fps)}
                onObjectsUpdate={objs => handleObjectsUpdate(cam.id, objs)}
                onSaliencyScoreUpdate={s => handleSaliencyScoreUpdate(cam.id, s)}
                onFrameCapture={cam.id === 1 ? handleFrameCapture : undefined}
              />
            ))}
          </div>

          {/* Bottom: Timeline log */}
          <div className="bg-card rounded-md border border-border panel-glow p-3">
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Timeline</span>
            <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
              {alerts.slice(0, 30).map(alert => (
                <div
                  key={alert.id}
                  className={`flex-shrink-0 w-1.5 rounded-full transition-all ${
                    alert.severity === 'critical' ? 'bg-destructive h-6' :
                    alert.severity === 'high' ? 'bg-destructive/60 h-5' :
                    alert.severity === 'medium' ? 'bg-warning h-4' :
                    'bg-primary/40 h-3'
                  }`}
                  title={`${alert.message} - ${alert.timestamp.toLocaleTimeString()}`}
                />
              ))}
              {alerts.length === 0 && (
                <span className="text-[9px] font-mono text-muted-foreground">No events recorded</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Saliency + Audio + Controls */}
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

          <SaliencyView
            title="Saliency Output"
            sourceCanvas={sourceCanvasRef.current}
            saliencyMode={saliencyMode}
            threshold={threshold}
            colored={true}
            active={running}
            score={globalSaliencyScore}
          />

          <SaliencyView
            title="Low-Fi Saliency"
            sourceCanvas={sourceCanvasRef.current}
            saliencyMode={saliencyMode}
            threshold={threshold}
            colored={false}
            active={running}
            score={globalSaliencyScore}
          />

          <AudioMeter features={audioFeatures} active={running} />

          <AlertLog alerts={alerts} visible={showAlerts} />

          <DebugPanel cameras={cameras} devices={devices} errors={errors} />
        </div>
      </div>
    </div>
  );
}
