import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserPlus, Users, AlertCircle, Shield, KeyRound, Crown, Copy, Check, Mail } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'global_admin';
  created_at: string;
  email?: string;
}

interface UserManagementProps {
  isGlobalAdmin?: boolean;
}

export function UserManagement({ isGlobalAdmin = true }: UserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'global_admin'>('admin');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);
  const [setPasswordUserId, setSetPasswordUserId] = useState<string | null>(null);
  const [setPasswordEmail, setSetPasswordEmail] = useState('');
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [setPasswordError, setSetPasswordError] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [introLetterOpen, setIntroLetterOpen] = useState(false);
  const [introLetterText, setIntroLetterText] = useState('');
  const [introLetterCopied, setIntroLetterCopied] = useState(false);

  const publishedUrl = 'https://gbg-demo-lab.lovable.app';

  // Fetch the admin welcome letter template
  const { data: welcomeTemplate } = useQuery({
    queryKey: ['admin-welcome-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitation_templates')
        .select('body_html')
        .eq('category', 'admin')
        .eq('name', 'Admin Welcome Letter')
        .maybeSingle();
      if (error) throw error;
      return data?.body_html || null;
    },
  });

  const generateIntroLetter = (email: string, role: string, setupLink: string | null) => {
    const roleName = role === 'global_admin' ? 'Global Admin' : 'Admin';
    const loginUrl = `${publishedUrl}/auth`;
    const setupSection = setupLink
      ? `Set Your Password: ${setupLink}\n\nPlease use the link above to set your password. This link is unique to you and can only be used once.`
      : `Login URL: ${loginUrl}\n\nPlease use the "Forgot Password" link on the login page to set your password.`;

    if (welcomeTemplate) {
      return welcomeTemplate
        .replace(/\{\{email\}\}/g, email)
        .replace(/\{\{password\}\}/g, setupLink ? `(Use the link below to set your password)` : '(Use Forgot Password to set)')
        .replace(/\{\{role\}\}/g, roleName)
        .replace(/\{\{login_url\}\}/g, setupLink || loginUrl)
        .replace(/\{\{setup_link\}\}/g, setupLink || loginUrl);
    }

    return `Welcome to GBG Demo Lab!\n\nYour admin account has been created. Here are your login details:\n\nUsername: ${email}\nRole: ${roleName}\n\n${setupSection}\n\nIf you have any questions or need assistance, don't hesitate to reach out.\n\nBest regards,\nGBG Demo Lab Team`;
  };

  const openIntroLetterForExisting = async (userId: string, email: string, role: string) => {
    // Generate a fresh setup link for this user
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'resetPassword', userId },
      });
      const setupLink = data?.setupLink || null;
      setIntroLetterText(generateIntroLetter(email, role, setupLink));
      setIntroLetterCopied(false);
      setIntroLetterOpen(true);
    } catch {
      // Fallback without link
      setIntroLetterText(generateIntroLetter(email, role, null));
      setIntroLetterCopied(false);
      setIntroLetterOpen(true);
    }
  };

  const handleCopyIntroLetter = async () => {
    try {
      await navigator.clipboard.writeText(introLetterText);
      setIntroLetterCopied(true);
      setTimeout(() => setIntroLetterCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Intro letter copied to clipboard.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy to clipboard.', variant: 'destructive' });
    }
  };

  // Fetch admin users with emails via edge function
  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'list' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return (data?.users || []) as UserRole[];
    },
  });

  // Remove admin role
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'remove', userId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, deletedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      logAdminAction({ action: "delete", entityType: "admin_user", entityId: deletedUserId });
      toast({ title: 'Admin removed', description: 'User no longer has admin access.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'global_admin' }) => {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'updateRole', userId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      logAdminAction({ action: "role_change", entityType: "admin_user", entityId: variables.userId, details: { newRole: variables.role } });
      toast({ title: 'Role updated', description: 'User role has been changed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'resetPassword', userId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Password reset sent', 
        description: data?.message || 'Password reset email has been sent.' 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set password for a user (admin sets it directly)
  const handleSetPassword = async () => {
    setSetPasswordError(null);
    if (!setPasswordValue.trim() || setPasswordValue.length < 6) {
      setSetPasswordError('Password must be at least 6 characters.');
      return;
    }
    setIsSettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body: { action: 'resetPassword', userId: setPasswordUserId, newPassword: setPasswordValue },
      });
      if (error) {
        let message = error.message || 'Failed to set password';
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Password updated', description: `Password has been set for ${setPasswordEmail}.` });
      setSetPasswordDialogOpen(false);
      setSetPasswordValue('');
      setSetPasswordUserId(null);
      setSetPasswordEmail('');
    } catch (err: any) {
      setSetPasswordError(err.message || 'Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const openSetPasswordDialog = (userId: string, email: string) => {
    setSetPasswordUserId(userId);
    setSetPasswordEmail(email);
    setSetPasswordValue('');
    setSetPasswordError(null);
    setSetPasswordDialogOpen(true);
  };

  // Add new admin by email
  const handleAddAdmin = async () => {
    if (!newUserEmail.trim()) {
      setAddError('Please enter an email address');
      return;
    }

    setIsAddingUser(true);
    setAddError(null);

    try {
      const body: any = { action: 'add', email: newUserEmail.trim(), role: newUserRole };

      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      logAdminAction({ action: "create", entityType: "admin_user", entityLabel: newUserEmail.trim(), details: { role: newUserRole } });
      
      const msg = data?.created
        ? `Account created for ${newUserEmail} with admin access. A password setup link has been generated.`
        : `${newUserEmail} now has admin access.`;
      
      // Show intro letter with the setup link
      setIntroLetterText(generateIntroLetter(newUserEmail.trim(), newUserRole, data?.setupLink || null));
      setIntroLetterCopied(false);
      setIntroLetterOpen(true);

      toast({ title: 'Admin added', description: msg });
      setNewUserEmail('');
      setNewUserRole('admin');
      setAddDialogOpen(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add admin user');
    } finally {
      setIsAddingUser(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage admin access to the demo manager</CardDescription>
            </div>
          </div>
          {isGlobalAdmin && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Admin User</DialogTitle>
                  <DialogDescription>
                    Grant admin access to a registered user by their email address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {addError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{addError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">User Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If no account exists, one will be created. The user will receive a unique link to set their own password.
                  </p>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'admin' | 'global_admin')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="global_admin">Global Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Global Admins can manage users, verification types, field configs, and templates. Admins can manage demos and their own resource IDs.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddAdmin} disabled={isAddingUser}>
                    {isAddingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Admin'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {adminUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No admin users configured yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add the first admin user to get started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                {isGlobalAdmin && <TableHead className="w-[150px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {isGlobalAdmin ? (
                      <Select
                        value={user.role}
                        onValueChange={(v) => updateRoleMutation.mutate({ userId: user.user_id, role: v as 'admin' | 'global_admin' })}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <Badge variant="secondary" className="bg-primary/10 text-primary">Admin</Badge>
                          </SelectItem>
                          <SelectItem value="global_admin">
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                              <Crown className="w-3 h-3 mr-1" /> Global Admin
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className={user.role === 'global_admin' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}>
                        {user.role === 'global_admin' && <Crown className="w-3 h-3 mr-1" />}
                        {user.role === 'global_admin' ? 'Global Admin' : 'Admin'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  {isGlobalAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openIntroLetterForExisting(user.user_id, user.email || 'Unknown', user.role)}
                          title="Generate welcome letter"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => openSetPasswordDialog(user.user_id, user.email || 'Unknown')}
                          title="Set password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeAdminMutation.mutate(user.user_id)}
                          disabled={removeAdminMutation.isPending}
                          title="Remove admin access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

      {/* Set Password Dialog */}
      <Dialog open={setPasswordDialogOpen} onOpenChange={(v) => { setSetPasswordDialogOpen(v); if (!v) { setSetPasswordError(null); setSetPasswordValue(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>Set a new password for {setPasswordEmail}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {setPasswordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{setPasswordError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={setPasswordValue}
                onChange={(e) => setSetPasswordValue(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetPassword} disabled={isSettingPassword}>
              {isSettingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting...</> : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intro Letter Dialog */}
      <Dialog open={introLetterOpen} onOpenChange={setIntroLetterOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Welcome Letter</DialogTitle>
            <DialogDescription>
              Copy this intro letter to share login details with the new admin user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={introLetterText}
              onChange={(e) => setIntroLetterText(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntroLetterOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCopyIntroLetter}>
              {introLetterCopied ? (
                <><Check className="w-4 h-4 mr-2" />Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" />Copy to Clipboard</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
