// Fire detection with false-alarm filtering.
// Uses RGB color thresholding + temporal flicker analysis.
// Filters out matches that fall inside TV / cell phone / laptop / monitor
// bounding boxes (screens showing fire content) and rejects very small
// regions (lighters, candles, stove pilots).

import type { DetectedObject } from '@/types/dashboard';

export interface FireDetectionResult {
  detected: boolean;
  confidence: number;          // 0..1
  firePixelRatio: number;      // % of frame matching fire color
  flickerScore: number;        // temporal variance of fire pixel count
  rejectedReason?: string;
  bbox?: [number, number, number, number]; // x,y,w,h of dominant fire blob
}

export interface FireDetectorState {
  history: number[];           // recent fire-pixel ratios (for flicker)
  lastBbox: [number, number, number, number] | null;
}

export function createFireState(): FireDetectorState {
  return { history: [], lastBbox: null };
}

const SCREEN_LABELS = new Set(['tv', 'cell phone', 'laptop', 'monitor']);

// Min ratio of fire pixels in frame to count as "real fire", ignoring tiny flames
const MIN_FIRE_RATIO = 0.008;   // ~0.8% of the frame
// Below this size (in fraction of frame area), considered a lighter/candle and ignored
const LIGHTER_AREA_RATIO = 0.004;
// Flicker threshold (variance of recent ratios). Static red objects = low variance
const MIN_FLICKER = 0.000004;

function bboxOverlap(a: [number, number, number, number], b: [number, number, number, number]) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  const ix = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const iy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  const inter = ix * iy;
  const area = aw * ah;
  return area > 0 ? inter / area : 0;
}

export function detectFire(
  frame: ImageData,
  state: FireDetectorState,
  objects: DetectedObject[] = [],
): FireDetectionResult {
  const { data, width, height } = frame;
  const total = width * height;

  // Pass 1: count fire-colored pixels + compute centroid bbox
  let count = 0;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  // Sample every 4th pixel for speed
  const step = 4;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Fire RGB rule: strong red, mid green, low blue, R>G>B with margin
      if (r > 200 && g > 100 && g < 200 && b < 100 && r > g + 40 && g > b + 20) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Adjust count for sampling
  const sampledTotal = Math.ceil(width / step) * Math.ceil(height / step);
  const ratio = count / sampledTotal;

  // Track flicker over last ~10 frames
  state.history.push(ratio);
  if (state.history.length > 10) state.history.shift();

  const mean = state.history.reduce((s, v) => s + v, 0) / state.history.length;
  const variance =
    state.history.reduce((s, v) => s + (v - mean) ** 2, 0) / state.history.length;

  // Build candidate bbox (in image coords)
  let bbox: [number, number, number, number] | undefined;
  if (count > 0 && maxX > minX && maxY > minY) {
    bbox = [minX, minY, maxX - minX, maxY - minY];
    state.lastBbox = bbox;
  }

  // ---- Reject reasons (false alarm filter) ----
  if (ratio < MIN_FIRE_RATIO) {
    return {
      detected: false,
      confidence: 0,
      firePixelRatio: ratio,
      flickerScore: variance,
      rejectedReason: ratio === 0 ? undefined : 'too small (lighter/candle)',
      bbox,
    };
  }

  // Lighter/small flame guard: small + low flicker = lighter or red object
  if (bbox) {
    const areaRatio = (bbox[2] * bbox[3]) / (width * height);
    if (areaRatio < LIGHTER_AREA_RATIO) {
      return {
        detected: false,
        confidence: 0.2,
        firePixelRatio: ratio,
        flickerScore: variance,
        rejectedReason: 'flame too small (likely lighter/candle)',
        bbox,
      };
    }

    // Inside a screen device? Likely TV/phone showing fire content
    for (const obj of objects) {
      if (SCREEN_LABELS.has(obj.label)) {
        if (bboxOverlap(bbox, obj.bbox) > 0.6) {
          return {
            detected: false,
            confidence: 0,
            firePixelRatio: ratio,
            flickerScore: variance,
            rejectedReason: `fire inside ${obj.label} screen — ignored`,
            bbox,
          };
        }
      }
    }
  }

  // Need flicker for real fire — static red objects (couches, posters) are filtered
  if (state.history.length >= 5 && variance < MIN_FLICKER) {
    return {
      detected: false,
      confidence: 0.3,
      firePixelRatio: ratio,
      flickerScore: variance,
      rejectedReason: 'no flicker — static red object',
      bbox,
    };
  }

  // Confidence scales with ratio + flicker
  const conf = Math.min(1, ratio * 30 + Math.min(0.5, variance * 50000));
  return {
    detected: conf > 0.4,
    confidence: conf,
    firePixelRatio: ratio,
    flickerScore: variance,
    bbox,
  };
}