import { useRef, useState, useCallback, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import type { DetectedObject } from '@/types/dashboard';

// No hardcoded filter — use priorityObjects param from caller

const MIN_CONFIDENCE = 0.2;

interface DetectionStats {
  totalDetected: number;
  filteredPriority: number;
  modelLoaded: boolean;
  modelLoading: boolean;
  modelError: string | null;
}

export function useObjectDetection() {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [stats, setStats] = useState<DetectionStats>({
    totalDetected: 0,
    filteredPriority: 0,
    modelLoaded: false,
    modelLoading: false,
    modelError: null,
  });
  const detectingRef = useRef(false);

  const loadModel = useCallback(async () => {
    if (modelRef.current || stats.modelLoading) return;
    setStats(prev => ({ ...prev, modelLoading: true, modelError: null }));
    try {
      console.log('[ObjectDetection] Loading COCO-SSD model...');
      const model = await cocoSsd.load({ base: 'mobilenet_v2' });
      modelRef.current = model;
      console.log('[ObjectDetection] Model loaded successfully.');
      setStats(prev => ({ ...prev, modelLoaded: true, modelLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading model';
      console.error('[ObjectDetection] Model load failed:', message);
      setStats(prev => ({ ...prev, modelLoading: false, modelError: message }));
    }
  }, [stats.modelLoading]);

  const detect = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement,
    priorityObjects: string[] = [],
    minConfidence: number = MIN_CONFIDENCE,
  ): Promise<DetectedObject[]> => {
    const model = modelRef.current;
    if (!model || detectingRef.current) return [];

    // Check if video is ready
    if (source instanceof HTMLVideoElement && source.readyState < 2) return [];

    detectingRef.current = true;
    try {
      const predictions = await model.detect(source, 80, minConfidence);
      const totalDetected = predictions.length;

      console.log('[ObjectDetection] Detected class names:', predictions.map(p => p.class));

      // Filter to only priority objects with sufficient confidence (empty array = all)
      const filtered = predictions.filter(p =>
        p.score >= minConfidence &&
        (priorityObjects.length === 0 || priorityObjects.includes(p.class))
      );

      console.log('[ObjectDetection] Filtered priority objects:', filtered.map(p => `${p.class}(${(p.score * 100).toFixed(0)}%)`));

      setStats(prev => ({
        ...prev,
        totalDetected,
        filteredPriority: filtered.length,
      }));

      return filtered.map(p => ({
        label: p.class,
        confidence: p.score,
        bbox: [p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]] as [number, number, number, number],
      }));
    } catch (err) {
      console.error('[ObjectDetection] Detection error:', err);
      return [];
    } finally {
      detectingRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      modelRef.current = null;
    };
  }, []);

  return { loadModel, detect, stats };
}
