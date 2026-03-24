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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserPlus, Users, AlertCircle, KeyRound, Copy, Check, Clock, ChevronDown, UserCog, ShieldCheck, Send, CheckCircle2, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface PortalUser {
  id: string;
  email: string;
  password: string;
  display_name: string | null;
  profile_data: Record<string, string> | null;
  is_default: boolean;
  is_active: boolean;
  is_super: boolean;
  registration_code: string | null;
  registration_code_expires_at: string | null;
  verification_status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Generate a realistic-looking fake credit card number (Luhn-valid Visa)
function generateCreditCardNumber(): string {
  const prefix = '4'; // Visa
  const digits = [parseInt(prefix)];
  for (let i = 1; i < 15; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  // Calculate Luhn check digit
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = digits[14 - i];
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  digits.push((10 - (sum % 10)) % 10);
  const raw = digits.join('');
  return `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 16)}`;
}

const PROFILE_FIELDS = [
  { key: 'firstName', label: 'First Name', placeholder: 'John' },
  { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
  { key: 'phone', label: 'Phone', placeholder: '(555) 123-4567' },
  { key: 'dateOfBirth', label: 'Date of Birth', placeholder: 'MM/DD/YYYY' },
  { key: 'ssn4', label: 'SSN (Last 4)', placeholder: '1234' },
  { key: 'creditCardNumber', label: 'Credit Card Number', placeholder: '4XXX XXXX XXXX XXXX', generate: true },
  { key: 'streetAddress', label: 'Street Address', placeholder: '123 Main St' },
  { key: 'city', label: 'City', placeholder: 'Springfield' },
  { key: 'state', label: 'State', placeholder: 'IL' },
  { key: 'zipCode', label: 'ZIP Code', placeholder: '62704' },
];

interface InvitationTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  is_default: boolean;
}

interface DemoUserManagementProps {
  demoId: string;
  demoName: string;
  demoSlug?: string;
}

export function DemoUserManagement({ demoId, demoName, demoSlug }: DemoUserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
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

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteTemplateId, setInviteTemplateId] = useState<string>('default');
  const [inviteProfileData, setInviteProfileData] = useState<Record<string, string>>({});
  const [inviteProfileOpen, setInviteProfileOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ registrationCode: string; demoLink: string; emailBody: string; emailSubject: string } | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Fetch invitation templates
  const { data: invitationTemplates = [] } = useQuery({
    queryKey: ['invitation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitation_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as InvitationTemplate[];
    },
  });

  // Fetch all portal users
  const { data: allPortalUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['portal-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PortalUser[];
    },
  });

  // Fetch assignments for this demo
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['portal-user-assignments', demoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_user_demo_assignments')
        .select('*')
        .eq('demo_id', demoId);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingUsers || loadingAssignments;

  // Users visible in this demo: assigned + default users
  const assignedUserIds = new Set(assignments.map((a: any) => a.portal_user_id));
  const demoUsers = allPortalUsers.filter(u => u.is_default || assignedUserIds.has(u.id));

  // Add user (create portal_user + assign to this demo)
  const handleAddUser = async () => {
    setAddError(null);
    if (!newEmail.trim()) { setAddError('Email is required'); return; }
    if (!newPassword.trim() || newPassword.length < 6) { setAddError('Password must be at least 6 characters'); return; }
    setIsAdding(true);
    try {
      const cleanProfile: Record<string, string> = {};
      for (const [key, value] of Object.entries(newProfileData)) {
        if (value && value.trim()) cleanProfile[key] = value.trim();
      }

      // Upsert into portal_users
      const { data: upserted, error } = await supabase.from('portal_users').upsert({
        email: newEmail.trim(),
        password: newPassword.trim(),
        display_name: newDisplayName.trim() || null,
        is_default: newIsDefault,
        profile_data: Object.keys(cleanProfile).length > 0 ? cleanProfile : {},
      }, { onConflict: 'email' }).select().single();
      if (error) throw error;

      // Assign to this demo
      if (upserted) {
        await supabase.from('portal_user_demo_assignments').upsert(
          { portal_user_id: upserted.id, demo_id: demoId },
          { onConflict: 'portal_user_id,demo_id' }
        );
      }

      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
      queryClient.invalidateQueries({ queryKey: ['portal-user-assignments', demoId] });
      toast({ title: 'User saved', description: `${newEmail} has been added/updated.` });
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewIsDefault(false);
      setNewProfileData({});
      setProfileOpen(false);
      setAddDialogOpen(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add user');
    } finally {
      setIsAdding(false);
    }
  };

  // Remove user from this demo (unassign, don't delete the user)
  const unassignMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('portal_user_demo_assignments')
        .delete()
        .eq('portal_user_id', userId)
        .eq('demo_id', demoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-user-assignments', demoId] });
      toast({ title: 'User removed from demo' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.from('portal_users').update({ is_active: isActive }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-users'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Reset password
  const handleResetPassword = async () => {
    setResetError(null);
    if (!resetPassword.trim() || resetPassword.length < 6) { setResetError('Password must be at least 6 characters'); return; }
    try {
      const { error } = await supabase.from('portal_users').update({ password: resetPassword.trim() }).eq('id', resetUserId!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
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
      const { error } = await supabase.from('portal_users').update({
        profile_data: cleanProfile,
      }).eq('id', editProfileUserId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
      toast({ title: 'Profile updated', description: `Profile data saved for ${editProfileEmail}.` });
      setEditProfileDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Generate registration code
  const generateCodeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('portal_users').update({
        registration_code: code,
        registration_code_expires_at: expiresAt,
      }).eq('id', userId);
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
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

  // Send invite
  const handleSendInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) { setInviteError('Email is required'); return; }
    setIsInviting(true);
    setInviteResult(null);
    try {
      const cleanProfile: Record<string, string> = {};
      for (const [key, value] of Object.entries(inviteProfileData)) {
        if (value && value.trim()) cleanProfile[key] = value.trim();
      }

      const { data, error } = await supabase.functions.invoke('send-demo-invite', {
        body: {
          demoId,
          email: inviteEmail.trim(),
          password: invitePassword.trim() || undefined,
          profileData: Object.keys(cleanProfile).length > 0 ? cleanProfile : undefined,
          templateId: inviteTemplateId !== 'default' ? inviteTemplateId : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
      queryClient.invalidateQueries({ queryKey: ['portal-user-assignments', demoId] });
      setInviteResult({
        registrationCode: data.registrationCode,
        demoLink: data.demoLink,
        emailBody: data.emailBody,
        emailSubject: data.emailSubject,
      });

      if (data.emailSent) {
        toast({ title: 'Invite sent!', description: `Invitation email sent to ${inviteEmail}.` });
      } else {
        toast({ title: 'User created with code', description: data.emailError || 'Share the code and link manually.' });
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
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
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => {
                setInviteEmail('');
                setInvitePassword('');
                setInviteTemplateId('default');
                setInviteProfileData({});
                setInviteProfileOpen(false);
                setInviteError(null);
                setInviteResult(null);
                setInviteDialogOpen(true);
              }}>
                <Send className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add User</DialogTitle>
                  <DialogDescription>Create or update a user and assign them to this demo.</DialogDescription>
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
                  <div className="space-y-2">
                    <Label>Display Name (optional)</Label>
                    <Input placeholder="John Doe" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="add-is-default"
                      checked={newIsDefault}
                      onCheckedChange={(v) => setNewIsDefault(!!v)}
                    />
                    <Label htmlFor="add-is-default" className="cursor-pointer text-sm">
                      Add to all demo environments by default
                    </Label>
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
                          <div className="flex gap-2">
                            <Input
                              placeholder={field.placeholder}
                              value={newProfileData[field.key] || ''}
                              onChange={(e) => setNewProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            />
                            {field.generate && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 text-xs"
                                onClick={() => setNewProfileData(prev => ({ ...prev, [field.key]: generateCreditCardNumber() }))}
                              >
                                Generate
                              </Button>
                            )}
                          </div>
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
          </div>
        </CardHeader>
        <CardContent>
          {demoUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No users assigned to this demo yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Add a user or invite someone to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Reg Code</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoUsers.map((user) => {
                  const expired = isCodeExpired(user.registration_code_expires_at);
                  const profileSummary = getProfileSummary(user.profile_data);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.display_name || '—'}</TableCell>
                      <TableCell>
                        {profileSummary ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => {
                              setEditProfileUserId(user.id);
                              setEditProfileEmail(user.email);
                              setEditProfileData((user.profile_data as Record<string, string>) || {});
                              setEditProfileDialogOpen(true);
                            }}
                          >
                            <UserCog className="w-3 h-3 mr-1" />
                            {profileSummary}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => {
                              setEditProfileUserId(user.id);
                              setEditProfileEmail(user.email);
                              setEditProfileData({});
                              setEditProfileDialogOpen(true);
                            }}
                          >
                            <UserCog className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.registration_code ? (
                          <div className="flex items-center gap-1">
                            <code className={`text-xs px-1.5 py-0.5 rounded ${expired ? 'bg-destructive/10 text-destructive line-through' : 'bg-muted'}`}>
                              {user.registration_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(user.registration_code!)}
                            >
                              {copiedCode === user.registration_code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </Button>
                            {expired && (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
                                <Clock className="w-2.5 h-2.5 mr-0.5" /> Expired
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.verification_status === 'verified' ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Verified
                          </Badge>
                        ) : user.verification_status === 'failed' ? (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">
                            <XCircle className="w-2.5 h-2.5 mr-0.5" /> Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_default ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px]">All Demos</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">This Demo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={(v) => toggleActiveMutation.mutate({ userId: user.id, isActive: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setResetUserId(user.id);
                              setResetEmail(user.email);
                              setResetPassword('');
                              setResetError(null);
                              setResetDialogOpen(true);
                            }}
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => generateCodeMutation.mutate(user.id)}
                            disabled={generateCodeMutation.isPending}
                            title="Generate registration code"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>
                          {!user.is_default && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => unassignMutation.mutate(user.id)}
                              disabled={unassignMutation.isPending}
                              title="Remove from this demo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
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
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
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
            <DialogDescription>Profile data for {editProfileEmail}. Used for form pre-filling.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {PROFILE_FIELDS.map(field => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs">{field.label}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={field.placeholder}
                    value={editProfileData[field.key] || ''}
                    onChange={(e) => setEditProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                  {field.generate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => setEditProfileData(prev => ({ ...prev, [field.key]: generateCreditCardNumber() }))}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile}>Save Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={(v) => { setInviteDialogOpen(v); if (!v) setInviteResult(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Send an invitation with a registration code and demo link.</DialogDescription>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  <p className="font-medium mb-2">User created successfully!</p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Registration Code:</strong>{' '}
                      <code className="bg-muted px-2 py-0.5 rounded">{inviteResult.registrationCode}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyCode(inviteResult.registrationCode)}>
                        {copiedCode === inviteResult.registrationCode ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </p>
                    <p><strong>Demo Link:</strong>{' '}
                      <a href={inviteResult.demoLink} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{inviteResult.demoLink}</a>
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input readOnly value={inviteResult.emailSubject} />
              </div>
              <div className="space-y-2">
                <Label>Email Body (HTML)</Label>
                <div className="border rounded-md p-3 text-sm bg-muted/50 max-h-40 overflow-auto" dangerouslySetInnerHTML={{ __html: inviteResult.emailBody }} />
              </div>
              <DialogFooter>
                <Button onClick={() => { setInviteDialogOpen(false); setInviteResult(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {inviteError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{inviteError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password (optional)</Label>
                  <Input type="password" placeholder="Leave blank for default" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Default: changeme123</p>
                </div>
                <div className="space-y-2">
                  <Label>Invitation Template</Label>
                  <Select value={inviteTemplateId} onValueChange={setInviteTemplateId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Template</SelectItem>
                      {invitationTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Collapsible open={inviteProfileOpen} onOpenChange={setInviteProfileOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        Profile Data
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${inviteProfileOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {PROFILE_FIELDS.map(field => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          placeholder={field.placeholder}
                          value={inviteProfileData[field.key] || ''}
                          onChange={(e) => setInviteProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSendInvite} disabled={isInviting}>
                  {isInviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Invite</>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
