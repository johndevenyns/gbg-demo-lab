import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Mail, AlertCircle, Pencil, Star } from 'lucide-react';

interface InvitationTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  category: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function InvitationTemplateManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvitationTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState("You're Invited to {{demo_name}}");
  const [bodyHtml, setBodyHtml] = useState('');
  const [category, setCategory] = useState('general');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
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

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<InvitationTemplate> & { id?: string }) => {
      if (template.id) {
        const { error } = await supabase.from('invitation_templates').update({
          name: template.name,
          description: template.description,
          subject: template.subject,
          body_html: template.body_html,
          category: template.category,
          is_default: template.is_default,
        }).eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invitation_templates').insert({
          name: template.name!,
          description: template.description,
          subject: template.subject!,
          body_html: template.body_html!,
          category: template.category,
          is_default: template.is_default,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-templates'] });
      toast({ title: editingTemplate ? 'Template updated' : 'Template created' });
      closeDialog();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invitation_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation-templates'] });
      toast({ title: 'Template deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setSubject("You're Invited to {{demo_name}}");
    setBodyHtml(DEFAULT_BODY);
    setCategory('general');
    setIsDefault(false);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (t: InvitationTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setDescription(t.description || '');
    setSubject(t.subject);
    setBodyHtml(t.body_html);
    setCategory(t.category || 'general');
    setIsDefault(t.is_default);
    setError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setError(null);
  };

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!bodyHtml.trim()) { setError('Body HTML is required'); return; }
    saveMutation.mutate({
      id: editingTemplate?.id,
      name: name.trim(),
      description: description.trim() || null,
      subject: subject.trim(),
      body_html: bodyHtml.trim(),
      category: category.trim() || 'general',
      is_default: isDefault,
    });
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
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Invitation Templates</CardTitle>
                <CardDescription>
                  Email templates for inviting users to demos. Use {'{{demo_name}}'}, {'{{registration_code}}'}, {'{{demo_link}}'}, {'{{recipient_email}}'} as placeholders.
                </CardDescription>
              </div>
            </div>
            <Button className="gradient-primary" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No invitation templates yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div>
                        {t.name}
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.category || 'general'}</Badge>
                    </TableCell>
                    <TableCell>
                      {t.is_default && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(t.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete"
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

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Available placeholders: {'{{demo_name}}'}, {'{{registration_code}}'}, {'{{demo_link}}'}, {'{{recipient_email}}'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Banking Onboarding Invite" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="general" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of when to use this template" />
            </div>
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="You're Invited to {{demo_name}}" />
            </div>
            <div className="space-y-2">
              <Label>Email Body (HTML)</Label>
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<h1>You're Invited!</h1>..."
                className="min-h-[250px] font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h1 style="color: #1a1a2e;">You're Invited!</h1>
<p>You have been invited to try <strong>{{demo_name}}</strong>.</p>
<p>Use the following registration code to get started:</p>
<div style="background: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
<span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">{{registration_code}}</span>
</div>
<p><a href="{{demo_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Get Started</a></p>
<p style="color: #71717a; font-size: 12px; margin-top: 30px;">This code expires in 24 hours.</p>
</div>`;
