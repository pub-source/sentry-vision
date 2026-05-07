import { useEffect, useState } from 'react';
import {
  subscribeCacheStats,
  prefetchModels,
  clearModelCache,
  getModelCacheSize,
  PREFETCH_URLS,
  type CacheStats,
} from '@/lib/modelCache';

function fmtBytes(b: number) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function fmtAgo(ts?: number) {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ModelCachePanel() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [size, setSize] = useState<{ entries: number; bytes: number }>({ entries: 0, bytes: 0 });
  const [warming, setWarming] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);

  useEffect(() => subscribeCacheStats(setStats), []);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const s = await getModelCacheSize();
      if (alive) setSize(s);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [stats?.hits, stats?.misses]);

  const handleWarm = async () => {
    setWarming(true);
    setProgress({ done: 0, total: PREFETCH_URLS.length, label: 'starting…' });
    try {
      await prefetchModels((done, total, label) => setProgress({ done, total, label }));
    } finally {
      setWarming(false);
      setTimeout(() => setProgress(null), 1500);
    }
  };

  const handleClear = async () => {
    await clearModelCache();
    setSize({ entries: 0, bytes: 0 });
  };

  const total = (stats?.hits ?? 0) + (stats?.misses ?? 0);
  const hitRate = total ? Math.round(((stats?.hits ?? 0) / total) * 100) : 0;

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Model Cache</span>
        <span className="text-[9px] font-mono text-muted-foreground">
          {stats?.strategy === 'memory' ? 'MEMORY' : 'PERSISTENT'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
        <div className="flex justify-between"><span className="text-foreground/70">Hits</span><span className="text-success">{stats?.hits ?? 0}</span></div>
        <div className="flex justify-between"><span className="text-foreground/70">Misses</span><span className="text-warning">{stats?.misses ?? 0}</span></div>
        <div className="flex justify-between"><span className="text-foreground/70">Hit rate</span><span className="text-foreground">{hitRate}%</span></div>
        <div className="flex justify-between"><span className="text-foreground/70">Entries</span><span className="text-foreground">{size.entries}</span></div>
        <div className="col-span-2 flex justify-between"><span className="text-foreground/70">Total size</span><span className="text-accent">{fmtBytes(size.bytes)}</span></div>
      </div>

      <div className="space-y-1">
        <span className="text-[9px] font-mono text-muted-foreground">Last downloads</span>
        {PREFETCH_URLS.map(({ label, url }) => {
          const ts = stats?.lastDownloads?.[url];
          // also surface any cached URL whose path includes this label's keyword
          const fallback = stats && Object.entries(stats.lastDownloads).find(([k]) =>
            label.toLowerCase().includes('coco') ? k.includes('ssdlite') :
            label.toLowerCase().includes('tiny') ? k.includes('tiny_face') :
            label.toLowerCase().includes('expression') ? k.includes('face_expression') : false
          );
          const when = ts ?? fallback?.[1];
          return (
            <div key={url} className="flex justify-between text-[9px] font-mono">
              <span className="text-foreground/70 truncate pr-2">{label}</span>
              <span className={when ? 'text-foreground' : 'text-muted-foreground'}>{fmtAgo(when)}</span>
            </div>
          );
        })}
      </div>

      {progress && (
        <div className="text-[9px] font-mono text-muted-foreground">
          Warming {progress.done}/{progress.total} — {progress.label}
        </div>
      )}

      <div className="flex gap-1">
        <button
          onClick={handleWarm}
          disabled={warming}
          className="flex-1 text-[10px] font-mono py-1.5 rounded border border-primary text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
        >
          {warming ? '⟳ Warming…' : '⚡ Prefetch Models'}
        </button>
        <button
          onClick={handleClear}
          className="text-[10px] font-mono py-1.5 px-2 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
