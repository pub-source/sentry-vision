import { useState, useCallback, useRef, useEffect } from 'react';
import { Moon, Sun, Home, LogOut, LogIn, Shield, Clock } from 'lucide-react';
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
  const { householdId, wakeWords, members, checkForWakeWord, logAlert, logNotification } = useHousehold(user?.id);
  const { cameras, devices, startCameras, stopCameras, updateCamera, enumerateDevices } = useCamera();
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
  const lastMatchedPhraseRef = useRef<string>('');



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
