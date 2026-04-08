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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserPlus, Users, AlertCircle, Edit, Building2, Globe, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';

interface CreditCardInfo {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cardType: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  activatedAt?: string;
}

interface PortalUser {
  id: string;
  email: string;
  password: string;
  display_name: string | null;
  profile_data: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DemoAssignment {
  id: string;
  portal_user_id: string;
  demo_id: string;
  created_at: string;
}

interface PortalUserManagementProps {
  demoId?: string; // If provided, scopes to a single demo
}

export function PortalUserManagement({ demoId }: PortalUserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isGlobalView = !demoId;

  // Fetch portal users
  const { data: portalUsers = [], isLoading } = useQuery({
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

  // Fetch assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['portal-user-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_user_demo_assignments')
        .select('*');
      if (error) throw error;
      return (data || []) as DemoAssignment[];
    },
  });

  // Fetch demos for assignment UI
  const { data: demos = [] } = useQuery({
    queryKey: ['demos-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_environments')
        .select('id, customer_name, slug')
        .order('customer_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Filter users for demo-scoped view
  const displayUsers = demoId
    ? portalUsers.filter(u => {
        if (u.is_default) return true;
        return assignments.some(a => a.portal_user_id === u.id && a.demo_id === demoId);
      })
    : portalUsers;

  // Create / update portal user
  const saveMutation = useMutation({
    mutationFn: async (user: { id?: string; email: string; password: string; display_name: string; is_default: boolean }) => {
      if (user.id) {
        const { error } = await supabase.from('portal_users').update({
          email: user.email,
          password: user.password,
          display_name: user.display_name || null,
          is_default: user.is_default,
        }).eq('id', user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('portal_users').insert({
          email: user.email,
          password: user.password,
          display_name: user.display_name || null,
          is_default: user.is_default,
        }).select().single();
        if (error) throw error;

        // If default, assign to all existing demos
        if (user.is_default && demos.length > 0) {
          const rows = demos.map(d => ({ portal_user_id: data.id, demo_id: d.id }));
          await supabase.from('portal_user_demo_assignments').upsert(rows, { onConflict: 'portal_user_id,demo_id' });
        }

        // If demo-scoped, auto-assign to this demo
        if (demoId) {
          await supabase.from('portal_user_demo_assignments').upsert(
            { portal_user_id: data.id, demo_id: demoId },
            { onConflict: 'portal_user_id,demo_id' }
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
      queryClient.invalidateQueries({ queryKey: ['portal-user-assignments'] });
      toast({ title: editingUser ? 'User updated' : 'User created' });
      closeDialog();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portal_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
      queryClient.invalidateQueries({ queryKey: ['portal-user-assignments'] });
      toast({ title: 'Portal user deleted' });
    },
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('portal_users').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-users'] }),
  });

  // Assign/unassign demo
  const toggleAssignment = useMutation({
    mutationFn: async ({ portalUserId, demoIdToToggle, assigned }: { portalUserId: string; demoIdToToggle: string; assigned: boolean }) => {
      if (assigned) {
        const { error } = await supabase.from('portal_user_demo_assignments').delete()
          .eq('portal_user_id', portalUserId).eq('demo_id', demoIdToToggle);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('portal_user_demo_assignments').insert({
          portal_user_id: portalUserId, demo_id: demoIdToToggle,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-user-assignments'] }),
  });

  const closeDialog = () => {
    setAddDialogOpen(false);
    setEditingUser(null);
    setFormEmail('');
    setFormPassword('');
    setFormDisplayName('');
    setFormIsDefault(false);
    setFormError(null);
  };

  const openEdit = (user: PortalUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormPassword(user.password);
    setFormDisplayName(user.display_name || '');
    setFormIsDefault(user.is_default);
    setFormError(null);
    setAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!formEmail.trim() || !formPassword.trim()) {
      setFormError('Email and password are required');
      return;
    }
    saveMutation.mutate({
      id: editingUser?.id,
      email: formEmail.trim(),
      password: formPassword.trim(),
      display_name: formDisplayName.trim(),
      is_default: formIsDefault,
    });
  };

  const getUserAssignedDemoIds = (userId: string) =>
    assignments.filter(a => a.portal_user_id === userId).map(a => a.demo_id);

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
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Portal Users</CardTitle>
                <CardDescription>
                  {isGlobalView
                    ? 'Manage global portal users and their demo assignments'
                    : 'Portal users with access to this demo environment'}
                </CardDescription>
              </div>
            </div>
            <Button className="gradient-primary" onClick={() => { closeDialog(); setAddDialogOpen(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Portal User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {displayUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No portal users yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Demos</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers.map(user => {
                  const assignedDemos = getUserAssignedDemoIds(user.id);
                  const userCards: CreditCardInfo[] = Array.isArray((user.profile_data as any)?.creditCards)
                    ? (user.profile_data as any).creditCards
                    : [];
                  const isExpanded = expandedUserId === user.id;
                  return (
                    <>
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.email}
                            {userCards.length > 0 && (
                              <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => setExpandedUserId(isExpanded ? null : user.id)}>
                                <CreditCard className="w-3 h-3" />
                                {userCards.length} card{userCards.length !== 1 ? 's' : ''}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.display_name || '—'}</TableCell>
                        <TableCell>
                          {user.is_default ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">All Demos</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isGlobalView ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedUserId(user.id); setAssignDialogOpen(true); }}
                            >
                              <Building2 className="w-3 h-3 mr-1" />
                              {assignedDemos.length} assigned
                            </Button>
                          ) : (
                            <Badge variant="outline">{user.is_default ? 'Default' : 'Assigned'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={(v) => toggleActiveMutation.mutate({ id: user.id, is_active: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteMutation.mutate(user.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && userCards.length > 0 && (
                        <TableRow key={`${user.id}-cards`}>
                          <TableCell colSpan={6} className="bg-muted/30 px-6 py-3">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit Cards</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {userCards.map((card, i) => (
                                  <div key={i} className="rounded-lg border bg-card p-3 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold uppercase text-muted-foreground">{card.cardType}</span>
                                      <Badge variant={card.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                        {card.isActive ? 'Active' : 'Pending'}
                                      </Badge>
                                    </div>
                                    <p className="font-mono text-sm tracking-wider">{card.cardNumber}</p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{card.cardholderName}</span>
                                      <span>Exp {card.expiryDate}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Limit: <strong className="text-foreground">${card.creditLimit.toLocaleString()}</strong></span>
                                      <span className="text-muted-foreground">Balance: <strong className="text-foreground">${card.currentBalance.toLocaleString()}</strong></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setAddDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Portal User' : 'Add Portal User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update this portal user\'s details.' : 'Create a new portal user with shared credentials.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Password" />
            </div>
            <div className="space-y-2">
              <Label>Display Name (optional)</Label>
              <Input value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="is-default"
                checked={formIsDefault}
                onCheckedChange={(v) => setFormIsDefault(!!v)}
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                Add to all demo environments by default
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demo Assignment Dialog (Global view only) */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Assign Demo Environments</DialogTitle>
            <DialogDescription>
              Select which demo environments this user has access to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {demos.map(demo => {
              const isAssigned = selectedUserId
                ? assignments.some(a => a.portal_user_id === selectedUserId && a.demo_id === demo.id)
                : false;
              return (
                <div key={demo.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => {
                      if (selectedUserId) {
                        toggleAssignment.mutate({
                          portalUserId: selectedUserId,
                          demoIdToToggle: demo.id,
                          assigned: isAssigned,
                        });
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{demo.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{demo.slug}</p>
                  </div>
                </div>
              );
            })}
            {demos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No demo environments found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}