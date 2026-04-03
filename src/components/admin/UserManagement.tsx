import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const [newUserPassword, setNewUserPassword] = useState('');
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

  const [introLetterForExistingOpen, setIntroLetterForExistingOpen] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [existingUserRole, setExistingUserRole] = useState('');
  const [existingUserPassword, setExistingUserPassword] = useState('');
  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  const generateIntroLetter = (email: string, password: string | null, role: string) => {
    const passwordLine = password
      ? `Password: ${password}`
      : `Password: (Please set a password for this user or ask them to use "Forgot Password")`;
    return `Welcome to GBG Demo Lab!

Your admin account has been created. Here are your login details:

Username: ${email}
${passwordLine}
Role: ${role === 'global_admin' ? 'Global Admin' : 'Admin'}

Login URL: ${publishedUrl}/auth

Please log in and change your password at your earliest convenience.

If you have any questions or need assistance, don't hesitate to reach out.

Best regards,
GBG Demo Lab Team`;
  };

  const openIntroLetterForExisting = (userId: string, email: string, role: string) => {
    setExistingUserId(userId);
    setExistingUserEmail(email);
    setExistingUserRole(role);
    setExistingUserPassword('');
    setIntroLetterForExistingOpen(true);
  };

  const confirmExistingIntroLetter = async () => {
    const pw = existingUserPassword.trim() || null;
    
    // If a password was provided, actually set it on the account
    if (pw && existingUserId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await supabase.functions.invoke('manage-admin-users', {
          body: { action: 'resetPassword', userId: existingUserId, newPassword: pw },
          headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
        });
        if (response.error || response.data?.error) {
          toast({ title: 'Error', description: response.data?.error || 'Failed to set password', variant: 'destructive' });
          return;
        }
        toast({ title: 'Password updated', description: 'The password has been set on the account.' });
      } catch {
        toast({ title: 'Error', description: 'Failed to set password on account.', variant: 'destructive' });
        return;
      }
    }
    
    setIntroLetterText(generateIntroLetter(existingUserEmail, pw, existingUserRole));
    setIntroLetterCopied(false);
    setIntroLetterForExistingOpen(false);
    setIntroLetterOpen(true);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
      if (error) throw error;
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

  // Add new admin by email, optionally with initial password
  const handleAddAdmin = async () => {
    if (!newUserEmail.trim()) {
      setAddError('Please enter an email address');
      return;
    }

    setIsAddingUser(true);
    setAddError(null);

    try {
      const body: any = { action: 'add', email: newUserEmail.trim(), role: newUserRole };
      if (newUserPassword.trim()) {
        body.password = newUserPassword.trim();
      }

      const { data, error } = await supabase.functions.invoke('manage-admin-users', {
        body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      let msg: string;
      if (data?.created && data?.hadPassword) {
        msg = `Account created for ${newUserEmail} with admin access and the specified password.`;
        // Show intro letter dialog
        setIntroLetterText(generateIntroLetter(newUserEmail.trim(), newUserPassword.trim(), newUserRole));
        setIntroLetterCopied(false);
        setIntroLetterOpen(true);
      } else if (data?.created) {
        msg = `Account created for ${newUserEmail} with admin access. A password reset email has been sent.`;
      } else {
        msg = `${newUserEmail} now has admin access.`;
      }
      toast({ title: 'Admin added', description: msg });
      setNewUserEmail('');
      setNewUserPassword('');
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
                <div className="space-y-2">
                  <Label htmlFor="initial-password">Initial Password (optional)</Label>
                  <Input
                    id="initial-password"
                    type="password"
                    placeholder="Leave blank to send reset email"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If no account exists, one will be created. Leave password blank to send a reset email instead.
                  </p>
                </div>
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
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
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

      {/* Password Prompt for Existing User Welcome Letter */}
      <Dialog open={introLetterForExistingOpen} onOpenChange={setIntroLetterForExistingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Welcome Letter</DialogTitle>
            <DialogDescription>
              Enter a password to include in the welcome letter for {existingUserEmail}. Leave blank to omit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password (optional)</Label>
              <Input
                type="text"
                value={existingUserPassword}
                onChange={(e) => setExistingUserPassword(e.target.value)}
                placeholder="Enter password to include, or leave blank"
              />
              <p className="text-xs text-muted-foreground">
                This does NOT change the user's password. It only includes it in the letter for your reference.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntroLetterForExistingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmExistingIntroLetter}>
              Generate Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
