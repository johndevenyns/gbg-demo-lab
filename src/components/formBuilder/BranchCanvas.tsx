import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormStep, DecisionChoice, DemoEnvironment, FormField, DecisionChoiceIcon } from '@/types/demo';
import { FormStepCard } from './FormStepCard';
import { AddStepDialog, StepTypeOption } from './AddStepDialog';
import { 
  Plus, ChevronDown, ChevronUp, ArrowRight, Trash2, GripVertical,
  FileCheck, Smartphone, Database, Shield, User, Fingerprint, Camera, CreditCard,
  GitBranch, ArrowDown
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

interface BranchCanvasProps {
  choice: DecisionChoice;
  choiceIndex: number;
  allSteps: FormStep[];
  stepsAfterDecision: FormStep[]; // Steps that come after the decision point
  demo?: DemoEnvironment;
  onUpdateChoice: (updates: Partial<DecisionChoice>) => void;
  onRemoveChoice: () => void;
}

export function BranchCanvas({ 
  choice, 
  choiceIndex, 
  allSteps,
  stepsAfterDecision,
  demo, 
  onUpdateChoice, 
  onRemoveChoice 
}: BranchCanvasProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set((choice.branchSteps || []).map(s => s.id))
  );
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);

  const branchSteps = choice.branchSteps || [];

  const generateId = () => crypto.randomUUID();

  // Use steps after decision for destination selection, fallback to non-decision steps
  const availableDestinationSteps = stepsAfterDecision.length > 0 
    ? stepsAfterDecision.filter(s => s.stepType !== 'decision')
    : allSteps.filter(s => s.stepType !== 'decision');

  const handleAddStep = useCallback((type: StepTypeOption, title: string) => {
    const stepId = generateId();
    let newStep: FormStep;

    if (type === 'form') {
      newStep = {
        id: stepId,
        title,
        order: branchSteps.length + 1,
        stepType: 'form',
        fields: [],
      };
    } else if (type === 'verification') {
      newStep = {
        id: stepId,
        title,
        order: branchSteps.length + 1,
        stepType: 'verification_flow',
        fields: [],
        verificationFlowConfig: {
          pathType: choice.verificationType || 'docbio',
          qrCodeEnabled: true,
          qrCodeTitle: 'Scan to Verify',
          qrCodeInstructions: 'Scan this QR code with your mobile device to complete verification',
          statusEnabled: true,
          statusPollingInterval: 5,
          mobileIdEnabled: false,
          autoAdvanceOnComplete: true,
          showBackButton: true,
          backButtonLabel: 'Back',
        },
      };
    } else if (type === 'api') {
      newStep = {
        id: stepId,
        title,
        order: branchSteps.length + 1,
        stepType: 'api',
        fields: [],
        apiStepConfig: {
          method: 'POST',
          autoAdvanceOnSuccess: true,
          autoAdvanceDelay: 2,
        },
      };
    } else if (type === 'page') {
      newStep = {
        id: stepId,
        title,
        order: branchSteps.length + 1,
        stepType: 'page',
        fields: [],
        pageStepConfig: {
          layout: 'centered',
          elements: [
            {
              id: generateId(),
              type: 'heading',
              order: 0,
              content: 'Page Title',
              size: 'xl',
              alignment: 'center',
            },
            {
              id: generateId(),
              type: 'text',
              order: 1,
              content: 'Add your content here',
              alignment: 'center',
            },
          ],
        },
      };
    } else if (type === 'unified_verification') {
      // New unified verification step
      newStep = {
        id: stepId,
        title,
        order: branchSteps.length + 1,
        stepType: 'unified_verification',
        fields: [],
        unifiedVerificationConfig: {
          methodSelection: 'admin_preselect',
          enabledTypes: ['docbio'],
          typeConfigs: {},
          successDestination: 'default',
          failureDestination: 'default',
          showBackButton: true,
          backButtonLabel: 'Back',
        },
      };
    } else {
      newStep = {
        id: stepId,
        title,
        order: branchSteps.length + 1,
        stepType: 'form',
        fields: [],
      };
    }

    onUpdateChoice({
      branchSteps: [...branchSteps, newStep]
    });
    setExpandedSteps(prev => new Set([...prev, stepId]));
  }, [branchSteps, choice.verificationType, onUpdateChoice]);

  const removeStep = useCallback((stepId: string) => {
    const newSteps = branchSteps
      .filter(s => s.id !== stepId)
      .map((s, i) => ({ ...s, order: i + 1 }));
    onUpdateChoice({ branchSteps: newSteps });
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }, [branchSteps, onUpdateChoice]);

  const updateStep = useCallback((stepId: string, updates: Partial<FormStep>) => {
    onUpdateChoice({
      branchSteps: branchSteps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    });
  }, [branchSteps, onUpdateChoice]);

  const removeField = useCallback((stepId: string, fieldId: string) => {
    onUpdateChoice({
      branchSteps: branchSteps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields
            .filter(f => f.id !== fieldId)
            .map((f, i) => ({ ...f, order: i })),
        };
      })
    });
  }, [branchSteps, onUpdateChoice]);

  const toggleFieldRequired = useCallback((stepId: string, fieldId: string) => {
    onUpdateChoice({
      branchSteps: branchSteps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...f, required: !f.required } : f
          ),
        };
      })
    });
  }, [branchSteps, onUpdateChoice]);

  const updateFieldLabel = useCallback((stepId: string, fieldId: string, label: string) => {
    onUpdateChoice({
      branchSteps: branchSteps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...f, label } : f
          ),
        };
      })
    });
  }, [branchSteps, onUpdateChoice]);

  const updateFieldContent = useCallback((stepId: string, fieldId: string, content: string) => {
    onUpdateChoice({
      branchSteps: branchSteps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id !== fieldId) return f;
            // For consent_checkbox, update consentText; for yes_no, update questionText; for checkbox, update checkboxText; for others, update content
            if (f.type === 'consent_checkbox') {
              return { ...f, consentText: content };
            }
            if (f.type === 'yes_no') {
              return { ...f, questionText: content };
            }
            if (f.type === 'checkbox') {
              return { ...f, checkboxText: content };
            }
            return { ...f, content };
          }),
        };
      })
    });
  }, [branchSteps, onUpdateChoice]);

  const toggleExpand = useCallback((stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  // Determine the branch color based on index
  const branchColors = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600', accent: 'bg-blue-500' },
    { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', accent: 'bg-green-500' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600', accent: 'bg-purple-500' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600', accent: 'bg-orange-500' },
  ];
  const colors = branchColors[choiceIndex % branchColors.length];

  return (
    <div className="relative">
      {/* Connection line from top */}
      <div className="absolute -top-4 left-1/2 w-px h-4 bg-border" />
      
      <Card className={`${colors.border} ${colors.bg} transition-all`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 px-4 cursor-pointer hover:bg-accent/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md ${colors.bg} flex items-center justify-center ${colors.text}`}>
                  {getIconComponent(choice.icon)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{choice.label}</span>
                    <Badge variant="outline" className={`text-xs ${colors.bg} ${colors.text} ${colors.border}`}>
                      <GitBranch className="w-3 h-3 mr-1" />
                      Branch {choiceIndex + 1}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {branchSteps.length} step{branchSteps.length !== 1 ? 's' : ''} → 
                    {choice.destinationType === 'verification' && ` ${VERIFICATION_TYPES.find(v => v.id === choice.verificationType)?.label || 'Verification'}`}
                    {choice.destinationType === 'step' && ` Step: ${availableDestinationSteps.find(s => s.id === choice.targetStepId)?.title || 'Select step'}`}
                    {choice.destinationType === 'next' && (stepsAfterDecision[0] ? ` ${stepsAfterDecision[0].title}` : ' Next step')}
                  </p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveChoice();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 space-y-4">
              {/* Branch Label & Description */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={choice.label}
                    onChange={(e) => onUpdateChoice({ label: e.target.value })}
                    placeholder="Branch label"
                    className="h-8 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Icon</Label>
                  <Select
                    value={choice.icon || 'document'}
                    onValueChange={(v) => onUpdateChoice({ icon: v as DecisionChoiceIcon })}
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

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={choice.description || ''}
                  onChange={(e) => onUpdateChoice({ description: e.target.value })}
                  placeholder="Describe this path..."
                  className="h-8 text-sm bg-background"
                />
              </div>

              {/* Branch Steps */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <ArrowDown className="w-3 h-3" />
                    Steps in this Branch
                  </Label>
                </div>

                {branchSteps.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground">
                    <p className="text-sm">No steps in this branch yet</p>
                    <p className="text-xs mt-1">Add steps that will run when this path is chosen</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {branchSteps.map((step, idx) => (
                      <FormStepCard
                        key={step.id}
                        step={step}
                        stepNumber={idx + 1}
                        totalSteps={branchSteps.length}
                        isExpanded={expandedSteps.has(step.id)}
                        allSteps={branchSteps}
                        demo={demo}
                        onToggleExpand={() => toggleExpand(step.id)}
                        onUpdateStep={(updates) => updateStep(step.id, updates)}
                        onRemoveStep={() => removeStep(step.id)}
                        onRemoveField={(fieldId) => removeField(step.id, fieldId)}
                        onToggleFieldRequired={(fieldId) => toggleFieldRequired(step.id, fieldId)}
                        onUpdateFieldLabel={(fieldId, label) => updateFieldLabel(step.id, fieldId, label)}
                        onUpdateFieldContent={(fieldId, content) => updateFieldContent(step.id, fieldId, content)}
                        canDelete={true}
                      />
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => setAddStepDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step to Branch
                </Button>

                <AddStepDialog
                  open={addStepDialogOpen}
                  onOpenChange={setAddStepDialogOpen}
                  onAddStep={handleAddStep}
                />
              </div>

              {/* Destination - Next Step Selection */}
              <div className="space-y-3 pt-3 border-t border-border">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  After Branch → Next Step
                </Label>

                <Select
                  value={choice.destinationType}
                  onValueChange={(v) => onUpdateChoice({ destinationType: v as 'verification' | 'step' | 'next' })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="next">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        <span>Continue to next step after decision</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="step">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        <span>Go to specific step</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="verification">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        <span>Go directly to verification</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Show which step "next" means */}
                {choice.destinationType === 'next' && stepsAfterDecision.length > 0 && (
                  <div className="px-3 py-2 rounded-md bg-muted/50 text-sm">
                    <span className="text-muted-foreground">Will go to: </span>
                    <span className="font-medium">{stepsAfterDecision[0]?.title || 'Next Step'}</span>
                  </div>
                )}

                {choice.destinationType === 'next' && stepsAfterDecision.length === 0 && (
                  <div className="px-3 py-2 rounded-md bg-amber-500/10 text-sm text-amber-700">
                    No steps after this decision. Add a step after the decision point to enable continuation.
                  </div>
                )}

                {choice.destinationType === 'verification' && (
                  <Select
                    value={choice.verificationType || 'docbio'}
                    onValueChange={(v) => onUpdateChoice({ 
                      verificationType: v as 'docbio' | 'databio' | 'dataonly' | 'did'
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

                {choice.destinationType === 'step' && (
                  <Select
                    value={choice.targetStepId || ''}
                    onValueChange={(v) => onUpdateChoice({ targetStepId: v })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select target step" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {availableDestinationSteps.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          Step {s.order}: {s.title}
                        </SelectItem>
                      ))}
                      {availableDestinationSteps.length === 0 && (
                        <div className="px-2 py-1 text-sm text-muted-foreground">No available steps</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
