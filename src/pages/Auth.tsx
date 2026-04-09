import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shield, UserPlus, QrCode, LogIn, ArrowLeft, Mail, Lock, User, Phone, Camera, Send, KeyRound } from 'lucide-react';

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

  useEffect(() => {
    if (urlCode && !inviteCode) {
      const normalized = normalizeInviteCode(urlCode);
      if (normalized) {
        setInviteCode(normalized);
        setMode('join-qr');
      }
    }
  }, [urlCode, inviteCode]);

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">Loading...</span>
        </div>
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
    if (joinMatch?.[1]) return normalizeInviteCode(joinMatch[1]);
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
    if (!joinName.trim()) { setError('Please enter your name'); return; }
    if (!matchedHousehold) { setError('No household selected'); return; }
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play().catch(() => {}); };
      }
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
              const normalizedCode = extractInviteCode(barcodes[0].rawValue || '');
              if (!normalizedCode) { setError('Could not read a valid invite code from QR.'); return; }
              setInviteCode(normalizedCode);
              setScanning(false);
              streamRef.current?.getTracks().forEach(t => t.stop());
              streamRef.current = null;
              return;
            }
          } catch {}
          if (streamRef.current) requestAnimationFrame(scanLoop);
        };
        setTimeout(() => requestAnimationFrame(scanLoop), 500);
      } else {
        setError('QR scanning not supported. Enter the code manually.');
        setScanning(false);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch {
      setError('Camera access denied. Enter the invite code manually.');
      setScanning(false);
    }
  };

  // Shared layout wrapper
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              MSDSystem
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Multimodal Saliency Detection System
          </p>
        </div>
        {children}
      </div>
    </div>
  );

  const ErrorMsg = ({ msg }: { msg: string }) => msg ? (
    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
      <span className="text-destructive text-sm">⚠</span>
      <p className="text-xs text-destructive">{msg}</p>
    </div>
  ) : null;

  const SuccessMsg = ({ msg }: { msg: string }) => msg ? (
    <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-3 py-2.5">
      <span className="text-success text-sm">✓</span>
      <p className="text-xs text-success">{msg}</p>
    </div>
  ) : null;

  const InputField = ({ icon: Icon, label, ...props }: { icon: any; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <input
          {...props}
          autoComplete={props.type === 'password' ? 'current-password' : props.type === 'email' ? 'email' : 'off'}
          className="w-full bg-secondary/60 border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>
    </div>
  );

  const PrimaryButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      {...props}
      className="w-full flex items-center justify-center gap-2 text-sm font-medium py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
    />
  );

  const BackButton = ({ onClick, label = '← Back' }: { onClick: () => void; label?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
    >
      <ArrowLeft className="w-3 h-3" />
      {label}
    </button>
  );

  // Forgot password
  if (mode === 'forgot') {
    return (
      <PageWrapper>
        {resetSent ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-success" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Check your inbox</h2>
            <p className="text-xs text-muted-foreground">We sent a password reset link to your email.</p>
            <BackButton onClick={() => { setMode('login'); setResetSent(false); setResetEmail(''); }} label="Back to sign in" />
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Reset Password</h2>
              <p className="text-xs text-muted-foreground">Enter your email to receive a reset link</p>
            </div>
            <InputField icon={Mail} label="Email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="your@gmail.com" />
            <ErrorMsg msg={error} />
            <PrimaryButton type="submit" disabled={submitting}>
              <KeyRound className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </PrimaryButton>
            <BackButton onClick={() => { setMode('login'); setError(''); }} label="Back to sign in" />
          </form>
        )}
      </PageWrapper>
    );
  }

  // Choose screen
  if (mode === 'choose') {
    return (
      <PageWrapper>
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Get Started</h2>
            <p className="text-xs text-muted-foreground">Choose how you'd like to begin</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { clearState(); setMode('create'); }}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Create Account
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set up a new household as admin
                </p>
              </div>
            </button>

            <button
              onClick={() => { clearState(); setMode('join-qr'); }}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-accent/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <QrCode className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                  Scan QR Code to Join
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Join an existing household with invite code
                </p>
              </div>
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <button
              onClick={() => { clearState(); setMode('login'); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Join via QR / Invite Code
  if (mode === 'join-qr') {
    return (
      <PageWrapper>
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Join Household</h2>
            <p className="text-xs text-muted-foreground">Scan a QR code or enter an invite code</p>
          </div>

          {scanning ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border aspect-square bg-background">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-primary rounded-xl animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">Point camera at the QR code</p>
              <button onClick={() => setScanning(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">Cancel scan</button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={startQrScan}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-accent/40 text-accent hover:bg-accent/5 hover:border-accent/60 transition-all text-sm font-medium"
              >
                <Camera className="w-4 h-4" />
                Scan QR Code
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">or enter code</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <form onSubmit={handleJoinWithCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(normalizeInviteCode(e.target.value))}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-4 py-3 text-base font-mono text-foreground text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="abc12345"
                    maxLength={8}
                    required
                  />
                </div>
                <ErrorMsg msg={error} />
                <SuccessMsg msg={success} />
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting ? 'Verifying...' : 'Verify Code'}
                </PrimaryButton>
              </form>
            </div>
          )}
          <BackButton onClick={() => { clearState(); setMode('choose'); }} />
        </div>
      </PageWrapper>
    );
  }

  // Join - Enter Name
  if (mode === 'join-name') {
    return (
      <PageWrapper>
        <form onSubmit={handleSubmitJoinRequest} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Join Household</h2>
            <p className="text-xs text-muted-foreground">Enter your details to request access</p>
          </div>
          {matchedHousehold && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5">
              <span className="text-accent text-sm">✓</span>
              <p className="text-xs text-accent font-medium">Joining: {matchedHousehold.name}</p>
            </div>
          )}
          <InputField icon={User} label="Your Name" type="text" value={joinName} onChange={e => setJoinName(e.target.value)} required placeholder="John Doe" />
          <InputField icon={Phone} label="Phone Number (optional)" type="tel" value={joinPhone} onChange={e => setJoinPhone(e.target.value)} placeholder="+1 555-123-4567" />
          <ErrorMsg msg={error} />
          <PrimaryButton type="submit" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Request to Join'}
          </PrimaryButton>
          <BackButton onClick={() => { clearState(); setMode('join-qr'); }} />
        </form>
      </PageWrapper>
    );
  }

  // Join - Submitted waiting
  if (mode === 'join-submitted' && joinRequestId) {
    return (
      <PageWrapper>
        <JoinWaitingScreen
          requestId={joinRequestId}
          householdName={matchedHousehold?.name || ''}
          memberName={joinName}
          onBack={() => { clearState(); setMode('choose'); }}
        />
      </PageWrapper>
    );
  }

  // Sign In
  if (mode === 'login') {
    return (
      <PageWrapper>
        <form onSubmit={handleSignIn} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Welcome Back</h2>
            <p className="text-xs text-muted-foreground">Sign in to your account</p>
          </div>
          <InputField icon={Mail} label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@gmail.com" />
          <InputField icon={Lock} label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
          <ErrorMsg msg={error} />
          <PrimaryButton type="submit" disabled={submitting}>
            <LogIn className="w-4 h-4" />
            {submitting ? 'Signing in...' : 'Sign In'}
          </PrimaryButton>
          <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="w-full text-xs text-muted-foreground hover:text-primary transition-colors py-1">
            Forgot password?
          </button>
          <BackButton onClick={() => { clearState(); setMode('choose'); }} />
        </form>
      </PageWrapper>
    );
  }

  // Create Account
  return (
    <PageWrapper>
      <form onSubmit={handleCreateAccount} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Create Account</h2>
          <p className="text-xs text-muted-foreground">Set up your admin account to get started</p>
        </div>

        {sessionStorage.getItem('pending_invite_code') && (
          <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5">
            <span className="text-accent text-sm">✓</span>
            <p className="text-xs text-accent font-medium">Joining with code: {sessionStorage.getItem('pending_invite_code')}</p>
          </div>
        )}

        <InputField icon={Mail} label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@gmail.com" />
        <InputField icon={Lock} label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
        <ErrorMsg msg={error} />
        <SuccessMsg msg={success} />
        <PrimaryButton type="submit" disabled={submitting}>
          <UserPlus className="w-4 h-4" />
          {submitting ? 'Creating...' : 'Create Account'}
        </PrimaryButton>
        <button type="button" onClick={() => { clearState(); setMode('login'); }} className="w-full text-xs text-muted-foreground hover:text-primary transition-colors py-1">
          Already have an account? Sign in
        </button>
        <BackButton onClick={() => { clearState(); setMode('choose'); }} />
      </form>
    </PageWrapper>
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
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('join_requests')
        .select('status')
        .eq('id', requestId)
        .single();
      if (data?.status === 'accepted') {
        setStatus('accepted');
        clearInterval(interval);
        sessionStorage.setItem('guest_member', JSON.stringify({ name: memberName, household: householdName }));
        setTimeout(() => navigate('/dashboard'), 1500);
      } else if (data?.status === 'rejected') {
        setStatus('rejected');
        clearInterval(interval);
      }
    }, 3000);

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
      <div className="bg-card rounded-xl border border-success/30 shadow-sm p-8 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-base font-semibold text-foreground">Welcome, {memberName}!</h2>
        <p className="text-xs text-muted-foreground">You've been accepted into "{householdName}". Redirecting...</p>
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-8 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">❌</span>
        </div>
        <h2 className="text-base font-semibold text-destructive">Request Declined</h2>
        <p className="text-xs text-muted-foreground">The household admin has declined your request.</p>
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back to start</button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-5 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      <h2 className="text-base font-semibold text-foreground">Waiting for Approval</h2>
      <p className="text-xs text-muted-foreground">
        Your request to join "<span className="font-medium text-foreground">{householdName}</span>" has been sent.
      </p>
      <p className="text-[10px] text-muted-foreground animate-pulse">Listening for response...</p>
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Cancel</button>
    </div>
  );
}
