import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

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

interface JoinRequest {
  id: string;
  household_id: string;
  display_name: string;
  phone_number: string;
  status: string;
  created_at: string;
}

interface WakeWord {
  id: string;
  phrase: string;
  is_emergency: boolean;
  action_type: string;
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
  const [actionType, setActionType] = useState<'sms' | 'email' | 'both'>('sms');
  const [showAddPhrase, setShowAddPhrase] = useState(false);

  // Emergency state
  const [showEmergency, setShowEmergency] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const normalizeInviteCode = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);

  const fetchHousehold = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

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
        setWakeWords((ww as WakeWord[]) || []);
      }
    } else {
      // Check for pending invite code from QR join flow
      const pendingCode = sessionStorage.getItem('pending_invite_code');
      if (pendingCode) {
        setMode('join');
        setInviteCode(normalizeInviteCode(pendingCode));
        sessionStorage.removeItem('pending_invite_code');
      }
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

    await supabase.from('wake_words').insert({
      household_id: hh.id,
      phrase: '911',
      is_emergency: true,
      created_by: user.id,
      action_type: 'both',
    });

    fetchHousehold();
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const normalizedCode = normalizeInviteCode(inviteCode);
    if (!user || !displayName.trim() || !phoneNumber.trim() || normalizedCode.length !== 8) {
      setFormError('All fields are required and invite code must be 8 characters');
      return;
    }

    const { data: hh } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', normalizedCode)
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
      action_type: actionType,
    });

    setNewPhrase('');
    setIsEmergency(false);
    setActionType('sms');
    setShowAddPhrase(false);
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

  if (showEmergency) {
    return (
      <div className="min-h-screen bg-destructive/10 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-6xl animate-pulse">🚨</div>
          <h1 className="text-2xl font-mono font-bold text-destructive">EMERGENCY</h1>
          <p className="text-sm font-mono text-foreground">A 911 trigger was detected. Tap below to call emergency services.</p>
          <a href="tel:911" className="block w-full py-4 px-6 bg-destructive text-destructive-foreground font-mono font-bold text-lg rounded-md hover:bg-destructive/80 transition-all">📞 CALL 911</a>
          <button onClick={() => setShowEmergency(false)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground">Dismiss (false alarm)</button>
        </div>
      </div>
    );
  }

  const actionLabel = (type: string) => {
    switch (type) {
      case 'sms': return '📱 SMS';
      case 'email': return '📧 Email';
      case 'both': return '📱📧 Both';
      default: return type;
    }
  };

  const actionDescription = (type: string) => {
    switch (type) {
      case 'sms': return 'Text message sent to all member phone numbers';
      case 'email': return 'Email notification sent to admin/registered accounts';
      case 'both': return 'Both SMS and email notifications sent';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">HOUSEHOLD</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-[10px] font-mono text-primary hover:underline">← Dashboard</button>
          <span className="text-[10px] font-mono text-muted-foreground">{user.email}</span>
          <button onClick={signOut} className="text-[10px] font-mono text-muted-foreground hover:text-destructive">Sign Out</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {tab === 'setup' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['create', 'join'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setFormError(''); }}
                  className={`flex-1 text-xs font-mono py-2 rounded border transition-all ${mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  {m === 'create' ? '🏠 Create Household' : '📱 Join Household'}
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
                  <input type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary" placeholder="My Home" required />
                </div>
              )}

              {mode === 'join' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Invite Code</label>
                  <input type="text" value={inviteCode} onChange={e => setInviteCode(normalizeInviteCode(e.target.value))} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground text-center tracking-widest focus:outline-none focus:border-primary" placeholder="abc12345" required />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Your Name</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary" placeholder="John" required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Phone Number</label>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary" placeholder="+1 555-123-4567" required />
              </div>

              {formError && <p className="text-[10px] font-mono text-destructive">{formError}</p>}

              <button type="submit" className="w-full text-xs font-mono py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all">
                {mode === 'create' ? '▶ CREATE' : '▶ JOIN'}
              </button>
            </form>
          </div>
        )}

        {tab === 'manage' && household && (
          <div className="space-y-4">
            {/* Household Info with QR Code */}
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">{household.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowQr(p => !p)} className="text-[10px] font-mono text-accent border border-accent/30 px-2 py-1 rounded hover:bg-accent/10">
                    {showQr ? '✕ Hide QR' : '📱 Show QR'}
                  </button>
                  <button onClick={() => setShowEmergency(true)} className="text-[10px] font-mono text-destructive border border-destructive/30 px-2 py-1 rounded hover:bg-destructive/10">
                    🚨 Test 911
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">Invite Code:</span>
                <code className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{household.invite_code}</code>
                <button onClick={() => navigator.clipboard.writeText(household.invite_code)} className="text-[10px] font-mono text-muted-foreground hover:text-primary">📋 Copy</button>
              </div>

              {showQr && (
                <div className="flex flex-col items-center gap-2 py-3 border-t border-border">
                  <QRCodeSVG
                    value={`${window.location.origin}/join/${household.invite_code}`}
                    size={160}
                    bgColor="transparent"
                    fgColor="hsl(var(--foreground))"
                    level="M"
                  />
                  <p className="text-[9px] font-mono text-muted-foreground text-center">
                    Scan to join • Code: <code className="text-accent">{household.invite_code}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Members */}
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Members ({members.length})</span>
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

            {/* Wake Words & Phrases */}
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Wake Words & Phrases</span>
                <button
                  onClick={() => setShowAddPhrase(p => !p)}
                  className="text-[10px] font-mono text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary/10 transition-all"
                >
                  {showAddPhrase ? '✕ Cancel' : '+ Phrase'}
                </button>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground">
                Each phrase triggers a specific action when detected in audio.
              </p>

              <div className="space-y-1.5">
                {wakeWords.map(w => (
                  <div key={w.id} className="bg-secondary/50 rounded px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${w.is_emergency ? 'text-destructive' : 'text-foreground'}`}>
                          "{w.phrase}"
                        </span>
                        {w.is_emergency && (
                          <span className="text-[9px] font-mono text-destructive border border-destructive/30 px-1 rounded">🚨 EMERGENCY</span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteWakeWord(w.id)} className="text-[9px] font-mono text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        w.action_type === 'sms' ? 'bg-primary/10 text-primary' :
                        w.action_type === 'email' ? 'bg-accent/10 text-accent' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {actionLabel(w.action_type)}
                      </span>
                      <span className="text-[8px] font-mono text-muted-foreground">{actionDescription(w.action_type)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Phrase Form */}
              {showAddPhrase && (
                <form onSubmit={handleAddWakeWord} className="border border-primary/20 rounded-md p-3 space-y-3 bg-primary/5">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider">New Phrase</span>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">Phrase to detect</label>
                    <input
                      type="text"
                      value={newPhrase}
                      onChange={e => setNewPhrase(e.target.value)}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      placeholder="help, intruder, fire..."
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">What should this phrase do?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'sms' as const, icon: '📱', label: 'Text SMS', desc: 'Text all member phone numbers' },
                        { value: 'email' as const, icon: '📧', label: 'Email', desc: 'Email admin & registered users' },
                        { value: 'both' as const, icon: '📱📧', label: 'Both', desc: 'SMS + Email notification' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setActionType(opt.value)}
                          className={`text-left p-2 rounded border transition-all ${
                            actionType === opt.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <span className="text-sm">{opt.icon}</span>
                          <p className={`text-[10px] font-mono font-bold mt-1 ${actionType === opt.value ? 'text-primary' : 'text-foreground'}`}>
                            {opt.label}
                          </p>
                          <p className="text-[8px] font-mono text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEmergency(p => !p)}
                      className={`text-[10px] font-mono py-1.5 px-3 rounded border transition-all ${
                        isEmergency ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {isEmergency ? '🚨 Emergency ON' : '○ Not Emergency'}
                    </button>
                    <span className="text-[8px] font-mono text-muted-foreground">Emergency phrases also trigger 911 prompt</span>
                  </div>

                  <button type="submit" className="w-full text-xs font-mono py-2 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-all">
                    + ADD PHRASE
                  </button>
                </form>
              )}
            </div>

            <button onClick={() => navigate('/')} className="w-full text-xs font-mono py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all">
              ▶ GO TO MONITORING DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
