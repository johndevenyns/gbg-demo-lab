import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormStep, DecisionStepConfig as DecisionStepConfigType, DecisionChoice, DecisionChoiceIcon, DecisionDestinationType, AVAILABLE_DID_PROVIDERS } from '@/types/demo';
import { ResultPageConfig } from '@/components/preview/ResultPage';
import { DidProviderConfig } from './DidProviderConfig';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, GripVertical, 
  FileCheck, Smartphone, Database, Shield, User, Fingerprint, Camera, CreditCard,
  SplitSquareVertical, ArrowRight, Settings2, CheckCircle, XCircle
} from 'lucide-react';

const ICON_OPTIONS: { id: DecisionChoiceIcon; label: string; icon: React.ReactNode }[] = [
  { id: 'document', label: 'Document', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'smartphone', label: 'Smartphone', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
  { id: 'shield', label: 'Shield', icon: <Shield className="w-4 h-4" /> },
  { id: 'user', label: 'User', icon: <User className="w-4 h-4" /> },
  { id: 'fingerprint', label: 'Fingerprint', icon: <Fingerprint className="w-4 h-4" /> },
  { id: 'camera', label: 'Camera', icon: <Camera className="w-4 h-4" /> },
  { id: 'id-card', label: 'ID Card', icon: <CreditCard className="w-4 h-4" /> },
];

const VERIFICATION_TYPES = [
  { id: 'docbio', label: 'Document + Biometric', description: 'ID scan and selfie' },
  { id: 'databio', label: 'Data + Biometric', description: 'Data verification with selfie' },
  { id: 'dataonly', label: 'Data Only', description: 'Backend data verification' },
  { id: 'did', label: 'Digital ID', description: 'Digital ID verification' },
];

const getIconComponent = (iconId?: DecisionChoiceIcon) => {
  const iconOption = ICON_OPTIONS.find(i => i.id === iconId);
  return iconOption?.icon || <FileCheck className="w-4 h-4" />;
};

interface DecisionStepConfigProps {
  step: FormStep;
  allSteps: FormStep[];
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function DecisionStepConfig({ step, allSteps, onUpdateStep }: DecisionStepConfigProps) {
  const [expandedChoices, setExpandedChoices] = useState<Set<string>>(new Set());
  
  const config = step.decisionStepConfig || {
    title: 'Choose Your Path',
    subtitle: 'Select how you would like to proceed',
    choices: [],
    defaultExpanded: true,
    showBackButton: true,
    backButtonLabel: 'Back',
  };

  const handleConfigUpdate = (updates: Partial<DecisionStepConfigType>) => {
    onUpdateStep({
      decisionStepConfig: { ...config, ...updates }
    });
  };

  const handleAddChoice = () => {
    if (config.choices.length >= 4) return;
    
    const newChoice: DecisionChoice = {
      id: crypto.randomUUID(),
      label: `Option ${config.choices.length + 1}`,
      description: 'Description for this option',
      icon: 'document',
      collapsedByDefault: false,
      destinationType: 'verification',
      verificationType: 'docbio',
      useCustomResultPages: false,
      mobileIdProviders: [],
    };
    
    handleConfigUpdate({ choices: [...config.choices, newChoice] });
    setExpandedChoices(prev => new Set([...prev, newChoice.id]));
  };

  const handleUpdateChoice = (choiceId: string, updates: Partial<DecisionChoice>) => {
    handleConfigUpdate({
      choices: config.choices.map(c => 
        c.id === choiceId ? { ...c, ...updates } : c
      )
    });
  };

  const handleRemoveChoice = (choiceId: string) => {
    handleConfigUpdate({
      choices: config.choices.filter(c => c.id !== choiceId)
    });
  };

  const toggleChoiceExpanded = (choiceId: string) => {
    setExpandedChoices(prev => {
      const next = new Set(prev);
      if (next.has(choiceId)) {
        next.delete(choiceId);
      } else {
        next.add(choiceId);
      }
      return next;
    });
  };

  // Get available steps for "Go to step" destination (exclude current step and decision steps)
  const availableSteps = allSteps.filter(s => 
    s.id !== step.id && s.stepType !== 'decision'
  );

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="border-2 border-dashed border-amber-500/30 rounded-lg p-6 bg-amber-500/5">
        <div className="text-center space-y-3">
          <SplitSquareVertical className="w-10 h-10 mx-auto text-amber-600/60" />
          <div>
            <p className="font-semibold text-amber-700">{config.title || 'Choose Your Path'}</p>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {config.choices.map((choice, idx) => (
              <Badge key={choice.id} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                {getIconComponent(choice.icon)}
                <span className="ml-1">{choice.label || `Option ${idx + 1}`}</span>
              </Badge>
            ))}
            {config.choices.length === 0 && (
              <span className="text-sm text-muted-foreground italic">No choices configured</span>
            )}
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => handleConfigUpdate({ title: e.target.value })}
                placeholder="Choose Your Path"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subtitle</Label>
              <Input
                value={config.subtitle || ''}
                onChange={(e) => handleConfigUpdate({ subtitle: e.target.value })}
                placeholder="Select how you would like to proceed"
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.defaultExpanded ?? true}
                onCheckedChange={(v) => handleConfigUpdate({ defaultExpanded: v })}
                className="scale-75"
              />
              <Label className="text-sm">Show expanded descriptions by default</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Choices */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Choices ({config.choices.length}/4)
          </Label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddChoice}
            disabled={config.choices.length >= 4}
            className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Choice
          </Button>
        </div>

        {config.choices.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
            <SplitSquareVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No choices configured yet</p>
            <p className="text-xs mt-1">Add up to 4 choices for users to select from</p>
          </div>
        )}

        {config.choices.map((choice, idx) => (
          <Collapsible
            key={choice.id}
            open={expandedChoices.has(choice.id)}
            onOpenChange={() => toggleChoiceExpanded(choice.id)}
          >
            <Card className="border-border">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="w-8 h-8 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-600">
                    {getIconComponent(choice.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{choice.label || `Option ${idx + 1}`}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {choice.destinationType === 'verification' && `→ ${VERIFICATION_TYPES.find(v => v.id === choice.verificationType)?.label || 'Verification'}`}
                      {choice.destinationType === 'step' && `→ Step: ${availableSteps.find(s => s.id === choice.targetStepId)?.title || 'Select step'}`}
                      {choice.destinationType === 'next' && '→ Continue to next step'}
                    </p>
                  </div>
                  {choice.useCustomResultPages && (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                      Custom Results
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveChoice(choice.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedChoices.has(choice.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Label</Label>
                      <Input
                        value={choice.label}
                        onChange={(e) => handleUpdateChoice(choice.id, { label: e.target.value })}
                        placeholder="Choice label"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Icon</Label>
                      <Select
                        value={choice.icon || 'document'}
                        onValueChange={(v) => handleUpdateChoice(choice.id, { icon: v as DecisionChoiceIcon })}
                      >
                        <SelectTrigger className="h-8 text-sm bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {ICON_OPTIONS.map(icon => (
                            <SelectItem key={icon.id} value={icon.id}>
                              <div className="flex items-center gap-2">
                                {icon.icon}
                                <span>{icon.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Description</Label>
                    <Textarea
                      value={choice.description || ''}
                      onChange={(e) => handleUpdateChoice(choice.id, { description: e.target.value })}
                      placeholder="Describe this option..."
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={choice.collapsedByDefault || false}
                      onCheckedChange={(v) => handleUpdateChoice(choice.id, { collapsedByDefault: v })}
                      className="scale-75"
                    />
                    <Label className="text-sm text-muted-foreground">Start collapsed (only show label)</Label>
                  </div>

                  {/* Destination */}
                  <div className="pt-3 border-t border-border space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      Destination
                    </Label>

                    <Select
                      value={choice.destinationType}
                      onValueChange={(v) => handleUpdateChoice(choice.id, { destinationType: v as DecisionDestinationType })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        <SelectItem value="verification">Go to verification</SelectItem>
                        <SelectItem value="step">Go to specific step</SelectItem>
                        <SelectItem value="next">Continue to next step</SelectItem>
                      </SelectContent>
                    </Select>

                    {choice.destinationType === 'verification' && (
                      <Select
                        value={choice.verificationType || 'docbio'}
                        onValueChange={(v) => handleUpdateChoice(choice.id, { 
                          verificationType: v as 'docbio' | 'databio' | 'dataonly' | 'did',
                          // Initialize dID providers with all available when switching to dID
                          ...(v === 'did' && !choice.mobileIdProviders?.length ? {
                            mobileIdProviders: AVAILABLE_DID_PROVIDERS.map(p => ({ ...p, enabled: true }))
                          } : {})
                        })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {VERIFICATION_TYPES.map(vt => (
                            <SelectItem key={vt.id} value={vt.id}>
                              <div>
                                <span className="font-medium">{vt.label}</span>
                                <span className="text-muted-foreground ml-2 text-xs">({vt.description})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* dID Provider Selection - show when dID is selected */}
                    {choice.destinationType === 'verification' && choice.verificationType === 'did' && (
                      <div className="mt-2">
                        <DidProviderConfig
                          enabledProviders={choice.mobileIdProviders || []}
                          onChange={(providers) => handleUpdateChoice(choice.id, { mobileIdProviders: providers })}
                        />
                      </div>
                    )}

                    {choice.destinationType === 'step' && (
                      <Select
                        value={choice.targetStepId || ''}
                        onValueChange={(v) => handleUpdateChoice(choice.id, { targetStepId: v })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select target step" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {availableSteps.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              Step {s.order}: {s.title}
                            </SelectItem>
                          ))}
                          {availableSteps.length === 0 && (
                            <div className="px-2 py-1 text-sm text-muted-foreground">No available steps</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Custom Result Pages (only for verification destinations) */}
                  {choice.destinationType === 'verification' && (
                    <div className="pt-3 border-t border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Settings2 className="w-3 h-3" />
                          Custom Result Pages
                        </Label>
                        <Switch
                          checked={choice.useCustomResultPages || false}
                          onCheckedChange={(v) => handleUpdateChoice(choice.id, { useCustomResultPages: v })}
                          className="scale-75"
                        />
                      </div>

                      {choice.useCustomResultPages && (
                        <div className="space-y-4 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                          {/* Success Page */}
                          <div className="space-y-2">
                            <Label className="text-sm flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Success Page
                            </Label>
                            <Input
                              value={choice.customSuccessPage?.title || ''}
                              onChange={(e) => handleUpdateChoice(choice.id, {
                                customSuccessPage: {
                                  ...choice.customSuccessPage,
                                  type: 'success',
                                  title: e.target.value,
                                } as ResultPageConfig
                              })}
                              placeholder="Verification Successful!"
                              className="h-8 text-sm"
                            />
                            <Input
                              value={choice.customSuccessPage?.subtitle || ''}
                              onChange={(e) => handleUpdateChoice(choice.id, {
                                customSuccessPage: {
                                  ...choice.customSuccessPage,
                                  type: 'success',
                                  title: choice.customSuccessPage?.title || 'Success',
                                  subtitle: e.target.value,
                                } as ResultPageConfig
                              })}
                              placeholder="Subtitle (optional)"
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Failure Page */}
                          <div className="space-y-2">
                            <Label className="text-sm flex items-center gap-2 text-red-600">
                              <XCircle className="w-4 h-4" />
                              Failure Page
                            </Label>
                            <Input
                              value={choice.customFailurePage?.title || ''}
                              onChange={(e) => handleUpdateChoice(choice.id, {
                                customFailurePage: {
                                  ...choice.customFailurePage,
                                  type: 'failure',
                                  title: e.target.value,
                                } as ResultPageConfig
                              })}
                              placeholder="Verification Failed"
                              className="h-8 text-sm"
                            />
                            <Input
                              value={choice.customFailurePage?.subtitle || ''}
                              onChange={(e) => handleUpdateChoice(choice.id, {
                                customFailurePage: {
                                  ...choice.customFailurePage,
                                  type: 'failure',
                                  title: choice.customFailurePage?.title || 'Failed',
                                  subtitle: e.target.value,
                                } as ResultPageConfig
                              })}
                              placeholder="Subtitle (optional)"
                              className="h-8 text-sm"
                            />
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Leave empty to use the global result page settings from the Results tab.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Navigation */}
      <Card className="border-border">
        <CardContent className="pt-4 space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Navigation
          </Label>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.showBackButton ?? true}
              onCheckedChange={(v) => handleConfigUpdate({ showBackButton: v })}
              className="scale-75"
            />
            <div className="flex-1 space-y-1">
              <Label className="text-sm">Back Button</Label>
              {config.showBackButton !== false && (
                <Input
                  value={config.backButtonLabel || 'Back'}
                  onChange={(e) => handleConfigUpdate({ backButtonLabel: e.target.value })}
                  placeholder="Back"
                  className="h-7 text-sm"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
