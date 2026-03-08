import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';

type AuthMode = 'choose' | 'create' | 'join-qr' | 'login' | 'forgot';

export default function Auth() {
  const { user, loading, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    setScanning(false);
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
    setSubmitting(true);
    const { error: authError } = await signUp(email, password);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess('Account created! Check your email to confirm, then sign in.');
    }
    setSubmitting(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: authError } = await signIn(email, password);
    if (authError) setError(authError.message);
    setSubmitting(false);
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!inviteCode.trim()) {
      setError('Enter an invite code');
      return;
    }
    // Validate the invite code exists
    const { data: hh } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', inviteCode.trim())
      .maybeSingle();

    if (!hh) {
      setError('Invalid invite code. Ask your household admin for a valid code.');
      return;
    }
    // Code is valid — proceed to create account with invite code stored
    setSuccess(`Household "${hh.name}" found! Create your account to join.`);
    // Store invite code in sessionStorage for after signup
    sessionStorage.setItem('pending_invite_code', inviteCode.trim());
    setMode('create');
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
        videoRef.current.play().catch(() => {});
      }
      // Use BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const scanLoop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setInviteCode(code);
              setScanning(false);
              streamRef.current?.getTracks().forEach(t => t.stop());
              streamRef.current = null;
              return;
            }
          } catch { /* ignore scan errors */ }
          if (streamRef.current) requestAnimationFrame(scanLoop);
        };
        requestAnimationFrame(scanLoop);
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

  const Header = () => (
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
          <Header />
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
          <Header />

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
          <Header />

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
                      onChange={e => setInviteCode(e.target.value)}
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

  // Sign In screen
  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <Header />
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
        <Header />
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
          <button type="button" onClick={() => { clearState(); setMode('login'); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">Already have an account? Sign in</button>
          <button type="button" onClick={() => { clearState(); setMode('choose'); }} className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">← Back</button>
        </form>
      </div>
    </div>
  );
}
