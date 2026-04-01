import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, Pencil, UserPlus, FastForward, Package, LogIn, FileText,
} from 'lucide-react';
import { GlobalUseCase, UseCasePageContent, PORTAL_TYPE_OPTIONS, PortalType } from '@/types/useCase';
import {
  useGlobalUseCases, useCreateGlobalUseCase, useUpdateGlobalUseCase, useDeleteGlobalUseCase,
} from '@/hooks/useUseCases';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, FastForward, Package, Briefcase, LogIn,
};

interface FormTemplateOption {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  form_steps: unknown[];
  show_fill_pass: boolean;
  show_fill_fail: boolean;
}

export function GlobalUseCaseManagement() {
  const { data: useCases = [], isLoading } = useGlobalUseCases();
  const createMutation = useCreateGlobalUseCase();
  const updateMutation = useUpdateGlobalUseCase();
  const deleteMutation = useDeleteGlobalUseCase();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newUseCase, setNewUseCase] = useState({
    title: '',
    description: '',
    iconName: 'Package',
  });
  const [templates, setTemplates] = useState<FormTemplateOption[]>([]);

  // Load form templates
  useEffect(() => {
    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('id, name, description, category, form_steps, show_fill_pass, show_fill_fail')
        .order('name');
      if (!error && data) {
        setTemplates(data as FormTemplateOption[]);
      }
    };
    loadTemplates();
  }, []);

  const handleCreate = () => {
    createMutation.mutate({
      title: newUseCase.title,
      description: newUseCase.description || undefined,
      iconName: newUseCase.iconName,
      defaultFormSteps: [],
      defaultVerificationType: 'docBio',
      showFillPass: false,
      showFillFail: false,
      defaultPageContent: {
        heroTitle: newUseCase.title,
        heroSubtitle: newUseCase.description || '',
        ctaLabel: 'Verify My Identity',
        ctaDescription: 'Complete identity verification to continue.',
      },
      displayOrder: useCases.length,
      isEnabled: true,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewUseCase({ title: '', description: '', iconName: 'Package' });
      },
    });
  };

  const handleUpdate = (id: string, updates: Partial<GlobalUseCase>) => {
    updateMutation.mutate({ id, updates });
  };

  const handleUpdatePageContent = (id: string, currentContent: UseCasePageContent, contentUpdates: Partial<UseCasePageContent>) => {
    updateMutation.mutate({ id, updates: { defaultPageContent: { ...currentContent, ...contentUpdates } } });
  };

  const handleApplyTemplate = (useCaseId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    handleUpdate(useCaseId, {
      defaultFormSteps: template.form_steps as Record<string, unknown>[],
      showFillPass: template.show_fill_pass,
      showFillFail: template.show_fill_fail,
    });
    toast.success(`Applied "${template.name}" template`);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  // Count form steps for a use case
  const getFormStepCount = (uc: GlobalUseCase) => {
    return Array.isArray(uc.defaultFormSteps) ? uc.defaultFormSteps.length : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Global Use Cases
          </h2>
          <p className="text-sm text-muted-foreground">
            Define use cases available across all demo environments
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Use Case
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : useCases.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No global use cases defined yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {useCases.map((uc) => {
            const IconComp = ICON_MAP[uc.iconName] ?? Package;
            const isExpanded = expandedId === uc.id;
            const stepCount = getFormStepCount(uc);

            return (
              <Collapsible key={`${uc.id}-${uc.updatedAt}`} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? uc.id : null)}>
                <Card className="glass-card">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left">
                      <IconComp className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                          <span className="font-medium">{uc.title}</span>
                          {!uc.isEnabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                          <Badge variant="outline" className="text-[10px]">{uc.defaultVerificationType}</Badge>
                          {uc.portalType && uc.portalType !== 'none' && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10">
                              {PORTAL_TYPE_OPTIONS.find(p => p.value === uc.portalType)?.label || uc.portalType} Portal
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            <FileText className="w-3 h-3 mr-1" />
                            {stepCount} step{stepCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {uc.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{uc.description}</p>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4">
                      {/* Basic Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            defaultValue={uc.title}
                            onBlur={(e) => {
                              if (e.target.value !== uc.title) handleUpdate(uc.id, { title: e.target.value });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Default Verification Type</Label>
                          <Input
                            defaultValue={uc.defaultVerificationType}
                            onBlur={(e) => {
                              if (e.target.value !== uc.defaultVerificationType) handleUpdate(uc.id, { defaultVerificationType: e.target.value });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Post-Login Portal Type</Label>
                          <Select
                            value={uc.portalType || 'none'}
                            onValueChange={(val) => handleUpdate(uc.id, { portalType: val as PortalType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PORTAL_TYPE_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex flex-col">
                                    <span>{opt.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            If this use case includes a login step, which portal experience should appear after login?
                          </p>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            defaultValue={uc.description ?? ''}
                            onBlur={(e) => handleUpdate(uc.id, { description: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Default Form Template */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Default Form Template
                        </h4>
                        <div className="flex items-center gap-3">
                          <Select onValueChange={(val) => handleApplyTemplate(uc.id, val)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder={
                                stepCount > 0
                                  ? `Current: ${stepCount} step${stepCount !== 1 ? 's' : ''} configured`
                                  : 'Select a template...'
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.length === 0 ? (
                                <SelectItem value="none" disabled>No templates available</SelectItem>
                              ) : (
                                templates.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{t.name}</span>
                                      {t.category && (
                                        <span className="text-xs text-muted-foreground">({t.category})</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {stepCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleUpdate(uc.id, { defaultFormSteps: [] });
                                toast.success('Form steps cleared');
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          This template will be used as the default form when new demos link this use case.
                        </p>
                      </div>

                      {/* Page Content */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">Default Page Content</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Hero Title</Label>
                            <Input
                              defaultValue={uc.defaultPageContent?.heroTitle ?? ''}
                              onBlur={(e) => handleUpdatePageContent(uc.id, uc.defaultPageContent, { heroTitle: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hero Subtitle</Label>
                            <Input
                              defaultValue={uc.defaultPageContent?.heroSubtitle ?? ''}
                              onBlur={(e) => handleUpdatePageContent(uc.id, uc.defaultPageContent, { heroSubtitle: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CTA Button Label</Label>
                            <Input
                              defaultValue={uc.defaultPageContent?.ctaLabel ?? ''}
                              onBlur={(e) => handleUpdatePageContent(uc.id, uc.defaultPageContent, { ctaLabel: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CTA Description</Label>
                            <Input
                              defaultValue={uc.defaultPageContent?.ctaDescription ?? ''}
                              onBlur={(e) => handleUpdatePageContent(uc.id, uc.defaultPageContent, { ctaDescription: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={uc.isEnabled}
                            onCheckedChange={(v) => handleUpdate(uc.id, { isEnabled: v })}
                          />
                          <span className="text-sm text-muted-foreground">Enabled</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(uc.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Use Case</DialogTitle>
            <DialogDescription>Define a new global use case available to all demos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newUseCase.title}
                onChange={(e) => setNewUseCase(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Customer Onboarding"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newUseCase.description}
                onChange={(e) => setNewUseCase(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this use case"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newUseCase.title || createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Use Case?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this use case and remove it from all demos that use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
