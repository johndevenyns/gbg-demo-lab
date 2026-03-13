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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserPlus, Users, AlertCircle, KeyRound, Copy, Check, Clock, ChevronDown, UserCog, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface DemoUser {
  id: string;
  demo_id: string;
  email: string;
  password: string;
  registration_code: string | null;
  registration_code_expires_at: string | null;
  is_active: boolean;
  is_super: boolean;
  profile_data: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

const PROFILE_FIELDS = [
  { key: 'firstName', label: 'First Name', placeholder: 'John' },
  { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
  { key: 'phone', label: 'Phone', placeholder: '(555) 123-4567' },
  { key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'MM/DD/YYYY' },
  { key: 'ssn4', label: 'SSN (Last 4)', placeholder: '1234' },
  { key: 'streetAddress', label: 'Street Address', placeholder: '123 Main St' },
  { key: 'city', label: 'City', placeholder: 'Springfield' },
  { key: 'state', label: 'State', placeholder: 'IL' },
  { key: 'zipCode', label: 'ZIP Code', placeholder: '62704' },
];

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
  const [newProfileData, setNewProfileData] = useState<Record<string, string>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editProfileUserId, setEditProfileUserId] = useState<string | null>(null);
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfileData, setEditProfileData] = useState<Record<string, string>>({});

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
      // Clean profile data - remove empty values
      const cleanProfile: Record<string, string> = {};
      for (const [key, value] of Object.entries(newProfileData)) {
        if (value && value.trim()) cleanProfile[key] = value.trim();
      }

      const { error } = await supabase.from('demo_users').insert({
        demo_id: demoId,
        email: newEmail.trim(),
        password: newPassword.trim(),
        profile_data: Object.keys(cleanProfile).length > 0 ? cleanProfile : {},
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'User added', description: `${newEmail} has been added.` });
      setNewEmail('');
      setNewPassword('');
      setNewProfileData({});
      setProfileOpen(false);
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

  // Toggle super user
  const toggleSuperMutation = useMutation({
    mutationFn: async ({ userId, isSuper }: { userId: string; isSuper: boolean }) => {
      const { error } = await supabase.from('demo_users').update({ is_super: isSuper } as any).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'Updated', description: 'Super user status changed.' });
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

  // Save profile data
  const handleSaveProfile = async () => {
    if (!editProfileUserId) return;
    try {
      const cleanProfile: Record<string, string> = {};
      for (const [key, value] of Object.entries(editProfileData)) {
        if (value && value.trim()) cleanProfile[key] = value.trim();
      }
      const { error } = await supabase.from('demo_users').update({
        profile_data: cleanProfile,
      }).eq('id', editProfileUserId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['demo-users', demoId] });
      toast({ title: 'Profile updated', description: `Profile data saved for ${editProfileEmail}.` });
      setEditProfileDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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

  const getProfileSummary = (profileData: Record<string, string> | null) => {
    if (!profileData || Object.keys(profileData).length === 0) return null;
    const parts: string[] = [];
    if (profileData.firstName || profileData.lastName) {
      parts.push([profileData.firstName, profileData.lastName].filter(Boolean).join(' '));
    }
    return parts.length > 0 ? parts.join(', ') : `${Object.keys(profileData).length} fields`;
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
              <DialogContent className="max-h-[85vh] overflow-y-auto">
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
                  
                  <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <UserCog className="w-4 h-4" />
                          Profile Data (for code verification)
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        These fields will be pre-filled when the user enters their registration code.
                      </p>
                      {PROFILE_FIELDS.map(field => (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-xs">{field.label}</Label>
                          <Input
                            placeholder={field.placeholder}
                            value={newProfileData[field.key] || ''}
                            onChange={(e) => setNewProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
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
                  <TableHead>Profile</TableHead>
                  <TableHead>Super</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoUsers.map((user) => {
                  const profileSummary = getProfileSummary(user.profile_data);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        {profileSummary ? (
                          <Badge variant="outline" className="text-xs">{profileSummary}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_super}
                            onCheckedChange={(checked) => toggleSuperMutation.mutate({ userId: user.id, isSuper: checked })}
                          />
                          {user.is_super && <ShieldCheck className="w-4 h-4 text-primary" />}
                        </div>
                      </TableCell>
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
                              setEditProfileUserId(user.id);
                              setEditProfileEmail(user.email);
                              setEditProfileData(user.profile_data || {});
                              setEditProfileDialogOpen(true);
                            }}
                            title="Edit profile data"
                          >
                            <UserCog className="w-4 h-4" />
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
                  );
                })}
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

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile Data</DialogTitle>
            <DialogDescription>
              Set profile data for {editProfileEmail}. These fields are pre-filled when the user enters their registration code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {PROFILE_FIELDS.map(field => (
              <div key={field.key} className="space-y-1">
                <Label className="text-sm">{field.label}</Label>
                <Input
                  placeholder={field.placeholder}
                  value={editProfileData[field.key] || ''}
                  onChange={(e) => setEditProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile}>Save Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
