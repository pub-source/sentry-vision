import { useCallback, useRef, useState } from 'react';
import Hls from 'hls.js';

export type IpCamKind = 'hls' | 'mjpeg' | 'image';

export interface IpCamConfig {
  url: string;
  kind: IpCamKind;
}

/**
 * Connects an IP camera (HLS .m3u8 or MJPEG/snapshot URL) to a video element
 * and returns a MediaStream that the dashboard can consume just like a webcam.
 * Note: raw RTSP cannot be played in the browser — convert to HLS or MJPEG.
 */
export function useIpCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const disconnect = useCallback(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; videoRef.current.srcObject = null; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStream(prev => { prev?.getTracks().forEach(t => t.stop()); return null; });
    setConnected(false);
    setError(null);
  }, []);

  const connect = useCallback(async (cfg: IpCamConfig) => {
    disconnect();
    setError(null);

    // Create hidden video + canvas
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    try {
      if (cfg.kind === 'hls') {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(cfg.url);
          hls.attachMedia(video);
          await new Promise<void>((res, rej) => {
            hls.on(Hls.Events.MANIFEST_PARSED, () => res());
            hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) rej(new Error(data.details || 'HLS error')); });
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = cfg.url;
        } else {
          throw new Error('HLS not supported in this browser');
        }
        await video.play();
        // Capture stream from the playing video
        // @ts-expect-error captureStream exists in modern browsers
        const ms: MediaStream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
        setStream(ms);
      } else if (cfg.kind === 'mjpeg' || cfg.kind === 'image') {
        // For MJPEG we draw into a canvas at ~10fps and captureStream from it
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');

        let img: HTMLImageElement | null = null;
        const loop = () => {
          if (!canvasRef.current) return;
          if (!img) {
            img = new Image();
            img.crossOrigin = 'anonymous';
          }
          // Cache-bust for MJPEG snapshot URLs
          const sep = cfg.url.includes('?') ? '&' : '?';
          img.src = cfg.kind === 'mjpeg' ? cfg.url : `${cfg.url}${sep}t=${Date.now()}`;
          img.onload = () => {
            try {
              canvas.width = img!.naturalWidth || 640;
              canvas.height = img!.naturalHeight || 480;
              ctx.drawImage(img!, 0, 0, canvas.width, canvas.height);
            } catch {}
            rafRef.current = window.setTimeout(loop, 100) as unknown as number;
          };
          img.onerror = () => {
            rafRef.current = window.setTimeout(loop, 500) as unknown as number;
          };
        };
        loop();
        const ms: MediaStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(15);
        setStream(ms);
      }
      setConnected(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[IpCamera] connect failed:', msg);
      setError(msg);
      disconnect();
      return false;
    }
  }, [disconnect]);

  return { connect, disconnect, stream, connected, error };
}