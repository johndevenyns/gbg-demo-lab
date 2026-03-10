import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, roleChecked, signOut } = useAuth();
  const location = useLocation();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [hasAdmins, setHasAdmins] = useState<boolean | null>(null);
  const [checkingAdmins, setCheckingAdmins] = useState(false);

  // Check if any admins exist when user is logged in but not an admin
  useEffect(() => {
    if (user && !isAdmin && !isLoading && roleChecked) {
      checkForExistingAdmins();
    }
  }, [user, isAdmin, isLoading, roleChecked]);

  const checkForExistingAdmins = async () => {
    setCheckingAdmins(true);
    try {
      // Try to call the bootstrap function - it will fail if admins exist
      // This is a safe way to check without exposing admin data
      const { error } = await supabase.rpc('bootstrap_first_admin', {
        target_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (error?.message?.includes('Admin users already exist')) {
        setHasAdmins(true);
      } else if (error?.message?.includes('violates foreign key constraint')) {
        // This means no admins exist (the function tried to insert but UUID doesn't match a user)
        setHasAdmins(false);
      } else {
        // If there's some other error, assume admins exist for safety
        setHasAdmins(true);
      }
    } catch {
      setHasAdmins(true);
    } finally {
      setCheckingAdmins(false);
    }
  };

  const handleBootstrap = async () => {
    if (!user) return;
    
    setIsBootstrapping(true);
    setBootstrapError(null);
    
    try {
      const { error } = await supabase.rpc('bootstrap_first_admin', {
        target_user_id: user.id
      });
      
      if (error) {
        setBootstrapError(error.message);
      } else {
        // Reload the page to refresh auth state
        window.location.reload();
      }
    } catch (err: any) {
      setBootstrapError(err.message || 'Failed to set up admin access');
    } finally {
      setIsBootstrapping(false);
    }
  };

  if (isLoading || (user && !roleChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login page with return path
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // User is logged in but not an admin
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          
          {checkingAdmins ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking access...
            </div>
          ) : hasAdmins === false ? (
            // No admins exist - show bootstrap option
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No administrators have been set up yet. As the first user, you can set yourself up as the admin.
              </p>
              {bootstrapError && (
                <p className="text-destructive text-sm">{bootstrapError}</p>
              )}
              <Button 
                onClick={handleBootstrap} 
                disabled={isBootstrapping}
                className="gradient-primary"
              >
                {isBootstrapping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Set Up as Admin'
                )}
              </Button>
            </div>
          ) : (
            // Admins exist - user needs to be granted access
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your account doesn't have admin access. Please contact an administrator to request access.
              </p>
              <p className="text-sm text-muted-foreground">
                Logged in as: {user.email}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
