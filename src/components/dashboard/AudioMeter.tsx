import type { AudioFeatures } from '@/types/dashboard';

interface AudioMeterProps {
  features: AudioFeatures;
  active: boolean;
}

export default function AudioMeter({ features, active }: AudioMeterProps) {
  const dbNormalized = Math.max(0, Math.min(100, ((features.decibel + 60) / 60) * 100));

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Audio Analysis</span>
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success' : 'bg-destructive'}`} />
      </div>

      {/* Decibel meter */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>Level</span>
          <span>{features.decibel.toFixed(1)} dB</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${dbNormalized}%`,
              background: dbNormalized > 80
                ? 'hsl(var(--destructive))'
                : dbNormalized > 50
                ? 'hsl(var(--warning))'
                : 'hsl(var(--primary))',
            }}
          />
        </div>
      </div>

      {/* Waveform */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-muted-foreground">Waveform</span>
        <div className="flex items-center h-8 gap-px">
          {features.waveform.map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/60 rounded-sm transition-all duration-75"
              style={{
                height: `${Math.abs(v) * 100}%`,
                minHeight: '1px',
                opacity: 0.4 + Math.abs(v) * 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex gap-2 flex-wrap">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          features.speechDetected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground'
        }`}>
          {features.speechDetected ? '● SPEECH' : '○ NO SPEECH'}
        </span>
        {features.pitchEstimate > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            ~{features.pitchEstimate} Hz
          </span>
        )}
      </div>
    </div>
  );
}
