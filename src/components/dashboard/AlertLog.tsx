import type { Alert } from '@/types/dashboard';

interface AlertLogProps {
  alerts: Alert[];
  visible: boolean;
}

export default function AlertLog({ alerts, visible }: AlertLogProps) {
  if (!visible) return null;

  const severityStyles = {
    low: 'border-l-info text-info',
    medium: 'border-l-warning text-warning',
    high: 'border-l-destructive text-destructive',
    critical: 'border-l-destructive text-destructive alert-pulse',
  };

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-2 max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between sticky top-0 bg-card pb-1">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
          Alerts ({alerts.length})
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-[10px] font-mono text-muted-foreground text-center py-4">No alerts</p>
      ) : (
        <div className="space-y-1">
          {alerts.slice(0, 50).map(alert => (
            <div
              key={alert.id}
              className={`text-[10px] font-mono px-2 py-1.5 bg-secondary/50 rounded-sm border-l-2 fade-in-up ${severityStyles[alert.severity]}`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="opacity-90">{alert.message}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <span className="text-muted-foreground">CAM {alert.cameraId}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
