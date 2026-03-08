import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import type { SaliencyMode, QualityMode, Alert, DetectedObject } from '@/types/dashboard';
import { DEFAULT_PRIORITY_OBJECTS } from '@/types/dashboard';

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { householdId, wakeWords, members, checkForWakeWord, logAlert } = useHousehold(user?.id);
  const { cameras, devices, startCameras, stopCameras, updateCamera, enumerateDevices } = useCamera();
  const { audioFeatures, startAudio, stopAudio } = useAudioAnalysis();
  const { loadModel, detect, stats: detectionStats } = useObjectDetection();
  const [showEmergency, setShowEmergency] = useState(false);

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

  const handleFpsUpdate = useCallback((cameraId: number, fps: number) => {
    updateCamera(cameraId, { fps });
  }, [updateCamera]);

  const handleObjectsUpdate = useCallback((cameraId: number, objects: DetectedObject[]) => {
    updateCamera(cameraId, { objects });
    objects.forEach(obj => {
      if (obj.label === 'person' && obj.confidence > 0.7) {
        addAlert('Person detected', 'medium', cameraId);
      }
      if (priorityObjects.includes(obj.label) && obj.label !== 'person') {
        addAlert(`Priority: ${obj.label} detected`, 'high', cameraId);
      }
    });
  }, [updateCamera, addAlert, priorityObjects]);

  const handleCameraSaliencyScore = useCallback((cameraId: number, score: number) => {
    updateCamera(cameraId, { saliencyScore: score });
    
    // Use max saliency across all cameras for global score
    setGlobalSaliencyScore(prev => Math.max(prev, score));

    // Only compute attention from camera 1 (primary) for global attention
    if (cameraId === 1) {
      const audioBoost = audioFeatures.speechDetected ? 20 : 0;
      const dbBoost = Math.max(0, (audioFeatures.decibel + 30) * 0.5);
      const newAttention = Math.min(100, Math.round(score + audioBoost + dbBoost));
      setAttentionScore(newAttention);
    }

    // Audio event classification alerts (only from camera 1 to avoid duplicates)
    if (cameraId === 1) {
      if (audioFeatures.audioEvent === 'clap') {
        addAlert('Clap detected', 'medium', 0);
      }
      if (audioFeatures.audioEvent === 'scream') {
        addAlert('Scream detected!', 'high', 0);
        logAlert('scream', 'Scream detected by audio analysis');
      }
      if (audioFeatures.audioEvent === 'bang') {
        addAlert('Bang/impact detected!', 'critical', 0);
        logAlert('bang', 'Bang/impact detected by audio analysis');
      }
      if (audioFeatures.speechDetected) {
        addAlert('Speech detected', 'low', 0);
        wakeWords.forEach(ww => {
          if (ww.is_emergency && audioFeatures.audioEvent === 'scream') {
            setShowEmergency(true);
            logAlert('emergency_trigger', `Emergency wake word triggered: "${ww.phrase}"`);
          }
        });
      }
      if (audioFeatures.decibel > -10) {
        addAlert('High noise level', 'medium', 0);
      }
      if (audioFeatures.speechDetected && score > 50) {
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
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            a.click();
            logAlert('high_attention', 'Person + loud speech = HIGH ATTENTION');
          } catch (err) {
            console.error('[AutoSnapshot] Failed:', err);
          }
        }
        addAlert('Person + loud speech = HIGH ATTENTION', 'critical', 1, snapId);
      }
    }
  }, [audioFeatures, addAlert, updateCamera, sourceCanvas, logAlert, wakeWords]);

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

  // Active camera count for layout
  const activeCameras = cameras.filter(c => c.active || (simulationMode && running));
  const maxSaliencyCamera = cameras.reduce((max, c) => c.saliencyScore > max.saliencyScore ? c : max, cameras[0]);

  // Emergency 911 overlay
  if (showEmergency) {
    return (
      <div className="min-h-screen bg-destructive/10 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-6xl animate-pulse">🚨</div>
          <h1 className="text-2xl font-mono font-bold text-destructive">EMERGENCY DETECTED</h1>
          <p className="text-sm font-mono text-foreground">
            An emergency wake word was triggered. All household members will be notified.
          </p>
          <a
            href="tel:911"
            className="block w-full py-4 px-6 bg-destructive text-destructive-foreground font-mono font-bold text-lg rounded-md hover:bg-destructive/80 transition-all"
          >
            📞 CALL 911
          </a>
          <button
            onClick={() => setShowEmergency(false)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground"
          >
            Dismiss (false alarm)
          </button>
        </div>
      </div>
    );
  }

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
          {householdId && (
            <span className="text-[9px] font-mono text-success border border-success/30 bg-success/5 px-1.5 py-0.5 rounded">
              🏠 HOUSEHOLD
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono ${running ? 'text-success' : 'text-muted-foreground'}`}>
            {running ? '● LIVE' : '○ STANDBY'}
          </span>
          {user && (
            <>
              <button
                onClick={() => navigate('/household')}
                className="text-[10px] font-mono text-primary hover:underline"
              >
                🏠 Household
              </button>
              <span className="text-[10px] font-mono text-muted-foreground">{user.email}</span>
              <button
                onClick={signOut}
                className="text-[10px] font-mono text-muted-foreground hover:text-destructive"
              >
                Sign Out
              </button>
            </>
          )}
          {!user && !authLoading && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[10px] font-mono text-primary hover:underline"
            >
              Sign In
            </button>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-41px)]">
        {/* Left: 2x2 grid */}
         <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
          {/* 4-Camera Grid */}
          <div className="grid grid-cols-2 gap-2" style={{ minHeight: '60%' }}>
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
                priorityObjects={priorityObjects}
                detectionStats={detectionStats}
                onFpsUpdate={handleFpsUpdate}
                onObjectsUpdate={handleObjectsUpdate}
                onSaliencyScoreUpdate={handleCameraSaliencyScore}
                onFrameCapture={cam.id === 1 ? handleFrameCapture : undefined}
                onDetectFrame={handleDetectFrame}
              />
            ))}
          </div>

          {/* Saliency analysis strip */}
          <div className="grid grid-cols-3 gap-2" style={{ minHeight: '25%' }}>
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
            <SaliencyView
              title="Low-Fi Saliency"
              sourceCanvas={sourceCanvas}
              saliencyMode={saliencyMode}
              threshold={threshold}
              colored={false}
              active={running}
              score={globalSaliencyScore}
            />
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
            objectCount={cameras.reduce((sum, c) => sum + c.objects.length, 0)}
            fps={cameras[0].fps}
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
