import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraFeed from '@/components/dashboard/CameraFeed';
import FusedDetectionView from '@/components/dashboard/FusedDetectionView';
import SaliencyView from '@/components/dashboard/SaliencyView';
import ThresholdView from '@/components/dashboard/ThresholdView';
import LowFiView from '@/components/dashboard/LowFiView';
import ObjectShaderView from '@/components/dashboard/ObjectShaderView';
import LaplacianView from '@/components/dashboard/LaplacianView';
import MotionView from '@/components/dashboard/MotionView';
import AudioMeter from '@/components/dashboard/AudioMeter';
import AlertLog from '@/components/dashboard/AlertLog';
import ControlsPanel from '@/components/dashboard/ControlsPanel';
import DebugPanel from '@/components/dashboard/DebugPanel';
import AttentionGauge from '@/components/dashboard/AttentionGauge';
import ResearchPanel from '@/components/dashboard/ResearchPanel';
import { useCamera } from '@/hooks/useCamera';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
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
  const { transcript, interimTranscript, isListening: speechListening, supported: speechSupported, start: startSpeech, stop: stopSpeech, clear: clearSpeech } = useSpeechRecognition();
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
  const [minConfidence, setMinConfidence] = useState(20); // percentage 0-100
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors] = useState<string[]>([]);
  const [attentionScore, setAttentionScore] = useState(0);
  const [globalSaliencyScore, setGlobalSaliencyScore] = useState(0);
  const [researchMode, setResearchMode] = useState(false);
  const [showExtraCams, setShowExtraCams] = useState(false);
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
    
    // Update global saliency from this frame (not max - use latest from cam 1)
    if (cameraId === 1) {
      setGlobalSaliencyScore(score);
    }

    // Compute fused attention: α = 0.4×S + 0.3×A + 0.3×O
    if (cameraId === 1) {
      const saliencyComponent = score; // S from CAM 2 (same source frame)
      const audioComponent = audioFeatures.speechDetected
        ? Math.min(100, Math.abs(audioFeatures.decibel) + 20)
        : Math.min(100, Math.max(0, (audioFeatures.decibel + 50) * 1.5));
      const objectComponent = cameras[0].objects.length > 0
        ? Math.min(100, cameras[0].objects.reduce((sum, o) => sum + o.confidence * 100, 0) / cameras[0].objects.length)
        : 0;
      
      const fused = Math.min(100, Math.round(
        0.4 * saliencyComponent + 0.3 * audioComponent + 0.3 * objectComponent
      ));
      setAttentionScore(fused);
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
  }, [audioFeatures, addAlert, updateCamera, sourceCanvas, logAlert, wakeWords, cameras]);

  const handleSaliencyViewScore = useCallback((score: number) => {
    setGlobalSaliencyScore(score);
  }, []);

  const handleDetectFrame = useCallback(async (video: HTMLVideoElement): Promise<DetectedObject[]> => {
    return detect(video, priorityObjects, minConfidence / 100);
  }, [detect, priorityObjects, minConfidence]);

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
          {!user && !authLoading && (() => {
            const guest = sessionStorage.getItem('guest_member');
            if (guest) {
              const { name, household } = JSON.parse(guest);
              return (
                <span className="text-[10px] font-mono text-accent">
                  👤 {name} • {household}
                </span>
              );
            }
            return (
              <button
                onClick={() => navigate('/auth')}
                className="text-[10px] font-mono text-primary hover:underline"
              >
                Sign In
              </button>
            );
          })()}
          <span className="text-[10px] font-mono text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-41px)]">
        {/* Left: Specialized camera grid + fusion */}
         <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
          {/* Top row: 2 cameras */}
          <div className="grid grid-cols-2 gap-2">
            {/* CAM 1: Object Detection */}
            <CameraFeed
              camera={cameras[0]}
              mirror={mirror}
              showBoundingBoxes={showBoundingBoxes}
              showHeatmap={false}
              heatmapOpacity={0}
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

            {/* CAM 2: Saliency Heatmap */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 2 — Saliency Heatmap
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent/20 text-accent">SOBEL</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    globalSaliencyScore > 60 ? 'bg-destructive/80 text-destructive-foreground' :
                    globalSaliencyScore > 30 ? 'bg-warning/80 text-warning-foreground' :
                    'bg-secondary/80 text-secondary-foreground'
                  }`}>
                    S:{globalSaliencyScore}
                  </span>
                </div>
              </div>
              <SaliencyView
                title=""
                sourceCanvas={sourceCanvas}
                saliencyMode={saliencyMode}
                threshold={threshold}
                colored={true}
                active={running}
                score={globalSaliencyScore}
                onScoreUpdate={handleSaliencyViewScore}
              />
            </div>
          </div>

          {/* Toggle button for extra cameras */}
          <button
            onClick={() => setShowExtraCams(prev => !prev)}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-primary border border-border rounded-md hover:border-primary/50 transition-all bg-card"
          >
            {showExtraCams ? '▲ Hide Extra Cameras' : '▼ Show Extra Cameras (CAM 3–8)'}
          </button>

          {showExtraCams && (
          <>
          {/* Middle row: 2 cameras */}
          <div className="grid grid-cols-2 gap-2">
            {/* CAM 3: Region Saliency */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 3 — Region Saliency
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-info/20 text-info">GRAYSCALE</span>
              </div>
              <SaliencyView
                title=""
                sourceCanvas={sourceCanvas}
                saliencyMode={saliencyMode}
                threshold={threshold}
                colored={false}
                active={running}
                score={globalSaliencyScore}
              />
            </div>

            {/* CAM 4: Threshold Segmentation */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 4 — Threshold Segmentation
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-warning/20 text-warning">BINARY</span>
              </div>
              <ThresholdView
                title=""
                sourceCanvas={sourceCanvas}
                saliencyMode={saliencyMode}
                threshold={threshold}
                active={running}
              />
            </div>
          </div>

          {/* Bottom row: 2 new cameras */}
          <div className="grid grid-cols-2 gap-2">
            {/* CAM 5: Low-Fi Region Saliency */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 5 — Low-Fi Saliency
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-secondary/40 text-foreground/70">SUPERPIXEL</span>
              </div>
              <LowFiView
                sourceCanvas={sourceCanvas}
                saliencyMode={saliencyMode}
                threshold={threshold}
                active={running}
              />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <span className="text-xs font-mono text-muted-foreground">OFFLINE</span>
                </div>
              )}
            </div>

            {/* CAM 6: Object Shader */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 6 — Object Shader
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-destructive/20 text-destructive">MASK</span>
              </div>
              <ObjectShaderView
                sourceCanvas={sourceCanvas}
                objects={cameras[0].objects}
                active={running}
              />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <span className="text-xs font-mono text-muted-foreground">OFFLINE</span>
                </div>
              )}
            </div>
          </div>

          {/* 4th row: Laplacian + Motion */}
          <div className="grid grid-cols-2 gap-2">
            {/* CAM 7: Laplacian Detection */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 7 — Laplacian Detection
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-accent/20 text-accent">∇²I</span>
              </div>
              <LaplacianView
                sourceCanvas={sourceCanvas}
                threshold={threshold}
                active={running}
              />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <span className="text-xs font-mono text-muted-foreground">OFFLINE</span>
                </div>
              )}
            </div>

            {/* CAM 8: Motion Detection */}
            <div className="relative bg-card rounded-md overflow-hidden border border-border panel-glow">
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-background/80 to-transparent">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  CAM 8 — Motion Detection
                </span>
                <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-success/20 text-success">ΔI</span>
              </div>
              <MotionView
                sourceCanvas={sourceCanvas}
                threshold={threshold}
                active={running}
              />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <span className="text-xs font-mono text-muted-foreground">OFFLINE</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-card rounded-md border border-primary/30 panel-glow p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                ⚡ Multimodal Fusion Output
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                α = 0.4×S + 0.3×A + 0.3×O
              </span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {/* CAM 1 contribution */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 1</p>
                <p className="text-[8px] font-mono text-muted-foreground">Detection</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-primary rounded transition-all" style={{ width: `${Math.min(100, cameras[0].objects.length * 25)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">{cameras[0].objects.length} obj</p>
              </div>
              {/* CAM 2 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 2</p>
                <p className="text-[8px] font-mono text-muted-foreground">Heatmap</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className={`h-full rounded transition-all ${
                    globalSaliencyScore > 60 ? 'bg-destructive' : globalSaliencyScore > 30 ? 'bg-warning' : 'bg-success'
                  }`} style={{ width: `${globalSaliencyScore}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">S:{globalSaliencyScore}</p>
              </div>
              {/* CAM 3 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 3</p>
                <p className="text-[8px] font-mono text-muted-foreground">Region</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-info rounded transition-all" style={{ width: `${Math.min(100, globalSaliencyScore * 1.2)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">Edge map</p>
              </div>
              {/* CAM 4 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 4</p>
                <p className="text-[8px] font-mono text-muted-foreground">Threshold</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-warning rounded transition-all" style={{ width: `${Math.min(100, threshold * 3)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">τ={threshold}</p>
              </div>
              {/* CAM 5 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 5</p>
                <p className="text-[8px] font-mono text-muted-foreground">Low-Fi</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-secondary rounded transition-all" style={{ width: `${Math.min(100, globalSaliencyScore * 0.8)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">Superpixel</p>
              </div>
              {/* CAM 6 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 6</p>
                <p className="text-[8px] font-mono text-muted-foreground">Shader</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-destructive rounded transition-all" style={{ width: `${Math.min(100, cameras[0].objects.length * 30)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">Mask</p>
              </div>
              {/* CAM 7 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 7</p>
                <p className="text-[8px] font-mono text-muted-foreground">Laplacian</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-accent rounded transition-all" style={{ width: `${Math.min(100, globalSaliencyScore * 1.1)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">∇²I</p>
              </div>
              {/* CAM 8 */}
              <div className="bg-secondary/30 rounded p-2 space-y-1">
                <p className="text-[9px] font-mono text-accent font-semibold">CAM 8</p>
                <p className="text-[8px] font-mono text-muted-foreground">Motion</p>
                <div className="h-1.5 bg-secondary/50 rounded overflow-hidden">
                  <div className="h-full bg-success rounded transition-all" style={{ width: `${Math.min(100, globalSaliencyScore * 0.9)}%` }} />
                </div>
                <p className="text-[7px] font-mono text-foreground/70">ΔI</p>
              </div>
            </div>
            {/* Combined score */}
            <div className="mt-2 flex items-center gap-3 bg-secondary/20 rounded p-2">
              <span className="text-[9px] font-mono text-muted-foreground">FUSED α =</span>
              <span className={`text-sm font-mono font-bold ${
                attentionScore > 70 ? 'text-destructive' : attentionScore > 40 ? 'text-warning' : 'text-success'
              }`}>
                {attentionScore}
              </span>
              <div className="flex-1 h-2 bg-secondary/50 rounded overflow-hidden">
                <div className={`h-full rounded transition-all ${
                  attentionScore > 70 ? 'bg-destructive' : attentionScore > 40 ? 'bg-warning' : 'bg-success'
                }`} style={{ width: `${attentionScore}%` }} />
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                attentionScore > 70 ? 'bg-destructive/20 text-destructive' :
                attentionScore > 40 ? 'bg-warning/20 text-warning' :
                'bg-success/20 text-success'
              }`}>
                {attentionScore > 70 ? 'ALERT' : attentionScore > 40 ? 'ELEVATED' : 'NORMAL'}
              </span>
            </div>
          </div>
          </>
          )}

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
            minConfidence={minConfidence}
            onMinConfidenceChange={setMinConfidence}
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
