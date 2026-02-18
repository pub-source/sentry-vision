import type { CameraState } from '@/types/dashboard';

interface DebugPanelProps {
  cameras: CameraState[];
  devices: MediaDeviceInfo[];
  errors: string[];
}

export default function DebugPanel({ cameras, devices, errors }: DebugPanelProps) {
  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-2">
      <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Debug</span>

      <div className="space-y-1">
        <span className="text-[9px] font-mono text-muted-foreground">Detected Devices ({devices.length})</span>
        {devices.map((d, i) => (
          <div key={i} className="text-[9px] font-mono text-foreground/70 truncate">
            {d.label || `Device ${i + 1}`}
          </div>
        ))}
        {devices.length === 0 && (
          <div className="text-[9px] font-mono text-muted-foreground">No devices detected</div>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-[9px] font-mono text-muted-foreground">Camera Status</span>
        {cameras.map(c => (
          <div key={c.id} className="flex justify-between text-[9px] font-mono">
            <span className="text-foreground/70">{c.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{c.fps} fps</span>
              <span className={c.active ? 'text-success' : 'text-destructive'}>
                {c.active ? 'LIVE' : 'OFF'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          <span className="text-[9px] font-mono text-destructive">Errors</span>
          {errors.slice(-5).map((e, i) => (
            <div key={i} className="text-[9px] font-mono text-destructive/70 break-all">{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
