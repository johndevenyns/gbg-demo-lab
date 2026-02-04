import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormStep, DecisionChoice, DemoEnvironment, DecisionStepConfig as DecisionStepConfigType } from '@/types/demo';
import { BranchCanvas } from './BranchCanvas';
import { 
  Plus, SplitSquareVertical, GitBranch, Settings2, GitMerge, ArrowDown
} from 'lucide-react';

interface DecisionBranchesViewProps {
  step: FormStep;
  allSteps: FormStep[];
  demo?: DemoEnvironment;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

// Get steps that come after this decision step
function getStepsAfterDecision(decisionStep: FormStep, allSteps: FormStep[]): FormStep[] {
  const decisionOrder = decisionStep.order;
  return allSteps
    .filter(s => s.order > decisionOrder && s.id !== decisionStep.id)
    .sort((a, b) => a.order - b.order);
}

// Analyze convergence - which branches lead to the same destination
function analyzeConvergence(choices: DecisionChoice[], allSteps: FormStep[]): {
  hasConvergence: boolean;
  convergenceGroups: Map<string, DecisionChoice[]>; // destination key -> choices that go there
  convergenceStep: FormStep | null; // The step where branches rejoin (if any)
} {
  const groups = new Map<string, DecisionChoice[]>();
  
  choices.forEach(choice => {
    let key: string;
    if (choice.destinationType === 'step' && choice.targetStepId) {
      key = `step:${choice.targetStepId}`;
    } else if (choice.destinationType === 'next') {
      key = 'next';
    } else if (choice.destinationType === 'verification') {
      key = `verification:${choice.verificationType || 'docbio'}`;
    } else {
      key = `unknown:${choice.id}`;
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(choice);
  });

  // Check if any group has more than one choice (convergence)
  let hasConvergence = false;
  let convergenceStep: FormStep | null = null;
  
  for (const [key, groupChoices] of groups.entries()) {
    if (groupChoices.length > 1) {
      hasConvergence = true;
      // If converging to a step, find it
      if (key.startsWith('step:')) {
        const stepId = key.replace('step:', '');
        convergenceStep = allSteps.find(s => s.id === stepId) || null;
      }
      break;
    }
  }
  
  // Also check if all branches go to 'next' - they all converge to the same next step
  if (choices.length > 1 && choices.every(c => c.destinationType === 'next')) {
    hasConvergence = true;
  }

  return { hasConvergence, convergenceGroups: groups, convergenceStep };
}

export function DecisionBranchesView({ step, allSteps, demo, onUpdateStep }: DecisionBranchesViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  
  const config = step.decisionStepConfig || {
    title: 'Choose Your Path',
    subtitle: 'Select how you would like to proceed',
    choices: [],
    defaultExpanded: true,
    showBackButton: true,
    backButtonLabel: 'Back',
  };

  // Get steps that come after this decision (for "next step" selection)
  const stepsAfterDecision = useMemo(() => 
    getStepsAfterDecision(step, allSteps), 
    [step, allSteps]
  );

  // Analyze if branches converge
  const convergenceInfo = useMemo(() => 
    analyzeConvergence(config.choices, allSteps),
    [config.choices, allSteps]
  );

  const handleConfigUpdate = (updates: Partial<DecisionStepConfigType>) => {
    onUpdateStep({
      decisionStepConfig: { ...config, ...updates }
    });
  };

  const handleAddChoice = () => {
    if (config.choices.length >= 4) return;
    
    const newChoice: DecisionChoice = {
      id: crypto.randomUUID(),
      label: `Path ${config.choices.length + 1}`,
      description: 'Description for this path',
      icon: 'document',
      collapsedByDefault: false,
      destinationType: 'next', // Default to "next step" for easier convergence
      verificationType: 'docbio',
      useCustomResultPages: false,
      mobileIdProviders: [],
      branchSteps: [],
    };
    
    handleConfigUpdate({ choices: [...config.choices, newChoice] });
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

  // Get the display name for the convergence point
  const getConvergenceLabel = () => {
    if (!convergenceInfo.hasConvergence) return null;
    
    const firstChoice = config.choices[0];
    if (!firstChoice) return null;
    
    if (firstChoice.destinationType === 'next') {
      const nextStep = stepsAfterDecision[0];
      return nextStep ? `→ ${nextStep.title}` : '→ Next Step';
    } else if (firstChoice.destinationType === 'step' && firstChoice.targetStepId) {
      const targetStep = allSteps.find(s => s.id === firstChoice.targetStepId);
      return targetStep ? `→ ${targetStep.title}` : '→ Selected Step';
    } else if (firstChoice.destinationType === 'verification') {
      return '→ Verification';
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Decision Header Card */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <SplitSquareVertical className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{config.title || 'Decision Point'}</span>
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                    {config.choices.length} branches
                  </Badge>
                  {convergenceInfo.hasConvergence && (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <GitMerge className="w-3 h-3 mr-1" />
                      Rejoins
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className={showSettings ? 'bg-accent' : ''}
            >
              <Settings2 className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </CardHeader>

        {showSettings && (
          <CardContent className="pt-0 pb-4 space-y-4 border-t border-amber-500/20">
            <div className="grid grid-cols-2 gap-4 pt-4">
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

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.showBackButton ?? true}
                  onCheckedChange={(v) => handleConfigUpdate({ showBackButton: v })}
                  className="scale-75"
                />
                <Label className="text-sm">Show back button</Label>
              </div>
              {config.showBackButton !== false && (
                <Input
                  value={config.backButtonLabel || 'Back'}
                  onChange={(e) => handleConfigUpdate({ backButtonLabel: e.target.value })}
                  placeholder="Back"
                  className="w-32 h-8 text-sm"
                />
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Branching Visualization */}
      <div className="relative">
        {/* Central connection line */}
        <div className="absolute top-0 left-1/2 w-px h-8 bg-amber-500/50" />
        
        {/* Split indicator */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 text-sm">
            <GitBranch className="w-4 h-4" />
            <span>User chooses a path</span>
          </div>
        </div>

        {/* Branch Cards Grid */}
        {config.choices.length === 0 ? (
          <div className="border-2 border-dashed border-amber-500/30 rounded-lg p-8 text-center text-muted-foreground mt-4">
            <SplitSquareVertical className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No branches configured</p>
            <p className="text-sm mt-1">Add up to 4 branches for users to choose from</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddChoice}
              className="mt-4 border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add First Branch
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Horizontal layout for branches */}
            <div className={`grid gap-4 ${
              config.choices.length === 1 ? 'grid-cols-1' :
              config.choices.length === 2 ? 'grid-cols-2' :
              config.choices.length === 3 ? 'grid-cols-3' :
              'grid-cols-2 lg:grid-cols-4'
            }`}>
              {config.choices.map((choice, idx) => (
                <BranchCanvas
                  key={choice.id}
                  choice={choice}
                  choiceIndex={idx}
                  allSteps={allSteps}
                  stepsAfterDecision={stepsAfterDecision}
                  demo={demo}
                  onUpdateChoice={(updates) => handleUpdateChoice(choice.id, updates)}
                  onRemoveChoice={() => handleRemoveChoice(choice.id)}
                />
              ))}
            </div>

            {/* Add Branch Button */}
            {config.choices.length < 4 && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleAddChoice}
                  className="border-dashed border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Branch ({config.choices.length}/4)
                </Button>
              </div>
            )}

            {/* Convergence Visualization */}
            {convergenceInfo.hasConvergence && config.choices.length > 1 && (
              <div className="relative pt-4">
                {/* Merge lines coming from branches */}
                <div className="flex justify-center mb-2">
                  <div className="flex items-center gap-2">
                    {config.choices.map((_, idx) => (
                      <div 
                        key={idx} 
                        className="w-px h-6 bg-emerald-500/50"
                        style={{ marginLeft: idx === 0 ? 0 : '2rem' }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Merge indicator */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700">
                    <GitMerge className="w-4 h-4" />
                    <span className="text-sm font-medium">Branches rejoin</span>
                    {getConvergenceLabel() && (
                      <span className="text-sm text-muted-foreground">{getConvergenceLabel()}</span>
                    )}
                  </div>
                </div>

                {/* Continuation line */}
                <div className="flex justify-center mt-2">
                  <ArrowDown className="w-5 h-5 text-emerald-500/50" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
