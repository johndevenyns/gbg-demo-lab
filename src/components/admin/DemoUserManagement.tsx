import { useState } from 'react';
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
import { Loader2, Trash2, UserPlus, Users, AlertCircle, KeyRound, Copy, Check, Clock } from 'lucide-react';

interface DemoUser {
  id: string;
  demo_id: string;
  email: string;
  password: string;
  registration_code: string | null;
  registration_code_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DemoUserManagementProps {
  demoId: string;
  demoName: string;
}

export function DemoUserManagement({ demoId, demoName }: DemoUserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch demo users for this demo
  const { data: demoUsers = [], isLoading } = useQuery({
    queryKey: ['demo-users', demoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_users')
        .select('*')
        .eq('demo_id', demoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DemoUser[];
    },
  });

  // Add user
  const handleAddUser = async () => {
    setAddError(null);
    if (!newEmail.trim()) { setAddError('Email is required'); return; }
    if (!newPassword.trim() || newPassword.length < 6) { setAddError('Password must be at least 6 characters'); return; }
    setIsAdding(true);
    try {
      const { error } = await supabase.from('demo_users').insert({
        demo_id: demoId,
        email: newEmail.trim(),
        password: newPassword.trim(),
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'User added', description: `${newEmail} has been added.` });
      setNewEmail('');
      setNewPassword('');
      setAddDialogOpen(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add user');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('demo_users').delete().eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'User removed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.from('demo_users').update({ is_active: isActive }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Reset password
  const handleResetPassword = async () => {
    setResetError(null);
    if (!resetPassword.trim() || resetPassword.length < 6) { setResetError('Password must be at least 6 characters'); return; }
    try {
      const { error } = await supabase.from('demo_users').update({ password: resetPassword.trim() }).eq('id', resetUserId!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'Password updated', description: `Password set for ${resetEmail}.` });
      setResetDialogOpen(false);
      setResetPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    }
  };

  // Generate registration code (6-digit, expires in 24h)
  const generateCodeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('demo_users').update({
        registration_code: code,
        registration_code_expires_at: expiresAt,
      }).eq('id', userId);
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'Registration code generated', description: `Code: ${code}` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: 'Copied!', description: 'Registration code copied to clipboard.' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isCodeExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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
                <CardTitle>Demo Users</CardTitle>
                <CardDescription>Manage user accounts for {demoName}</CardDescription>
              </div>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Demo User</DialogTitle>
                  <DialogDescription>Create a user account for this demo environment.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {addError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{addError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddUser} disabled={isAdding}>
                    {isAdding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {demoUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No users created yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Add a user to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleActiveMutation.mutate({ userId: user.id, isActive: !user.is_active })}
                        className="cursor-pointer"
                      >
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      {user.registration_code ? (
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{user.registration_code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyCode(user.registration_code!)}
                          >
                            {copiedCode === user.registration_code ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          {isCodeExpired(user.registration_code_expires_at) && (
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />Expired
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => generateCodeMutation.mutate(user.id)}
                          disabled={generateCodeMutation.isPending}
                        >
                          Gen Code
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setResetUserId(user.id);
                            setResetEmail(user.email);
                            setResetPassword('');
                            setResetError(null);
                            setResetDialogOpen(true);
                          }}
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(user.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete user"
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

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={(v) => { setResetDialogOpen(v); if (!v) setResetError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {resetEmail}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resetError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword}>Set Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
