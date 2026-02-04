import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormStep, DecisionChoice, DemoEnvironment, DecisionStepConfig as DecisionStepConfigType, AVAILABLE_MDL_PROVIDERS } from '@/types/demo';
import { BranchCanvas } from './BranchCanvas';
import { 
  Plus, SplitSquareVertical, GitBranch, Settings2
} from 'lucide-react';

interface DecisionBranchesViewProps {
  step: FormStep;
  allSteps: FormStep[];
  demo?: DemoEnvironment;
  onUpdateStep: (updates: Partial<FormStep>) => void;
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
      destinationType: 'verification',
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
          <div className="mt-4 space-y-6">
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
          </div>
        )}
      </div>
    </div>
  );
}
