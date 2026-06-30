import { useState, useCallback, useRef, useEffect } from 'react';
import { Moon, Sun, Home, LogOut, LogIn, Shield, Clock, Wifi, X, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CameraFeed from '@/components/dashboard/CameraFeed';
import FusedDetectionView from '@/components/dashboard/FusedDetectionView';
import AudioMeter from '@/components/dashboard/AudioMeter';
import AlertLog from '@/components/dashboard/AlertLog';
import ControlsPanel from '@/components/dashboard/ControlsPanel';
import DebugPanel from '@/components/dashboard/DebugPanel';
import AttentionGauge from '@/components/dashboard/AttentionGauge';
import DatasetReferences from '@/components/dashboard/DatasetReferences';
import DetectionFeedback from '@/components/dashboard/DetectionFeedback';
import ModelCachePanel from '@/components/dashboard/ModelCachePanel';

import { useCamera } from '@/hooks/useCamera';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useIpCamera } from '@/hooks/useIpCamera';
import { useFaceDistress } from '@/hooks/useFaceDistress';
import { useYamnet } from '@/hooks/useYamnet';
import { detectFire, createFireState } from '@/lib/fireDetection';
import type { SaliencyMode, QualityMode, Alert, DetectedObject } from '@/types/dashboard';
import { DEFAULT_PRIORITY_OBJECTS } from '@/types/dashboard';

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { householdId, wakeWords, members, checkForWakeWord, logAlert, logNotification } = useHousehold(user?.id);
  const { cameras, devices, startCameras, stopCameras, updateCamera, attachStream, enumerateDevices, startSpecificCamera } = useCamera();
  const { audioFeatures, startAudio, stopAudio } = useAudioAnalysis();
  const { loadModel, detect, stats: detectionStats } = useObjectDetection();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('safewatch-dark-mode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      return true;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('safewatch-dark-mode', String(darkMode));
  }, [darkMode]);
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

  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [cam2SourceCanvas, setCam2SourceCanvas] = useState<HTMLCanvasElement | null>(null);

  // Camera-connection gating: detection only runs while at least one
  // webcam or IP/CCTV stream is connected. UI message reflects state.
  const [cameraStatusMsg, setCameraStatusMsg] = useState<string>(
    'No camera connected. Please connect a webcam or CCTV/IP camera.'
  );

  // Auto-detect available cameras on mount so the Connect picker is populated
  // before the user clicks Start. Browsers won't expose device labels until
  // permission is granted, but deviceIds are enough to count availability.
  useEffect(() => {
    enumerateDevices().then(list => {
      if (!list || list.length === 0) {
        setCameraStatusMsg('No camera detected. Connect a webcam or CCTV/IP camera.');
      }
    }).catch(() => {});
    if (navigator.mediaDevices && 'addEventListener' in navigator.mediaDevices) {
      const onChange = () => { enumerateDevices(); };
      navigator.mediaDevices.addEventListener('devicechange', onChange);
      return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
    }
  }, [enumerateDevices]);

  // IP camera state
  const [showIpDialog, setShowIpDialog] = useState(false);
  const [ipUrl, setIpUrl] = useState('');
  const [ipKind, setIpKind] = useState<'hls' | 'mjpeg' | 'image'>('hls');
  const [ipTargetSlot, setIpTargetSlot] = useState<number>(2);
  const ipCam = useIpCamera();

  // Fire detection state
  const fireStateRef = useRef(createFireState());
  const [fireStatus, setFireStatus] = useState<{
    detected: boolean;
    fireDetected: boolean;
    smokeEmergency: boolean;
    confidence: number;
    smokeRatio: number;
    visibility: number;
    reason?: string;
  }>({
    detected: false,
    fireDetected: false,
    smokeEmergency: false,
    confidence: 0,
    smokeRatio: 0,
    visibility: 100,
  });

  // Facial distress (cam 2)
  const faceDistress = useFaceDistress(running);

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

  const lastMatchedPhraseRef = useRef<string>('');
  const lastMatchedTimeRef = useRef<number>(0);

  // Low-latency wake word detection — checks both transcript and interim
  useEffect(() => {
    if (!running) return;
    const combinedText = `${transcript} ${interimTranscript}`.trim();
    if (!combinedText) return;
    
    const match = checkForWakeWord(combinedText);
    const now = Date.now();
    if (match.matched && (match.phrase !== lastMatchedPhraseRef.current || now - lastMatchedTimeRef.current > 5000)) {
      lastMatchedPhraseRef.current = match.phrase;
      lastMatchedTimeRef.current = now;
      addAlert(`🔊 Wake word: "${match.phrase}"`, match.isEmergency ? 'critical' : 'high', 0);
      logAlert('wake_word', `Wake word detected: "${match.phrase}"`);
      logNotification(match.wakeWordId, match.phrase, match.actionType, match.isEmergency);
      if (match.isEmergency) {
        setShowEmergency(true);
        logAlert('emergency_trigger', `Emergency phrase triggered: "${match.phrase}"`);
      }
    }
  }, [transcript, interimTranscript, running, checkForWakeWord, addAlert, logAlert, logNotification]);

  const handleStart = useCallback(async () => {
    const detected = await enumerateDevices();
    // Require a connected camera (webcam OR IP/CCTV) before enabling any
    // detection pipeline. Simulation mode bypasses the requirement.
    let hasCamera = simulationMode || ipCam.connected;
    if (!simulationMode) {
      try {
        const started = await startCameras(quality);
        if (started.some(c => c.active)) hasCamera = true;
      } catch (err) {
        console.warn('[handleStart] Cameras failed to start:', err);
      }
    }
    if (!hasCamera) {
      const msg = (!detected || detected.length === 0) && !ipCam.connected
        ? 'No camera detected. Connect a webcam or CCTV/IP camera.'
        : 'No camera connected. Open Connect to choose a camera.';
      setCameraStatusMsg(msg);
      addAlert(msg, 'medium', 1);
      return;
    }
    loadModel(); // Start loading COCO-SSD model
    if (speechSupported) startSpeech();
    await startAudio().catch((err) => {
      console.warn('[handleStart] Audio failed to start:', err);
    });
    setCameraStatusMsg('');
    setRunning(true);
  }, [simulationMode, quality, startCameras, startAudio, enumerateDevices, loadModel, speechSupported, startSpeech, ipCam.connected, addAlert]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopCameras();
    stopAudio();
    stopSpeech();
    clearSpeech();
    setAttentionScore(0);
    setGlobalSaliencyScore(0);
  }, [stopCameras, stopAudio, stopSpeech, clearSpeech]);

  // Watch for camera disconnect mid-run: if no active webcam and no IP cam,
  // stop detection and surface a reconnect message in the existing feed area.
  useEffect(() => {
    if (!running) return;
    if (simulationMode) return;
    const anyActive = cameras.some(c => c.active) || ipCam.connected;
    if (!anyActive) {
      const more = devices.length > 0;
      const msg = more
        ? 'Camera disconnected. Open Connect to switch to another available camera.'
        : 'Camera disconnected. No other cameras detected — reconnect to continue.';
      setCameraStatusMsg(msg);
      addAlert(msg, 'high', 1);
      handleStop();
    }
  }, [running, simulationMode, cameras, ipCam.connected, handleStop, addAlert, devices.length]);

  // Listen for underlying MediaStreamTrack ended events (USB unplug, IP cam drop)
  useEffect(() => {
    const tracks: MediaStreamTrack[] = [];
    cameras.forEach(c => {
      if (c.stream) c.stream.getTracks().forEach(t => tracks.push(t));
    });
    if (ipCam.stream) ipCam.stream.getTracks().forEach(t => tracks.push(t));
    if (tracks.length === 0) return;
    const onEnded = () => {
      // Force a re-evaluation: mark camera inactive if its track ended.
      cameras.forEach(c => {
        if (c.stream && c.stream.getTracks().every(t => t.readyState === 'ended')) {
          updateCamera(c.id, { active: false, stream: null, fps: 0 });
        }
      });
    };
    tracks.forEach(t => t.addEventListener('ended', onEnded));
    return () => tracks.forEach(t => t.removeEventListener('ended', onEnded));
  }, [cameras, ipCam.stream, updateCamera]);

  // Speech recognition is always on when running — no toggle needed
  // It auto-starts in handleStart and auto-stops in handleStop

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

  const handleCam2FrameCapture = useCallback((canvas: HTMLCanvasElement) => {
    setCam2SourceCanvas(prev => prev === canvas ? prev : canvas);
  }, []);

  // Attach IP camera stream into the chosen camera slot
  useEffect(() => {
    if (ipCam.stream && ipCam.connected) {
      attachStream(ipTargetSlot, ipCam.stream, `IP Cam (${ipKind.toUpperCase()})`);
    }
  }, [ipCam.stream, ipCam.connected, ipTargetSlot, ipKind, attachStream]);

  // Fire detection — runs on cam 1 source frames every ~500ms
  useEffect(() => {
    if (!running || !sourceCanvas) return;
    const fireCooldown = { current: 0 };
    const interval = window.setInterval(() => {
      try {
        const ctx = sourceCanvas.getContext('2d');
        if (!ctx) return;
        const frame = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const result = detectFire(frame, fireStateRef.current, cameras[0].objects);
        setFireStatus({
          detected: result.detected,
          fireDetected: result.fireDetected,
          smokeEmergency: result.smokeEmergency,
          confidence: result.confidence,
          smokeRatio: result.smokeRatio,
          visibility: result.visibility,
          reason: result.rejectedReason,
        });
        if (result.detected && Date.now() - fireCooldown.current > 5000) {
          fireCooldown.current = Date.now();
          if (result.fireDetected) {
            addAlert(`🔥 Fire detected (${Math.round(result.confidence * 100)}% conf)`, 'critical', 1);
            logAlert('fire', `Fire signature confirmed (ratio ${result.firePixelRatio.toFixed(3)}, flicker ${result.flickerScore.toExponential(2)}, smoke ${(result.smokeRatio * 100).toFixed(1)}%, visibility ${result.visibility}/100)`);
          } else if (result.smokeEmergency) {
            addAlert(`💨 Heavy smoke — visibility ${result.visibility}/100`, 'high', 1);
            logAlert('smoke', `Smoke emergency: coverage ${(result.smokeRatio * 100).toFixed(1)}%, visibility ${result.visibility}/100`);
          }
        }
      } catch (err) {
        // Canvas may be tainted by cross-origin IP cam — skip silently
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [running, sourceCanvas, cameras, addAlert, logAlert]);

  // Facial distress — runs on cam 2 source (or cam 1 fallback) every ~700ms
  useEffect(() => {
    if (!running || !faceDistress.ready) return;
    const target = cam2SourceCanvas || sourceCanvas;
    if (!target) return;
    const lastAlertRef = { current: 0 };
    const interval = window.setInterval(() => {
      faceDistress.analyze(target);
    }, 700);
    return () => window.clearInterval(interval);
  }, [running, faceDistress.ready, faceDistress, cam2SourceCanvas, sourceCanvas]);

  // Alert on severe facial distress
  useEffect(() => {
    if (faceDistress.distress.distressLevel === 'severe' && running) {
      addAlert(`😟 Facial distress: ${faceDistress.distress.expression} (${faceDistress.distress.distressScore}%)`, 'high', 2);
      logAlert('facial_distress', `Facial distress detected: ${faceDistress.distress.expression}`);
    }
  }, [faceDistress.distress.distressLevel, faceDistress.distress.expression, faceDistress.distress.distressScore, running, addAlert, logAlert]);

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

  // Emergency is now a floating overlay, not a full-screen takeover

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* IP Camera connect dialog */}
      {showIpDialog && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowIpDialog(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Wifi className="w-4 h-4 text-primary" /> Connect CCTV / IP Camera
              </h3>
              <button onClick={() => setShowIpDialog(false)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Local webcams (built-in / USB) — auto-detected */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">
                Local cameras ({devices.length} detected)
              </label>
              {devices.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground italic">
                  No built-in or USB webcam detected. Connect a CCTV/IP camera below, or grant camera permission and reload.
                </p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {devices.map((d, idx) => {
                    const inUse = cameras.some(c => c.deviceId === d.deviceId && c.active);
                    return (
                      <button
                        key={d.deviceId || idx}
                        onClick={async () => {
                          const ok = await startSpecificCamera(d.deviceId, 1, quality);
                          if (ok) {
                            setCameraStatusMsg('');
                            setShowIpDialog(false);
                          }
                        }}
                        className={`w-full text-left text-[10px] font-mono px-2 py-1.5 rounded border transition-all ${
                          inUse
                            ? 'bg-success/10 border-success/40 text-success'
                            : 'bg-secondary/30 border-border hover:border-primary/50 text-foreground/80'
                        }`}
                      >
                        {inUse ? '● ' : '○ '}{d.label || `Camera ${idx + 1}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Stream type</label>
              <div className="grid grid-cols-3 gap-1">
                {(['hls', 'mjpeg', 'image'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => setIpKind(k)}
                    className={`text-[10px] font-mono py-1.5 rounded border transition-all ${
                      ipKind === k
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/30 border-border text-foreground/70 hover:border-primary/50'
                    }`}
                  >
                    {k.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-mono text-muted-foreground italic">
                {ipKind === 'hls' && 'HLS .m3u8 — most modern IP cams via gateway/converter'}
                {ipKind === 'mjpeg' && 'MJPEG stream URL (e.g. /video, /mjpg/video.mjpg)'}
                {ipKind === 'image' && 'Snapshot URL polled at 10fps (e.g. /shot.jpg)'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Camera URL</label>
              <input
                type="url"
                value={ipUrl}
                onChange={e => setIpUrl(e.target.value)}
                placeholder={ipKind === 'hls' ? 'https://example.com/stream.m3u8' : 'http://192.168.1.50/video'}
                className="w-full text-[11px] font-mono px-3 py-2 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Assign to slot</label>
              <select
                value={ipTargetSlot}
                onChange={e => setIpTargetSlot(parseInt(e.target.value, 10))}
                className="w-full text-[11px] font-mono px-3 py-2 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={1}>CAM 1 (Raw feed)</option>
                <option value={2}>CAM 2 (Fused detection)</option>
              </select>
            </div>

            {ipCam.error && (
              <div className="text-[10px] font-mono text-destructive bg-destructive/10 px-2 py-1 rounded">
                ⚠ {ipCam.error}
              </div>
            )}
            <p className="text-[9px] font-mono text-muted-foreground">
              ⚠ Browsers can't play raw RTSP. Use an HLS gateway (e.g. <code>go2rtc</code>, <code>MediaMTX</code>) or your camera's MJPEG snapshot URL. The URL must be served over HTTPS and allow CORS.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowIpDialog(false)}
                className="flex-1 text-xs font-mono py-2 rounded border border-border hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!ipUrl.trim()) return;
                  const ok = await ipCam.connect({ url: ipUrl.trim(), kind: ipKind });
                  if (ok) setShowIpDialog(false);
                }}
                disabled={!ipUrl.trim()}
                className="flex-1 text-xs font-mono py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Emergency Popup */}
      {showEmergency && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-destructive/95 backdrop-blur-md text-destructive-foreground rounded-xl shadow-2xl border-2 border-destructive p-4 space-y-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse">🚨</span>
            <h3 className="text-sm font-mono font-bold">EMERGENCY DETECTED</h3>
          </div>
          <p className="text-xs font-mono opacity-90">
            An emergency wake word was triggered. Household members notified.
          </p>
          <a
            href="tel:911"
            className="block w-full py-2.5 px-4 bg-background text-destructive font-mono font-bold text-sm rounded-lg text-center hover:bg-background/90 transition-all"
          >
            📞 CALL 911
          </a>
          <button
            onClick={() => setShowEmergency(false)}
            className="w-full text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity"
          >
            Dismiss (false alarm)
          </button>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              Multimodal Saliency Detection
            </h1>
          </div>
        </div>

        {/* Center: Status */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            running
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-success animate-pulse' : 'bg-muted-foreground/50'}`} />
            {running ? 'Live' : 'Standby'}
          </div>
          {householdId && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Home className="w-3 h-3" /> Household
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mr-1">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{new Date().toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => {
              document.documentElement.classList.toggle('dark');
              setDarkMode(prev => !prev);
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>

          {user && (
            <>
              <button
                onClick={() => navigate('/household')}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Household"
              >
                <Home className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="h-4 w-px bg-border" />
              <span className="text-[11px] text-muted-foreground max-w-[140px] truncate">{user.email}</span>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </>
          )}
          {!user && !authLoading && (() => {
            const guest = sessionStorage.getItem('guest_member');
            if (guest) {
              const { name, household } = JSON.parse(guest);
              return (
                <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  {name} • {household}
                </span>
              );
            }
            return (
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            );
          })()}
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
              noSignalMessage={cameraStatusMsg}
            />

            {/* CAM 2: Fused Detection (Activity + Speech) */}
            <FusedDetectionView
              sourceCanvas={cam2SourceCanvas || sourceCanvas}
              objects={cameras[0].objects}
              audioFeatures={audioFeatures}
              attentionScore={attentionScore}
              saliencyScore={globalSaliencyScore}
              active={running}
              transcript={transcript}
              interimTranscript={interimTranscript}
              speechListening={speechListening}
              onToggleSpeech={() => {}}
            />
          </div>

          {/* Hidden CAM 2 raw capture — only when cam 2 has its own stream */}
          {cameras[1].active && (
            <div className="hidden">
              <CameraFeed
                camera={cameras[1]}
                mirror={false}
                showBoundingBoxes={false}
                showHeatmap={false}
                heatmapOpacity={0}
                saliencyMode={saliencyMode}
                threshold={threshold}
                simulationMode={false}
                priorityObjects={priorityObjects}
                detectionStats={detectionStats}
                onFpsUpdate={handleFpsUpdate}
                onObjectsUpdate={handleObjectsUpdate}
                onSaliencyScoreUpdate={handleCameraSaliencyScore}
                onFrameCapture={handleCam2FrameCapture}
                onDetectFrame={handleDetectFrame}
              />
            </div>
          )}

          {/* IP / CCTV camera connect */}
          <div className="bg-card rounded-md border border-border panel-glow p-3 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono text-foreground flex-1">
              {ipCam.connected
                ? `🟢 IP Cam connected → CAM ${ipTargetSlot}`
                : cameras.some(c => c.active)
                  ? `🟢 Webcam active → ${cameras.find(c => c.active)?.label || 'CAM 1'}`
                  : devices.length > 0
                    ? `${devices.length} local camera(s) detected — click Connect to choose, or use a CCTV/IP URL`
                    : 'No camera detected — connect a CCTV / IP camera (HLS .m3u8 or MJPEG/snapshot URL)'}
            </span>
            {ipCam.connected ? (
              <button
                onClick={() => { ipCam.disconnect(); attachStream(ipTargetSlot, null); }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => setShowIpDialog(true)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
              >
                + Connect
              </button>
            )}
          </div>

          {/* Saliency-% breakdown — replaces the multimodal fusion output */}
          <div className="bg-card rounded-md border border-primary/30 panel-glow p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                📊 Saliency Score Calculation
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                α = 0.40·S + 0.30·A + 0.30·O
              </span>
            </div>

            {(() => {
              const audioComponent = audioFeatures.speechDetected
                ? Math.min(100, Math.abs(audioFeatures.decibel) + 20)
                : Math.min(100, Math.max(0, (audioFeatures.decibel + 50) * 1.5));
              const objectComponent = cameras[0].objects.length > 0
                ? Math.min(100, cameras[0].objects.reduce((s, o) => s + o.confidence * 100, 0) / cameras[0].objects.length)
                : 0;
              const sContrib = Math.round(0.4 * globalSaliencyScore);
              const aContrib = Math.round(0.3 * audioComponent);
              const oContrib = Math.round(0.3 * objectComponent);
              const rows: Array<{ label: string; value: number; weight: number; contrib: number; color: string; explain: string }> = [
                { label: 'Visual Saliency (S)', value: globalSaliencyScore, weight: 40, contrib: sContrib, color: 'bg-primary',     explain: 'Edge + motion energy from CAM 1 frame' },
                { label: 'Audio Energy (A)',    value: Math.round(audioComponent), weight: 30, contrib: aContrib, color: 'bg-warning',     explain: audioFeatures.speechDetected ? 'Speech + dB level' : 'Ambient dB level' },
                { label: 'Object Confidence (O)', value: Math.round(objectComponent), weight: 30, contrib: oContrib, color: 'bg-accent',    explain: `${cameras[0].objects.length} object(s) avg confidence` },
              ];
              return (
                <div className="space-y-1.5">
                  {rows.map(r => (
                    <div key={r.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-foreground/80">{r.label} <span className="text-muted-foreground">× {r.weight}%</span></span>
                        <span className="text-foreground">
                          {r.value}% <span className="text-muted-foreground">→ +{r.contrib}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary/50 rounded overflow-hidden relative">
                        <div className={`h-full ${r.color} rounded transition-all`} style={{ width: `${r.value}%` }} />
                      </div>
                      <p className="text-[8px] font-mono text-muted-foreground italic">{r.explain}</p>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center gap-3 bg-secondary/20 rounded p-2">
                    <span className="text-[9px] font-mono text-muted-foreground">FUSED α =</span>
                    <span className={`text-sm font-mono font-bold ${attentionScore > 70 ? 'text-destructive' : attentionScore > 40 ? 'text-warning' : 'text-success'}`}>
                      {attentionScore}%
                    </span>
                    <div className="flex-1 h-2 bg-secondary/50 rounded overflow-hidden">
                      <div className={`h-full rounded transition-all ${attentionScore > 70 ? 'bg-destructive' : attentionScore > 40 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${attentionScore}%` }} />
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${attentionScore > 70 ? 'bg-destructive/20 text-destructive' : attentionScore > 40 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                      {attentionScore > 70 ? 'ALERT' : attentionScore > 40 ? 'ELEVATED' : 'NORMAL'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Fire + Face distress strip */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className={`rounded p-2 border ${fireStatus.detected ? 'border-destructive/60 bg-destructive/10' : 'border-border bg-secondary/20'}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Flame className={`w-3 h-3 ${fireStatus.detected ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                  <span className="text-[9px] font-mono text-foreground/80">
                    Fire {Math.round(fireStatus.confidence * 100)}% · Smoke {Math.round(fireStatus.smokeRatio * 100)}% · Vis {fireStatus.visibility}
                  </span>
                </div>
                <p className="text-[8px] font-mono text-muted-foreground italic">
                  {fireStatus.fireDetected
                    ? '⚠ Real fire signature (color + flicker)'
                    : fireStatus.smokeEmergency
                      ? `💨 Smoke emergency — visibility ${fireStatus.visibility}/100`
                      : fireStatus.reason || 'No fire signature'}
                </p>
                {fireStatus.detected && (
                  <DetectionFeedback
                    householdId={householdId}
                    eventType="fire"
                    confidence={fireStatus.confidence}
                    visualContext={{ reason: fireStatus.reason }}
                  />
                )}
              </div>
              <div className={`rounded p-2 border ${faceDistress.distress.distressLevel === 'severe' ? 'border-destructive/60 bg-destructive/10' : faceDistress.distress.distressLevel === 'mild' ? 'border-warning/60 bg-warning/10' : 'border-border bg-secondary/20'}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] ${faceDistress.distress.distressLevel === 'severe' ? 'animate-pulse' : ''}`}>😟</span>
                  <span className="text-[9px] font-mono text-foreground/80">
                    Facial Distress ({faceDistress.distress.distressScore}%)
                  </span>
                </div>
                <p className="text-[8px] font-mono text-muted-foreground italic">
                  {!faceDistress.ready ? 'Loading model…' :
                   faceDistress.error ? `⚠ ${faceDistress.error}` :
                   !faceDistress.distress.hasFace ? 'No face detected' :
                   `${faceDistress.distress.expression} (${Math.round(faceDistress.distress.probability * 100)}%)`}
                </p>
                {faceDistress.distress.distressLevel !== 'none' && (
                  <DetectionFeedback
                    householdId={householdId}
                    eventType="facial_distress"
                    confidence={faceDistress.distress.probability}
                    audioEvent={audioFeatures.audioEvent}
                    visualContext={{
                      expression: faceDistress.distress.expression,
                      score: faceDistress.distress.distressScore,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Public dataset references — academic basis */}
            <div className="mt-2">
              <DatasetReferences />
            </div>

            {/* Model cache controls + stats */}
            <div className="mt-2">
              <ModelCachePanel />
            </div>
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
          {/* Start/Stop */}
          <div className="bg-card rounded-md border border-border panel-glow p-3">
            <button
              onClick={running ? handleStop : handleStart}
              className={`w-full text-xs font-mono py-2.5 px-3 rounded-md transition-all font-semibold ${
                running
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
                  : 'bg-primary text-primary-foreground hover:bg-primary/80'
              }`}
            >
              {running ? '■ STOP MONITORING' : '▶ START MONITORING'}
            </button>
          </div>

          <AttentionGauge score={attentionScore} />

          <AudioMeter features={audioFeatures} active={running} />

          <AlertLog alerts={alerts} visible={showAlerts} snapshots={snapshots} />

          <DebugPanel cameras={cameras} devices={devices} errors={errors} detectionStats={detectionStats} />

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
        </div>
      </div>
    </div>
  );
}
