import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Building2, ChevronLeft, ChevronRight, Check, Plus, Trash2, Package, FileText, Monitor,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { usePortalTypes, PortalType } from '@/hooks/usePortalTypes';
import { useGlobalUseCases } from '@/hooks/useUseCases';
import { GlobalUseCase, UseCasePageContent } from '@/types/useCase';
import { supabase } from '@/integrations/supabase/client';

interface FormTemplateOption {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  form_steps: unknown[];
  show_fill_pass: boolean;
  show_fill_fail: boolean;
}

// Wizard use case definition (not yet saved to DB)
interface WizardUseCase {
  tempId: string;
  title: string;
  description: string;
  templateId?: string;
  templateName?: string;
  defaultFormSteps: Record<string, unknown>[];
  defaultVerificationType: string;
  pageContent: UseCasePageContent;
  showFillPass: boolean;
  showFillFail: boolean;
  isEnabled: boolean;
  clonedFromId?: string; // if cloned from a generic template
}

interface CreateIndustryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    title: string;
    description: string;
    iconName: string;
    portalType: string;
    useCases: WizardUseCase[];
  }) => void;
  existingIndustryCount: number;
}

const STEPS = [
  { key: 'name', label: 'Industry Details' },
  { key: 'portal', label: 'Portal Type' },
  { key: 'usecases', label: 'Use Cases' },
  { key: 'review', label: 'Review & Create' },
] as const;

type StepKey = typeof STEPS[number]['key'];

export function CreateIndustryWizard({
  open,
  onOpenChange,
  onComplete,
  existingIndustryCount,
}: CreateIndustryWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [portalType, setPortalType] = useState('none');
  const [useCases, setUseCases] = useState<WizardUseCase[]>([]);
  const [addingUseCase, setAddingUseCase] = useState(false);
  const [newUcTitle, setNewUcTitle] = useState('');
  const [newUcDesc, setNewUcDesc] = useState('');

  const { data: portalTypes = [] } = usePortalTypes();
  const { data: allGlobalUseCases = [] } = useGlobalUseCases();
  const [templates, setTemplates] = useState<FormTemplateOption[]>([]);

  // Generic (unassigned) use cases available as blueprints
  const genericUseCases = allGlobalUseCases.filter(uc => !uc.industryId);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from('form_templates')
        .select('id, name, description, category, form_steps, show_fill_pass, show_fill_fail')
        .order('name');
      if (data) setTemplates(data as FormTemplateOption[]);
    };
    load();
  }, [open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setTitle('');
      setDescription('');
      setPortalType('none');
      setUseCases([]);
      setAddingUseCase(false);
      setNewUcTitle('');
      setNewUcDesc('');
    }
  }, [open]);

  const stepKey = STEPS[currentStep].key;

  const canNext = () => {
    if (stepKey === 'name') return title.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleFinish = () => {
    onComplete({
      title: title.trim(),
      description: description.trim(),
      iconName: 'Building2',
      portalType,
      useCases,
    });
  };

  const addBlankUseCase = () => {
    if (!newUcTitle.trim()) return;
    setUseCases(prev => [...prev, {
      tempId: crypto.randomUUID(),
      title: newUcTitle.trim(),
      description: newUcDesc.trim(),
      defaultFormSteps: [],
      defaultVerificationType: 'docBio',
      pageContent: {
        heroTitle: newUcTitle.trim(),
        heroSubtitle: newUcDesc.trim(),
        ctaLabel: 'Verify My Identity',
        ctaDescription: 'Complete identity verification to continue.',
      },
      showFillPass: false,
      showFillFail: false,
      isEnabled: true,
    }]);
    setNewUcTitle('');
    setNewUcDesc('');
    setAddingUseCase(false);
  };

  const cloneGenericUseCase = (uc: GlobalUseCase) => {
    setUseCases(prev => [...prev, {
      tempId: crypto.randomUUID(),
      title: uc.title,
      description: uc.description || '',
      defaultFormSteps: uc.defaultFormSteps,
      defaultVerificationType: uc.defaultVerificationType,
      pageContent: { ...uc.defaultPageContent },
      showFillPass: uc.showFillPass,
      showFillFail: uc.showFillFail,
      isEnabled: true,
      clonedFromId: uc.id,
    }]);
  };

  const removeUseCase = (tempId: string) => {
    setUseCases(prev => prev.filter(uc => uc.tempId !== tempId));
  };

  const applyTemplate = (tempId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setUseCases(prev => prev.map(uc =>
      uc.tempId === tempId
        ? {
            ...uc,
            templateId: template.id,
            templateName: template.name,
            defaultFormSteps: template.form_steps as Record<string, unknown>[],
            showFillPass: template.show_fill_pass,
            showFillFail: template.show_fill_fail,
          }
        : uc
    ));
  };

  const updateUseCase = (tempId: string, updates: Partial<WizardUseCase>) => {
    setUseCases(prev => prev.map(uc => uc.tempId === tempId ? { ...uc, ...updates } : uc));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Create Industry
          </DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-1">
          {STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0 transition-colors ${
                idx < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : idx === currentStep
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {idx < currentStep ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={`text-xs ml-1.5 hidden sm:block ${idx === currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${idx < currentStep ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1 space-y-4">
          {/* Step 1: Name */}
          {stepKey === 'name' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Industry Name *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Telecommunications, Fintech, Real Estate"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this industry vertical and its verification needs"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Portal Type */}
          {stepKey === 'portal' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose the mock portal experience users will see after logging in. This determines the dashboard layout and available interactions.
              </p>
              <div className="grid gap-3">
                {/* No Portal option */}
                <Card
                  className={`cursor-pointer transition-all hover:border-primary/50 ${portalType === 'none' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                  onClick={() => setPortalType('none')}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">No Portal</h4>
                      <p className="text-xs text-muted-foreground">Standard form flow without a portal experience</p>
                    </div>
                    {portalType === 'none' && <Check className="w-5 h-5 text-primary" />}
                  </CardContent>
                </Card>

                {portalTypes.filter(pt => pt.isEnabled).map(pt => {
                  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
                  const IconComp = icons[pt.iconName] || Monitor;
                  return (
                    <Card
                      key={pt.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${portalType === pt.typeKey ? 'border-primary ring-2 ring-primary/20' : ''}`}
                      onClick={() => setPortalType(pt.typeKey)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{pt.displayName}</h4>
                          {pt.description && <p className="text-xs text-muted-foreground">{pt.description}</p>}
                        </div>
                        {portalType === pt.typeKey && <Check className="w-5 h-5 text-primary" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Use Cases */}
          {stepKey === 'usecases' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add use cases that define customer journeys for this industry. You can create new ones or clone from existing templates.
              </p>

              {/* Added Use Cases */}
              {useCases.length > 0 && (
                <div className="space-y-3">
                  {useCases.map((uc, idx) => (
                    <Card key={uc.tempId} className="glass-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <Input
                              value={uc.title}
                              onChange={(e) => updateUseCase(uc.tempId, { title: e.target.value })}
                              className="h-8 text-sm font-medium"
                            />
                            <Input
                              value={uc.description}
                              onChange={(e) => updateUseCase(uc.tempId, { description: e.target.value })}
                              placeholder="Description"
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeUseCase(uc.tempId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Template Assignment */}
                        <div className="pl-11 space-y-2">
                          <Label className="text-xs">Form Template</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={uc.templateId || ''}
                              onValueChange={(val) => applyTemplate(uc.tempId, val)}
                            >
                              <SelectTrigger className="flex-1 h-8 text-sm">
                                <SelectValue placeholder={
                                  uc.defaultFormSteps.length > 0
                                    ? `${uc.templateName || 'Custom'} (${uc.defaultFormSteps.length} steps)`
                                    : 'Select template...'
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-3 h-3" />
                                      {t.name}
                                      {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {uc.defaultFormSteps.length > 0 && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                <FileText className="w-3 h-3 mr-1" />
                                {uc.defaultFormSteps.length} steps
                              </Badge>
                            )}
                          </div>

                          {/* Verification Type */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Verification Type</Label>
                              <Select
                                value={uc.defaultVerificationType}
                                onValueChange={(val) => updateUseCase(uc.tempId, { defaultVerificationType: val })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="docBio">Doc + Bio</SelectItem>
                                  <SelectItem value="dataBio">Data + Bio</SelectItem>
                                  <SelectItem value="dataOnly">Data Only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end gap-3 pb-1">
                              <label className="flex items-center gap-1.5 text-xs">
                                <Switch
                                  checked={uc.isEnabled}
                                  onCheckedChange={(v) => updateUseCase(uc.tempId, { isEnabled: v })}
                                  className="scale-75"
                                />
                                Enabled
                              </label>
                            </div>
                          </div>
                        </div>

                        {uc.clonedFromId && (
                          <p className="text-[10px] text-muted-foreground pl-11">
                            Cloned from generic template
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add Use Case */}
              {addingUseCase ? (
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Use Case Title *</Label>
                      <Input
                        value={newUcTitle}
                        onChange={(e) => setNewUcTitle(e.target.value)}
                        placeholder="e.g., Customer Onboarding"
                        autoFocus
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={newUcDesc}
                        onChange={(e) => setNewUcDesc(e.target.value)}
                        placeholder="Brief description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addBlankUseCase} disabled={!newUcTitle.trim()}>
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setAddingUseCase(false); setNewUcTitle(''); setNewUcDesc(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setAddingUseCase(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Use Case
                </Button>
              )}

              {/* Clone from Generic Templates */}
              {genericUseCases.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Clone from Generic Templates
                  </h4>
                  <div className="grid gap-2">
                    {genericUseCases.map(uc => {
                      const alreadyCloned = useCases.some(u => u.clonedFromId === uc.id);
                      return (
                        <div
                          key={uc.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                            alreadyCloned ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/50 cursor-pointer'
                          }`}
                          onClick={() => !alreadyCloned && cloneGenericUseCase(uc)}
                        >
                          <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{uc.title}</span>
                            {uc.description && <p className="text-xs text-muted-foreground truncate">{uc.description}</p>}
                          </div>
                          {alreadyCloned ? (
                            <Badge variant="secondary" className="text-xs">Added</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs cursor-pointer">+ Clone</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {stepKey === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review your new industry configuration before creating.
              </p>

              <Card className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Portal Type</span>
                      <p className="font-medium mt-0.5">
                        {portalType === 'none'
                          ? 'No Portal'
                          : portalTypes.find(pt => pt.typeKey === portalType)?.displayName || portalType}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Use Cases</span>
                      <p className="font-medium mt-0.5">{useCases.length} configured</p>
                    </div>
                  </div>

                  {useCases.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground font-medium">Use Cases</span>
                        {useCases.map(uc => (
                          <div key={uc.tempId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{uc.title}</span>
                              {uc.description && <p className="text-xs text-muted-foreground truncate">{uc.description}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {uc.defaultFormSteps.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  <FileText className="w-3 h-3 mr-0.5" />{uc.defaultFormSteps.length} steps
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px]">{uc.defaultVerificationType}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canNext()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!title.trim()}>
                <Check className="w-4 h-4 mr-1" />
                Create Industry
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
