import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';

interface Household {
  id: string;
  name: string;
  invite_code: string;
}

interface Member {
  id: string;
  display_name: string;
  phone_number: string;
  is_admin: boolean;
  user_id: string;
}

interface WakeWord {
  id: string;
  phrase: string;
  is_emergency: boolean;
}

export default function HouseholdPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [wakeWords, setWakeWords] = useState<WakeWord[]>([]);
  const [tab, setTab] = useState<'setup' | 'manage'>('setup');
  const [loadingData, setLoadingData] = useState(true);

  // Setup form
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');

  // Wake word form
  const [newPhrase, setNewPhrase] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  // Emergency state
  const [showEmergency, setShowEmergency] = useState(false);

  const fetchHousehold = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    // Check if user belongs to a household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      const { data: hh } = await supabase
        .from('households')
        .select('*')
        .eq('id', membership.household_id)
        .single();

      if (hh) {
        setHousehold(hh);
        setTab('manage');

        const { data: mems } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', hh.id);
        setMembers(mems || []);

        const { data: ww } = await supabase
          .from('wake_words')
          .select('*')
          .eq('household_id', hh.id);
        setWakeWords(ww || []);
      }
    } else {
      setTab('setup');
    }
    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!user || !displayName.trim() || !phoneNumber.trim() || !householdName.trim()) {
      setFormError('All fields are required');
      return;
    }

    const { data: hh, error: hhErr } = await supabase
      .from('households')
      .insert({ name: householdName, created_by: user.id })
      .select()
      .single();

    if (hhErr || !hh) { setFormError(hhErr?.message || 'Failed to create household'); return; }

    const { error: memErr } = await supabase
      .from('household_members')
      .insert({
        household_id: hh.id,
        user_id: user.id,
        display_name: displayName,
        phone_number: phoneNumber,
        is_admin: true,
      });

    if (memErr) { setFormError(memErr.message); return; }

    // Add default "911" emergency wake word
    await supabase.from('wake_words').insert({
      household_id: hh.id,
      phrase: '911',
      is_emergency: true,
      created_by: user.id,
    });

    fetchHousehold();
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!user || !displayName.trim() || !phoneNumber.trim() || !inviteCode.trim()) {
      setFormError('All fields are required');
      return;
    }

    const { data: hh } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.trim())
      .maybeSingle();

    if (!hh) { setFormError('Invalid invite code'); return; }

    const { error: memErr } = await supabase
      .from('household_members')
      .insert({
        household_id: hh.id,
        user_id: user.id,
        display_name: displayName,
        phone_number: phoneNumber,
        is_admin: false,
      });

    if (memErr) { setFormError(memErr.message); return; }
    fetchHousehold();
  };

  const handleAddWakeWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !newPhrase.trim()) return;

    await supabase.from('wake_words').insert({
      household_id: household.id,
      phrase: newPhrase.trim().toLowerCase(),
      is_emergency: isEmergency,
      created_by: user?.id,
    });

    setNewPhrase('');
    setIsEmergency(false);
    fetchHousehold();
  };

  const handleDeleteWakeWord = async (id: string) => {
    await supabase.from('wake_words').delete().eq('id', id);
    fetchHousehold();
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // 911 Emergency screen
  if (showEmergency) {
    return (
      <div className="min-h-screen bg-destructive/10 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-6xl animate-pulse">🚨</div>
          <h1 className="text-2xl font-mono font-bold text-destructive">EMERGENCY</h1>
          <p className="text-sm font-mono text-foreground">
            A 911 trigger was detected. Tap below to call emergency services.
          </p>
          <a
            href="tel:911"
            className="block w-full py-4 px-6 bg-destructive text-destructive-foreground font-mono font-bold text-lg rounded-md hover:bg-destructive/80 transition-all"
          >
            📞 CALL 911
          </a>
          <button
            onClick={() => setShowEmergency(false)}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
          >
            Dismiss (false alarm)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">HOUSEHOLD</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-[10px] font-mono text-primary hover:underline"
          >
            ← Dashboard
          </button>
          <span className="text-[10px] font-mono text-muted-foreground">{user.email}</span>
          <button
            onClick={signOut}
            className="text-[10px] font-mono text-muted-foreground hover:text-destructive"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {tab === 'setup' && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(['create', 'join'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setFormError(''); }}
                  className={`flex-1 text-xs font-mono py-2 rounded border transition-all ${
                    mode === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {m === 'create' ? '+ Create Household' : '→ Join Household'}
                </button>
              ))}
            </div>

            <form
              onSubmit={mode === 'create' ? handleCreateHousehold : handleJoinHousehold}
              className="bg-card rounded-md border border-border panel-glow p-4 space-y-3"
            >
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                {mode === 'create' ? 'New Household' : 'Join Existing'}
              </span>

              {mode === 'create' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Household Name</label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={e => setHouseholdName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                    placeholder="My Home"
                    required
                  />
                </div>
              )}

              {mode === 'join' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                    placeholder="abc12345"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  placeholder="+1 555-123-4567"
                  required
                />
              </div>

              {formError && <p className="text-[10px] font-mono text-destructive">{formError}</p>}

              <button
                type="submit"
                className="w-full text-xs font-mono py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all"
              >
                {mode === 'create' ? '▶ CREATE' : '▶ JOIN'}
              </button>
            </form>
          </div>
        )}

        {tab === 'manage' && household && (
          <div className="space-y-4">
            {/* Household Info */}
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  {household.name}
                </span>
                <button
                  onClick={() => setShowEmergency(true)}
                  className="text-[10px] font-mono text-destructive border border-destructive/30 px-2 py-1 rounded hover:bg-destructive/10"
                >
                  🚨 Test 911
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">Invite Code:</span>
                <code className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">
                  {household.invite_code}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(household.invite_code)}
                  className="text-[10px] font-mono text-muted-foreground hover:text-primary"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                Members ({members.length})
              </span>
              <div className="space-y-1.5">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2">
                    <div>
                      <span className="text-xs font-mono text-foreground">{m.display_name}</span>
                      {m.is_admin && <span className="text-[9px] font-mono text-accent ml-2">ADMIN</span>}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{m.phone_number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wake Words */}
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-3">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                Wake Words & Phrases
              </span>
              <p className="text-[9px] font-mono text-muted-foreground">
                Words/phrases to listen for. Emergency phrases trigger the 911 prompt.
              </p>

              <div className="space-y-1.5">
                {wakeWords.map(w => (
                  <div key={w.id} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${w.is_emergency ? 'text-destructive' : 'text-foreground'}`}>
                        "{w.phrase}"
                      </span>
                      {w.is_emergency && (
                        <span className="text-[9px] font-mono text-destructive border border-destructive/30 px-1 rounded">
                          🚨 EMERGENCY
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteWakeWord(w.id)}
                      className="text-[9px] font-mono text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddWakeWord} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={newPhrase}
                    onChange={e => setNewPhrase(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                    placeholder="help, intruder, fire..."
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmergency(p => !p)}
                  className={`text-[10px] font-mono py-2 px-2 rounded border transition-all ${
                    isEmergency ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border text-muted-foreground'
                  }`}
                >
                  {isEmergency ? '🚨' : '○'} 911
                </button>
                <button
                  type="submit"
                  className="text-xs font-mono py-2 px-3 rounded bg-primary text-primary-foreground hover:bg-primary/80"
                >
                  + Add
                </button>
              </form>
            </div>

            {/* Go to Dashboard */}
            <button
              onClick={() => navigate('/')}
              className="w-full text-xs font-mono py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all"
            >
              ▶ GO TO MONITORING DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
