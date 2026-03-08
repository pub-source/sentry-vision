import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

export default function Auth() {
  const { user, loading, signUp, signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const { error: authError } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    if (authError) {
      setError(authError.message);
    } else if (!isLogin) {
      setSuccess('Account created! Check your email to confirm, then log in.');
    }
    setSubmitting(false);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">
                SALIENCY GUARD
              </h1>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Password Recovery</p>
          </div>

          {resetSent ? (
            <div className="bg-card rounded-md border border-border panel-glow p-4 space-y-3 text-center">
              <p className="text-xs font-mono text-primary">Recovery email sent!</p>
              <p className="text-[10px] font-mono text-muted-foreground">Check your inbox for a password reset link.</p>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail(''); }}
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                Reset Password
              </span>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  placeholder="your@email.com"
                />
              </div>
              {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full text-xs font-mono py-2 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {submitting ? '...' : '▶ SEND RESET LINK'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setError(''); }}
                className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
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

        <form onSubmit={handleSubmit} className="bg-card rounded-md border border-border panel-glow p-4 space-y-4">
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
            {isLogin ? 'Sign In' : 'Create Account'}
          </span>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-mono text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-[10px] font-mono text-success">{success}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-xs font-mono py-2 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50"
          >
            {submitting ? '...' : isLogin ? '▶ SIGN IN' : '▶ CREATE ACCOUNT'}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={() => { setShowForgot(true); setError(''); }}
              className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </button>
          )}

          <button
            type="button"
            onClick={() => { setIsLogin(p => !p); setError(''); setSuccess(''); }}
            className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
