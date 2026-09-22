import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { GbgManagerLogo } from '@/components/GbgManagerLogo';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, roleChecked, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!isLoading && user && roleChecked) {
      if (isAdmin) {
        logAdminAction({ action: "login" });
        navigate('/admin');
      } else {
        setError('Your account does not have admin access. Please contact a global admin.');
        supabase.auth.signOut();
      }
    }
  }, [user, isLoading, isAdmin, roleChecked, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!resetEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="manager-auth-shell min-h-screen flex items-center justify-center p-4 sm:p-8">
      <Card className="manager-auth-card w-full max-w-md overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="text-center px-6 pb-3 pt-8 sm:px-9">
          <GbgManagerLogo className="mx-auto mb-7 w-44" />
          <CardTitle className="text-3xl font-bold">Demo Manager</CardTitle>
          <CardDescription>
            {showForgotPassword ? 'Reset your password' : 'Sign in to manage demo environments'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 sm:px-9">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showForgotPassword ? (
            resetSent ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  If an account exists for <strong>{resetEmail}</strong>, a password reset link has been sent.
                </p>
                <Button variant="ghost" onClick={() => { setShowForgotPassword(false); setResetSent(false); setError(null); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isResetting}>
                  {isResetting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowForgotPassword(false); setError(null); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <div className="text-center">
                <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={() => { setShowForgotPassword(true); setResetEmail(email); setError(null); }}>
                  Forgot your password?
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
