import { useRef, useCallback, useState } from 'react';
import type { AudioFeatures } from '@/types/dashboard';

export function useAudioAnalysis() {
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({
    decibel: -60,
    speechDetected: false,
    pitchEstimate: 0,
    waveform: new Array(64).fill(0),
  });

  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      contextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);
      const freqData = new Uint8Array(bufferLength);

      const analyze = () => {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // RMS for decibel
        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const val = (timeData[i] - 128) / 128;
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / timeData.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : -60;

        // Speech detection (energy in 300-3000Hz range)
        const sampleRate = ctx.sampleRate;
        const binSize = sampleRate / analyser.fftSize;
        const lowBin = Math.floor(300 / binSize);
        const highBin = Math.floor(3000 / binSize);
        let speechEnergy = 0;
        for (let i = lowBin; i < highBin && i < freqData.length; i++) {
          speechEnergy += freqData[i];
        }
        speechEnergy /= (highBin - lowBin);
        const speechDetected = speechEnergy > 40;

        // Pitch estimate (simple autocorrelation peak)
        let maxCorr = 0;
        let pitchPeriod = 0;
        const minLag = Math.floor(sampleRate / 500); // 500Hz max
        const maxLag = Math.floor(sampleRate / 80);  // 80Hz min
        for (let lag = minLag; lag < maxLag && lag < timeData.length; lag++) {
          let corr = 0;
          for (let i = 0; i < timeData.length - lag; i++) {
            corr += (timeData[i] - 128) * (timeData[i + lag] - 128);
          }
          if (corr > maxCorr) {
            maxCorr = corr;
            pitchPeriod = lag;
          }
        }
        const pitchEstimate = pitchPeriod > 0 ? Math.round(sampleRate / pitchPeriod) : 0;

        // Waveform (downsample to 64 points)
        const waveform: number[] = [];
        const step = Math.floor(timeData.length / 64);
        for (let i = 0; i < 64; i++) {
          waveform.push((timeData[i * step] - 128) / 128);
        }

        setAudioFeatures({
          decibel: Math.max(-60, Math.min(0, db)),
          speechDetected,
          pitchEstimate: speechDetected ? pitchEstimate : 0,
          waveform,
        });

        animRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    } catch {
      // Audio not available, use simulation
      const simulate = () => {
        const t = Date.now() / 1000;
        const waveform = Array.from({ length: 64 }, (_, i) =>
          Math.sin(i * 0.3 + t * 2) * 0.3 * (Math.random() * 0.5 + 0.5)
        );
        setAudioFeatures({
          decibel: -30 + Math.sin(t * 0.5) * 15 + Math.random() * 5,
          speechDetected: Math.sin(t * 0.3) > 0.5,
          pitchEstimate: Math.sin(t * 0.3) > 0.5 ? 150 + Math.random() * 100 : 0,
          waveform,
        });
        animRef.current = requestAnimationFrame(simulate);
      };
      simulate();
    }
  }, []);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    analyserRef.current = null;
    setAudioFeatures({ decibel: -60, speechDetected: false, pitchEstimate: 0, waveform: new Array(64).fill(0) });
  }, []);

  return { audioFeatures, startAudio, stopAudio };
}
