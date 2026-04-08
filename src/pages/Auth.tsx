import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import { Navigate, useNavigate, useParams } from 'react-router-dom';

type AuthMode = 'choose' | 'create' | 'join-qr' | 'join-name' | 'join-submitted' | 'login' | 'forgot';

export default function Auth() {
  const { user, loading, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const [mode, setMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [matchedHousehold, setMatchedHousehold] = useState<{ id: string; name: string } | null>(null);
  const [joinRequestId, setJoinRequestId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle URL invite code from /join/:code route
  useEffect(() => {
    if (urlCode && !inviteCode) {
      const normalized = normalizeInviteCode(urlCode);
      if (normalized) {
        setInviteCode(normalized);
        setMode('join-qr');
      }
    }
  }, [urlCode, inviteCode]);

  // Cleanup camera on unmount or mode change
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== 'join-qr' || !scanning) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  }, [mode, scanning]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }

  if (user) return <Navigate to="/household" replace />;

  const clearState = () => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setInviteCode('');
    setJoinName('');
    setJoinPhone('');
    setMatchedHousehold(null);
    setScanning(false);
  };

  const normalizeInviteCode = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);

  const extractInviteCode = (rawValue: string) => {
    const raw = rawValue.trim();
    const joinMatch = raw.match(/\/join\/([a-z0-9]{8})/i);
    if (joinMatch?.[1]) {
      return normalizeInviteCode(joinMatch[1]);
    }
    return normalizeInviteCode(raw);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
    setSubmitting(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are allowed.');
      return;
    }
    setSubmitting(true);
    const { error: authError } = await signUp(email, password);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess('Account created successfully! You can now sign in.');
    }
    setSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are allowed.');
      return;
    }
    setSubmitting(true);
    const { error: authError } = await signIn(email, password);
    if (authError) setError(authError.message);
    setSubmitting(false);
  };


  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedCode = normalizeInviteCode(inviteCode);
    if (normalizedCode.length !== 8) {
      setError('Invite code must be 8 characters');
      return;
    }

    const { data: hh } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', normalizedCode)
      .maybeSingle();

    if (!hh) {
      setError('Invalid invite code. Ask your household admin for a valid code.');
      return;
    }

    setInviteCode(normalizedCode);
    setMatchedHousehold({ id: hh.id, name: hh.name });
    setMode('join-name');
  };

  const handleSubmitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!joinName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!matchedHousehold) {
      setError('No household selected');
      return;
    }
    setSubmitting(true);
    const { data: inserted, error: insertErr } = await supabase
      .from('join_requests')
      .insert({
        household_id: matchedHousehold.id,
        display_name: joinName.trim(),
        phone_number: joinPhone.trim(),
        status: 'pending',
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      setError(insertErr?.message || 'Failed to submit request');
    } else {
      setJoinRequestId(inserted.id);
      setMode('join-submitted');
    }
    setSubmitting(false);
  };

  const startQrScan = async () => {
    setScanning(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to actually load before scanning
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const scanLoop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || !streamRef.current) {
            if (streamRef.current) requestAnimationFrame(scanLoop);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawCode = barcodes[0].rawValue || '';
              const normalizedCode = extractInviteCode(rawCode);
              if (!normalizedCode) {
                setError('Could not read a valid invite code from QR. Try again.');
                return;
              }
              setInviteCode(normalizedCode);
              setScanning(false);
              streamRef.current?.getTracks().forEach(t => t.stop());
              streamRef.current = null;
              return;
            }
          } catch { /* ignore scan errors */ }
          if (streamRef.current) requestAnimationFrame(scanLoop);
        };
        // Start scanning after a short delay to ensure video is ready
        setTimeout(() => requestAnimationFrame(scanLoop), 500);
      } else {
        setError('QR scanning not supported in this browser. Enter the code manually.');
        setScanning(false);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {
      setError('Camera access denied. Enter the invite code manually.');
      setScanning(false);
    }
  };

  const renderHeader = () => (
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">
          SALIENCY GUARD
        </h1>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        Household Security Monitoring System
      </p>
    </div>
  );


  // Forgot password screen
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {renderHeader()}
          {resetSent ? (
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-3 text-center">
              <p className="text-xs font-mono text-primary">Recovery email sent!</p>
              <p className="text-[10px] font-mono text-muted-foreground">Check your inbox for a password reset link.</p>
              <button type="button" onClick={() => { setMode('login'); setResetSent(false); setResetEmail(''); }} className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Reset Password</span>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Email</label>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="your@email.com" />
              </div>
              {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full text-xs font-mono py-2 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">{submitting ? '...' : '▶ SEND RESET LINK'}</button>
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Choose screen: Create Account or Scan QR Code
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {renderHeader()}

          <div className="bg-card rounded-md border border-border panel-glow p-5 space-y-4">
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
              How would you like to get started?
            </span>

            <button
              onClick={() => { clearState(); setMode('create'); }}
              className="w-full text-left bg-secondary/50 hover:bg-secondary border border-border hover:border-primary rounded-md p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🏠</span>
                <div>
                  <p className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                    Create Account
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                    Set up a new household as admin
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { clearState(); setMode('join-qr'); }}
              className="w-full text-left bg-secondary/50 hover:bg-secondary border border-border hover:border-accent rounded-md p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📱</span>
                <div>
                  <p className="text-xs font-mono font-bold text-foreground group-hover:text-accent transition-colors">
                    Scan QR Code to Join
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                    Join an existing household with invite code
                  </p>
                </div>
              </div>
            </button>


            <div className="border-t border-border pt-3">
              <button
                onClick={() => { clearState(); setMode('login'); }}
                className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                Already have an account? Sign in →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Join via QR / Invite Code
  if (mode === 'join-qr') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {renderHeader()}

          <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
              Join Household
            </span>

            {/* QR Scanner */}
            {scanning ? (
              <div className="space-y-2">
                <div className="relative rounded overflow-hidden border border-border aspect-square bg-background">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-0 border-2 border-primary/30 rounded" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary rounded-lg animate-pulse" />
                </div>
                <p className="text-[9px] font-mono text-muted-foreground text-center">Point camera at the QR code</p>
                <button onClick={() => setScanning(false)} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">Cancel scan</button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={startQrScan}
                  className="w-full text-xs font-mono py-3 rounded-md border border-accent bg-accent/10 text-accent hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
                >
                  📷 SCAN QR CODE
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[9px] font-mono text-muted-foreground">OR</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <form onSubmit={handleJoinWithCode} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">Enter Invite Code</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(normalizeInviteCode(e.target.value))}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground text-center tracking-widest focus:outline-none focus:border-primary"
                      placeholder="abc12345"
                      maxLength={8}
                      required
                    />
                  </div>

                  {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
                  {success && <p className="text-[10px] font-mono text-success">{success}</p>}

                  <button type="submit" disabled={submitting} className="w-full text-xs font-mono py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
                    ▶ VERIFY CODE
                  </button>
                </form>
              </div>
            )}

            <button
              type="button"
              onClick={() => { clearState(); setMode('choose'); }}
              className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join - Enter Name
  if (mode === 'join-name') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {renderHeader()}
          <form onSubmit={handleSubmitJoinRequest} className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Join Household</span>
            {matchedHousehold && (
              <div className="bg-accent/10 border border-accent/30 rounded px-3 py-2">
                <p className="text-[9px] font-mono text-accent">
                  ✓ Household: "{matchedHousehold.name}"
                </p>
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Your Name</label>
                <input type="text" value={joinName} onChange={e => setJoinName(e.target.value)} required className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="John" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Phone Number (optional)</label>
                <input type="tel" value={joinPhone} onChange={e => setJoinPhone(e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="+1 555-123-4567" />
              </div>
            </div>
            {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full text-xs font-mono py-2 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">{submitting ? '...' : '▶ REQUEST TO JOIN'}</button>
            <button type="button" onClick={() => { clearState(); setMode('join-qr'); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back</button>
          </form>
        </div>
      </div>
    );
  }

  // Join - Submitted, waiting for admin approval with realtime
  if (mode === 'join-submitted' && joinRequestId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {renderHeader()}
          <JoinWaitingScreen
            requestId={joinRequestId}
            householdName={matchedHousehold?.name || ''}
            memberName={joinName}
            onBack={() => { clearState(); setMode('choose'); }}
          />
        </div>
      </div>
    );
  }

  // Sign In screen
  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {renderHeader()}
          <form onSubmit={handleSignIn} className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Sign In</span>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="your@email.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="••••••••" />
              </div>
            </div>
            {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full text-xs font-mono py-2 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">{submitting ? '...' : '▶ SIGN IN'}</button>
            {renderGoogleButton()}
            <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">Forgot password?</button>
            <button type="button" onClick={() => { clearState(); setMode('choose'); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back</button>
          </form>
        </div>
      </div>
    );
  }

  // Create Account screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {renderHeader()}
        <form onSubmit={handleCreateAccount} className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Create Account</span>

          {sessionStorage.getItem('pending_invite_code') && (
            <div className="bg-accent/10 border border-accent/30 rounded px-3 py-2">
              <p className="text-[9px] font-mono text-accent">
                ✓ Joining with invite code: {sessionStorage.getItem('pending_invite_code')}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="your@email.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="••••••••" />
            </div>
          </div>
          {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
          {success && <p className="text-[10px] font-mono text-success">{success}</p>}
          <button type="submit" disabled={submitting} className="w-full text-xs font-mono py-2 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">{submitting ? '...' : '▶ CREATE ACCOUNT'}</button>
          {renderGoogleButton()}
          <button type="button" onClick={() => { clearState(); setMode('login'); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">Already have an account? Sign in</button>
          <button type="button" onClick={() => { clearState(); setMode('choose'); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back</button>
        </form>
      </div>
    </div>
  );
}

// Waiting screen with realtime polling for admin approval
function JoinWaitingScreen({ requestId, householdName, memberName, onBack }: {
  requestId: string;
  householdName: string;
  memberName: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  useEffect(() => {
    // Poll every 3 seconds for status change
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('join_requests')
        .select('status')
        .eq('id', requestId)
        .single();
      if (data?.status === 'accepted') {
        setStatus('accepted');
        clearInterval(interval);
        // Store guest session info
        sessionStorage.setItem('guest_member', JSON.stringify({ name: memberName, household: householdName }));
        setTimeout(() => navigate('/dashboard'), 1500);
      } else if (data?.status === 'rejected') {
        setStatus('rejected');
        clearInterval(interval);
      }
    }, 3000);

    // Also subscribe to realtime
    const channel = supabase
      .channel(`join-request-${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'join_requests',
        filter: `id=eq.${requestId}`,
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        if (newStatus === 'accepted') {
          setStatus('accepted');
          sessionStorage.setItem('guest_member', JSON.stringify({ name: memberName, household: householdName }));
          setTimeout(() => navigate('/dashboard'), 1500);
        } else if (newStatus === 'rejected') {
          setStatus('rejected');
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [requestId, memberName, householdName, navigate]);

  if (status === 'accepted') {
    return (
      <div className="bg-card rounded-md border border-primary/30 panel-glow p-5 space-y-4 text-center">
        <div className="text-3xl">🎉</div>
        <p className="text-xs font-mono text-primary font-bold">Welcome, {memberName}!</p>
        <p className="text-[10px] font-mono text-muted-foreground">You've been accepted into "{householdName}". Redirecting to dashboard...</p>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse mx-auto" />
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-card rounded-md border border-destructive/30 panel-glow p-5 space-y-4 text-center">
        <div className="text-3xl">❌</div>
        <p className="text-xs font-mono text-destructive font-bold">Request Declined</p>
        <p className="text-[10px] font-mono text-muted-foreground">The household admin has declined your request.</p>
        <button onClick={onBack} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back to start</button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-5 space-y-4 text-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      <p className="text-xs font-mono text-primary font-bold">Waiting for Approval</p>
      <p className="text-[10px] font-mono text-muted-foreground">
        Your request to join "{householdName}" has been sent. The admin will review it shortly.
      </p>
      <p className="text-[9px] font-mono text-muted-foreground animate-pulse">Listening for response...</p>
      <button onClick={onBack} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Cancel</button>
    </div>
  );
}
