import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  avg_attention: number | null;
  max_attention: number | null;
  avg_saliency: number | null;
  total_objects_detected: number;
  total_alerts: number;
  saliency_mode: string;
}

interface DetectionDataPoint {
  timestamp: string;
  attention_score: number | null;
  saliency_score: number | null;
  decibel: number | null;
  speech_detected: boolean;
  object_count: number;
  objects_detected: any;
  audio_event: string;
  fps: number | null;
}

interface ObjectLog {
  label: string;
  confidence: number;
  timestamp: string;
}

export default function CloudDataPanel() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [dataPoints, setDataPoints] = useState<DetectionDataPoint[]>([]);
  const [objectLogs, setObjectLogs] = useState<ObjectLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [objectSummary, setObjectSummary] = useState<Record<string, { count: number; avgConf: number }>>({});

  useEffect(() => {
    if (!user) return;
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('detection_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (data) setSessions(data as Session[]);
    setLoading(false);
  };

  const loadSessionData = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoading(true);

    const [dpRes, olRes] = await Promise.all([
      supabase.from('detection_data').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true }).limit(1000),
      supabase.from('detected_objects_log').select('label, confidence, timestamp').eq('session_id', sessionId).order('timestamp', { ascending: true }).limit(1000),
    ]);

    if (dpRes.data) setDataPoints(dpRes.data as DetectionDataPoint[]);
    if (olRes.data) {
      setObjectLogs(olRes.data as ObjectLog[]);
      // Compute object summary
      const summary: Record<string, { count: number; totalConf: number }> = {};
      (olRes.data as ObjectLog[]).forEach(o => {
        if (!summary[o.label]) summary[o.label] = { count: 0, totalConf: 0 };
        summary[o.label].count++;
        summary[o.label].totalConf += o.confidence;
      });
      const result: Record<string, { count: number; avgConf: number }> = {};
      Object.entries(summary).forEach(([k, v]) => {
        result[k] = { count: v.count, avgConf: v.totalConf / v.count };
      });
      setObjectSummary(result);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-md p-6 text-center">
        <p className="text-sm font-mono text-muted-foreground">Sign in to view cloud detection data</p>
      </div>
    );
  }

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className="space-y-4">
      {/* Sessions list */}
      <div className="bg-card border border-border rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Detection Sessions</h4>
          <button onClick={loadSessions} className="text-[9px] font-mono text-primary hover:underline">
            ↻ Refresh
          </button>
        </div>
        {loading && sessions.length === 0 && (
          <p className="text-[10px] font-mono text-muted-foreground">Loading...</p>
        )}
        {sessions.length === 0 && !loading && (
          <p className="text-[10px] font-mono text-muted-foreground">No sessions recorded yet. Start monitoring on the dashboard to collect data.</p>
        )}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSessionData(s.id)}
              className={`w-full text-left p-2 rounded border transition-all text-[10px] font-mono ${
                selectedSession === s.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground/80 hover:border-muted-foreground'
              }`}
            >
              <div className="flex justify-between">
                <span>{new Date(s.started_at).toLocaleString()}</span>
                <span className="text-muted-foreground">{s.saliency_mode}</span>
              </div>
              <div className="flex gap-3 mt-0.5 text-muted-foreground">
                <span>ᾱ={s.avg_attention?.toFixed(1) ?? '–'}</span>
                <span>S̄={s.avg_saliency?.toFixed(1) ?? '–'}</span>
                <span>{s.total_objects_detected} obj</span>
                <span>{s.total_alerts} alerts</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Session detail */}
      {selectedSession && selectedSessionData && (
        <>
          {/* Summary stats */}
          <div className="bg-card border border-border rounded-md p-4">
            <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-3">Session Summary</h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Avg Attention', value: selectedSessionData.avg_attention?.toFixed(1) ?? '–', color: 'text-accent' },
                { label: 'Max Attention', value: selectedSessionData.max_attention?.toFixed(1) ?? '–', color: 'text-destructive' },
                { label: 'Avg Saliency', value: selectedSessionData.avg_saliency?.toFixed(1) ?? '–', color: 'text-primary' },
                { label: 'Total Alerts', value: String(selectedSessionData.total_alerts), color: 'text-warning' },
              ].map(stat => (
                <div key={stat.label} className="bg-secondary/30 rounded p-2 text-center">
                  <p className="text-[9px] font-mono text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-mono font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Object detection summary */}
          {Object.keys(objectSummary).length > 0 && (
            <div className="bg-card border border-border rounded-md p-4">
              <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-3">
                Objects Detected ({objectLogs.length} total detections)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(objectSummary)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([label, stats]) => (
                    <div key={label} className="bg-secondary/30 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold text-foreground">{label}</span>
                        <span className="text-[9px] font-mono text-accent">{stats.count}×</span>
                      </div>
                      <div className="h-1.5 bg-secondary/50 rounded mt-1 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded transition-all"
                          style={{ width: `${Math.min(100, (stats.avgConf * 100))}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-muted-foreground">
                        avg conf: {(stats.avgConf * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Time series data */}
          {dataPoints.length > 0 && (
            <div className="bg-card border border-border rounded-md p-4">
              <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-3">
                Time Series ({dataPoints.length} samples)
              </h4>
              {/* Mini chart */}
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground">Attention Score</span>
                  <div className="flex items-end h-10 gap-px mt-1">
                    {dataPoints.slice(-120).map((d, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${Math.max(2, d.attention_score ?? 0)}%`,
                          backgroundColor: (d.attention_score ?? 0) > 70
                            ? 'hsl(var(--destructive))'
                            : (d.attention_score ?? 0) > 40
                            ? 'hsl(var(--warning))'
                            : 'hsl(var(--primary))',
                          opacity: 0.5 + (i / 120) * 0.5,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground">Saliency Score</span>
                  <div className="flex items-end h-10 gap-px mt-1">
                    {dataPoints.slice(-120).map((d, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-accent"
                        style={{
                          height: `${Math.max(2, d.saliency_score ?? 0)}%`,
                          opacity: 0.5 + (i / 120) * 0.5,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground">Object Count</span>
                  <div className="flex items-end h-8 gap-px mt-1">
                    {dataPoints.slice(-120).map((d, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-info"
                        style={{
                          height: `${Math.max(2, Math.min(100, d.object_count * 20))}%`,
                          opacity: 0.5 + (i / 120) * 0.5,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Raw data table */}
              <div className="mt-3 max-h-40 overflow-y-auto">
                <table className="w-full text-[8px] font-mono">
                  <thead className="text-muted-foreground sticky top-0 bg-card">
                    <tr>
                      <th className="text-left p-1">Time</th>
                      <th className="text-right p-1">α</th>
                      <th className="text-right p-1">S</th>
                      <th className="text-right p-1">dB</th>
                      <th className="text-right p-1">Obj</th>
                      <th className="text-right p-1">Event</th>
                      <th className="text-right p-1">FPS</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground/80">
                    {dataPoints.slice(-50).reverse().map((d, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="p-1">{new Date(d.timestamp).toLocaleTimeString()}</td>
                        <td className="text-right p-1">{d.attention_score?.toFixed(0)}</td>
                        <td className="text-right p-1">{d.saliency_score?.toFixed(0)}</td>
                        <td className="text-right p-1">{d.decibel?.toFixed(1)}</td>
                        <td className="text-right p-1">{d.object_count}</td>
                        <td className="text-right p-1">{d.audio_event}</td>
                        <td className="text-right p-1">{d.fps?.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
