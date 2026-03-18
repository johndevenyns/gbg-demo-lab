import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Building2, Plus, Trash2, ChevronDown, ChevronRight, Package, FileText,
  Landmark, Car, ShoppingBag, Shield, Heart, Eye, Settings,
} from 'lucide-react';
import { Industry, PORTAL_TYPE_OPTIONS } from '@/types/industry';
import { GlobalUseCase, UseCasePageContent } from '@/types/useCase';
import { useIndustries, useCreateIndustry, useUpdateIndustry, useDeleteIndustry } from '@/hooks/useIndustries';
import {
  useGlobalUseCases, useCreateGlobalUseCase, useUpdateGlobalUseCase, useDeleteGlobalUseCase,
} from '@/hooks/useUseCases';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PortalPreviewDialog } from './PortalPreviewDialog';
import { PortalConfig, DEFAULT_BANKING_CONFIG } from '@/types/portalConfig';
import { CreateIndustryWizard } from './CreateIndustryWizard';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Landmark, Car, ShoppingBag, Shield, Heart, Package,
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

export function IndustryManagement() {
  const { data: industries = [], isLoading } = useIndustries();
  const createIndustry = useCreateIndustry();
  const updateIndustry = useUpdateIndustry();
  const deleteIndustryMut = useDeleteIndustry();
  const { data: allUseCases = [] } = useGlobalUseCases();
  const createUseCase = useCreateGlobalUseCase();
  const updateUseCase = useUpdateGlobalUseCase();
  const deleteUseCase = useDeleteGlobalUseCase();

  const [expandedIndustryId, setExpandedIndustryId] = useState<string | null>(null);
  const [expandedUseCaseId, setExpandedUseCaseId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createUseCaseIndustryId, setCreateUseCaseIndustryId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'industry' | 'usecase'>('industry');
  const [newUseCase, setNewUseCase] = useState({ title: '', description: '' });
  const [templates, setTemplates] = useState<FormTemplateOption[]>([]);
  const [previewIndustryId, setPreviewIndustryId] = useState<string | null>(null);
  

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('form_templates')
        .select('id, name, description, category, form_steps, show_fill_pass, show_fill_fail')
        .order('name');
      if (data) setTemplates(data as FormTemplateOption[]);
    };
    load();
  }, []);

  const useCasesForIndustry = (_industryId: string) =>
    allUseCases;

  const unassignedUseCases = allUseCases;

  const handleCreateIndustry = (data: {
    title: string;
    description: string;
    iconName: string;
    portalType: string;
    useCases: Array<{ title: string; description: string; defaultFormSteps: Record<string, unknown>[]; defaultVerificationType: string; pageContent: any; showFillPass: boolean; showFillFail: boolean; isEnabled: boolean }>;
  }) => {
    createIndustry.mutate({
      title: data.title,
      description: data.description || undefined,
      iconName: data.iconName,
      portalType: data.portalType,
      displayOrder: industries.length,
      isEnabled: true,
    }, {
      onSuccess: (newIndustry) => {
        // Create use cases for this industry
        data.useCases.forEach((uc, idx) => {
          createUseCase.mutate({
            title: uc.title,
            description: uc.description || undefined,
            iconName: 'Package',
            defaultFormSteps: uc.defaultFormSteps,
            defaultVerificationType: uc.defaultVerificationType,
            defaultPageContent: uc.pageContent as any,
            showFillPass: uc.showFillPass,
            showFillFail: uc.showFillFail,
            displayOrder: idx,
            isEnabled: uc.isEnabled,
          });
        });
        setCreateOpen(false);
      },
    });
  };

  const handleCreateUseCase = () => {
    if (!createUseCaseIndustryId) return;
    const isGeneric = createUseCaseIndustryId === '__generic__';
    const industryUseCases = isGeneric ? unassignedUseCases : useCasesForIndustry(createUseCaseIndustryId);
    createUseCase.mutate({
      title: newUseCase.title,
      description: newUseCase.description || undefined,
      iconName: 'Package',
      industryId: isGeneric ? null : createUseCaseIndustryId,
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
      displayOrder: industryUseCases.length,
      isEnabled: true,
    }, {
      onSuccess: () => {
        setCreateUseCaseIndustryId(null);
        setNewUseCase({ title: '', description: '' });
      },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    if (deleteType === 'industry') {
      deleteIndustryMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    } else {
      deleteUseCase.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const handleApplyTemplate = (useCaseId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    updateUseCase.mutate({
      id: useCaseId,
      updates: {
        defaultFormSteps: template.form_steps as Record<string, unknown>[],
        showFillPass: template.show_fill_pass,
        showFillFail: template.show_fill_fail,
      },
    });
    toast.success(`Applied "${template.name}" template`);
  };

  const getFormStepCount = (uc: GlobalUseCase) =>
    Array.isArray(uc.defaultFormSteps) ? uc.defaultFormSteps.length : 0;

  const renderUseCase = (uc: GlobalUseCase) => {
    const isExpanded = expandedUseCaseId === uc.id;
    const stepCount = getFormStepCount(uc);
    return (
      <Collapsible key={uc.id} open={isExpanded} onOpenChange={(open) => setExpandedUseCaseId(open ? uc.id : null)}>
        <div className="border rounded-lg bg-card">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{uc.title}</span>
                  {!uc.isEnabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                  <Badge variant="outline" className="text-[10px]">
                    <FileText className="w-3 h-3 mr-1" />
                    {stepCount} step{stepCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {uc.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{uc.description}</p>
                )}
              </div>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input
                    defaultValue={uc.title}
                    className="h-8 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== uc.title) updateUseCase.mutate({ id: uc.id, updates: { title: e.target.value } });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Verification Type</Label>
                  <Input
                    defaultValue={uc.defaultVerificationType}
                    className="h-8 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== uc.defaultVerificationType) updateUseCase.mutate({ id: uc.id, updates: { defaultVerificationType: e.target.value } });
                    }}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    defaultValue={uc.description ?? ''}
                    onBlur={(e) => updateUseCase.mutate({ id: uc.id, updates: { description: e.target.value } })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Form Template */}
              <div className="border-t pt-3">
                <Label className="text-xs font-medium mb-2 block">Default Form Template</Label>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(val) => handleApplyTemplate(uc.id, val)}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder={stepCount > 0 ? `${stepCount} steps configured` : 'Select template...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {stepCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        updateUseCase.mutate({ id: uc.id, updates: { defaultFormSteps: [] } });
                        toast.success('Form steps cleared');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Page Content */}
              <div className="border-t pt-3">
                <Label className="text-xs font-medium mb-2 block">Default Page Content</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['heroTitle', 'heroSubtitle', 'ctaLabel', 'ctaDescription'] as const).map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                      <Input
                        defaultValue={(uc.defaultPageContent as Record<string, string>)?.[field] ?? ''}
                        className="h-8 text-sm"
                        onBlur={(e) => updateUseCase.mutate({
                          id: uc.id,
                          updates: { defaultPageContent: { ...uc.defaultPageContent, [field]: e.target.value } },
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={uc.isEnabled}
                    onCheckedChange={(v) => updateUseCase.mutate({ id: uc.id, updates: { isEnabled: v } })}
                  />
                  <span className="text-xs text-muted-foreground">Enabled</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7 text-xs"
                  onClick={() => { setDeleteId(uc.id); setDeleteType('usecase'); }}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Industries & Use Cases
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage industries, their portal types, and nested use cases
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Industry
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : industries.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No industries defined yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {industries.map((ind) => {
            const IconComp = ICON_MAP[ind.iconName] ?? Building2;
            const isExpanded = expandedIndustryId === ind.id;
            const useCases = useCasesForIndustry(ind.id);
            const portalLabel = PORTAL_TYPE_OPTIONS.find(p => p.value === ind.portalType)?.label || 'No Portal';

            return (
              <Collapsible key={ind.id} open={isExpanded} onOpenChange={(open) => setExpandedIndustryId(open ? ind.id : null)}>
                <Card className="glass-card">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left">
                      <IconComp className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ind.title}</span>
                          {!ind.isEnabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                          <Badge variant="outline" className="text-[10px] bg-primary/10">{portalLabel}</Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {useCases.length} use case{useCases.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {ind.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{ind.description}</p>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4">
                      {/* Industry Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            defaultValue={ind.title}
                            onBlur={(e) => {
                              if (e.target.value !== ind.title) updateIndustry.mutate({ id: ind.id, updates: { title: e.target.value } });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Portal Type</Label>
                          <Select
                            value={ind.portalType}
                            onValueChange={(val) => updateIndustry.mutate({ id: ind.id, updates: { portalType: val } })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PORTAL_TYPE_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            The mock portal shown after login for this industry
                          </p>
                          {ind.portalType !== 'none' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setPreviewIndustryId(ind.id)}
                              >
                                <Eye className="w-3 h-3" /> Preview Portal
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            defaultValue={ind.description ?? ''}
                            onBlur={(e) => updateIndustry.mutate({ id: ind.id, updates: { description: e.target.value } })}
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Use Cases */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Use Cases ({useCases.length})
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setCreateUseCaseIndustryId(ind.id); setNewUseCase({ title: '', description: '' }); }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Use Case
                          </Button>
                        </div>
                        {useCases.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            No use cases yet. Add one to define customer journeys for this industry.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {useCases.map(renderUseCase)}
                          </div>
                        )}
                      </div>

                      {/* Industry Footer */}
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ind.isEnabled}
                            onCheckedChange={(v) => updateIndustry.mutate({ id: ind.id, updates: { isEnabled: v } })}
                          />
                          <span className="text-sm text-muted-foreground">Enabled</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setDeleteId(ind.id); setDeleteType('industry'); }}
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

      {/* Generic Use Case Templates */}
      <Card className="glass-card border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Generic Use Case Templates</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Reusable templates that can be cloned into any industry. The original stays here for future use.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setCreateUseCaseIndustryId('__generic__'); setNewUseCase({ title: '', description: '' }); }}
            >
              <Plus className="w-3 h-3 mr-1" />
              New Generic
            </Button>
          </div>
          {unassignedUseCases.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No generic use case templates yet. Create one to reuse across industries.
            </p>
          ) : (
            <div className="space-y-2">
              {unassignedUseCases.map(uc => (
                <div key={uc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{uc.title}</span>
                    {uc.description && <p className="text-xs text-muted-foreground truncate">{uc.description}</p>}
                  </div>
                  <Select onValueChange={(industryId) => {
                    const industryUseCases = useCasesForIndustry(industryId);
                    createUseCase.mutate({
                      title: uc.title,
                      description: uc.description,
                      iconName: uc.iconName,
                      industryId,
                      defaultFormSteps: uc.defaultFormSteps,
                      defaultVerificationType: uc.defaultVerificationType,
                      defaultPageContent: { ...uc.defaultPageContent },
                      displayOrder: industryUseCases.length,
                      isEnabled: true,
                      showFillPass: uc.showFillPass,
                      showFillFail: uc.showFillFail,
                    });
                    toast.success(`Cloned "${uc.title}" into industry`);
                  }}>
                    <SelectTrigger className="w-44 h-8 text-xs shrink-0">
                      <SelectValue placeholder="Clone to industry..." />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(ind => (
                        <SelectItem key={ind.id} value={ind.id}>{ind.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 px-2 shrink-0"
                    onClick={() => { setDeleteId(uc.id); setDeleteType('usecase'); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Industry Wizard */}
      <CreateIndustryWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        onComplete={handleCreateIndustry}
        existingIndustryCount={industries.length}
      />

      {/* Create Use Case Dialog */}
      <Dialog open={!!createUseCaseIndustryId} onOpenChange={(open) => !open && setCreateUseCaseIndustryId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{createUseCaseIndustryId === '__generic__' ? 'Create Generic Use Case' : 'Add Use Case'}</DialogTitle>
            <DialogDescription>
              {createUseCaseIndustryId === '__generic__'
                ? 'Create a reusable use case template that can be cloned into any industry.'
                : `Add a use case to ${industries.find(i => i.id === createUseCaseIndustryId)?.title}`}
            </DialogDescription>
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
                placeholder="Brief description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUseCaseIndustryId(null)}>Cancel</Button>
            <Button onClick={handleCreateUseCase} disabled={!newUseCase.title || createUseCase.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteType === 'industry' ? 'Industry' : 'Use Case'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'industry'
                ? 'This will delete the industry and unlink all its use cases.'
                : 'This will permanently delete this use case.'}
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

      {/* Portal Preview Dialog */}
      {previewIndustryId && (() => {
        const ind = industries.find(i => i.id === previewIndustryId);
        if (!ind) return null;
        return (
          <PortalPreviewDialog
            open={true}
            onOpenChange={() => setPreviewIndustryId(null)}
            portalType={ind.portalType}
            portalConfig={ind.portalConfig}
            brandingOverrides={{ bankName: ind.title }}
          />
        );
      })()}

    </div>
  );
}
