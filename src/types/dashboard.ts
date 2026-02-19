export type SaliencyMode = 'sobel' | 'laplacian' | 'motion';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type QualityMode = 'HD' | 'SD';

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, width, height
}

export type AudioEventType = 'speech' | 'clap' | 'scream' | 'bang' | 'none';

export interface AudioFeatures {
  decibel: number;
  speechDetected: boolean;
  pitchEstimate: number;
  waveform: number[];
  audioEvent: AudioEventType;
}

export interface Alert {
  id: string;
  timestamp: Date;
  message: string;
  severity: AlertSeverity;
  cameraId: number;
  snapshotId?: string;
}

export interface CameraState {
  id: number;
  deviceId: string | null;
  label: string;
  fps: number;
  active: boolean;
  stream: MediaStream | null;
  objects: DetectedObject[];
  saliencyScore: number;
}

export interface DashboardState {
  running: boolean;
  cameras: CameraState[];
  audioFeatures: AudioFeatures;
  attentionScore: number;
  alerts: Alert[];
  saliencyMode: SaliencyMode;
  threshold: number;
  showBoundingBoxes: boolean;
  showHeatmap: boolean;
  showAlerts: boolean;
  quality: QualityMode;
  mirror: boolean;
  heatmapOpacity: number;
  simulationMode: boolean;
  priorityObjects: string[];
}

export const DETECTABLE_OBJECTS = [
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck',
  'cat', 'dog', 'bird', 'horse',
  'bottle', 'cup', 'fork', 'knife', 'spoon',
  'chair', 'couch', 'bed', 'dining table',
  'tv', 'laptop', 'mouse', 'keyboard', 'cell phone',
  'book', 'clock', 'scissors', 'backpack', 'umbrella',
  'door', 'fire hydrant', 'stop sign',
] as const;

export const DEFAULT_PRIORITY_OBJECTS = ['person', 'knife', 'cell phone'];
