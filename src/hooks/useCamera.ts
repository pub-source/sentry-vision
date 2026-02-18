import { useState, useCallback, useRef, useEffect } from 'react';
import type { CameraState, QualityMode } from '@/types/dashboard';

export function useCamera() {
  const [cameras, setCameras] = useState<CameraState[]>([
    { id: 1, deviceId: null, label: 'Camera 1', fps: 0, active: false, stream: null, objects: [], saliencyScore: 0 },
    { id: 2, deviceId: null, label: 'Camera 2', fps: 0, active: false, stream: null, objects: [], saliencyScore: 0 },
    { id: 3, deviceId: null, label: 'Camera 3', fps: 0, active: false, stream: null, objects: [], saliencyScore: 0 },
    { id: 4, deviceId: null, label: 'Camera 4', fps: 0, active: false, stream: null, objects: [], saliencyScore: 0 },
  ]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const startCameras = useCallback(async (quality: QualityMode) => {
    const videoDevices = await enumerateDevices();
    const constraints = quality === 'HD'
      ? { width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 640 }, height: { ideal: 480 } };

    const newCameras: CameraState[] = [];
    const streams: MediaStream[] = [];

    // Get primary stream
    let primaryStream: MediaStream | null = null;
    try {
      const deviceId = videoDevices[0]?.deviceId;
      primaryStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId }, ...constraints } : constraints,
        audio: false,
      });
    } catch {
      // If camera fails, we'll use simulation mode
    }

    for (let i = 0; i < 4; i++) {
      const device = videoDevices[i];
      let stream: MediaStream | null = null;

      if (device && i < videoDevices.length) {
        try {
          stream = i === 0 && primaryStream
            ? primaryStream
            : await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: device.deviceId }, ...constraints },
                audio: false,
              });
        } catch {
          stream = primaryStream; // fallback to clone
        }
      } else {
        // Clone primary stream for remaining panels
        stream = primaryStream;
      }

      if (stream) streams.push(stream);

      newCameras.push({
        id: i + 1,
        deviceId: device?.deviceId || null,
        label: device?.label || `Camera ${i + 1}${!device ? ' (cloned)' : ''}`,
        fps: 0,
        active: !!stream,
        stream,
        objects: [],
        saliencyScore: 0,
      });
    }

    streamsRef.current = streams;
    setCameras(newCameras);
    return newCameras;
  }, [enumerateDevices]);

  const stopCameras = useCallback(() => {
    const stopped = new Set<string>();
    streamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => {
        if (!stopped.has(track.id)) {
          track.stop();
          stopped.add(track.id);
        }
      });
    });
    streamsRef.current = [];
    setCameras(prev => prev.map(c => ({ ...c, active: false, stream: null, fps: 0, objects: [], saliencyScore: 0 })));
  }, []);

  const updateCamera = useCallback((id: number, update: Partial<CameraState>) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }, []);

  useEffect(() => {
    return () => {
      const stopped = new Set<string>();
      streamsRef.current.forEach(stream => {
        stream.getTracks().forEach(track => {
          if (!stopped.has(track.id)) {
            track.stop();
            stopped.add(track.id);
          }
        });
      });
    };
  }, []);

  return { cameras, devices, startCameras, stopCameras, updateCamera, enumerateDevices };
}
