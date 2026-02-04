import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  LayoutList, Workflow, Plug, FileText, SplitSquareVertical
} from 'lucide-react';

export type StepTypeOption = 
  | 'form' 
  | 'verification'
  | 'decision'
  | 'api' 
  | 'page';

interface StepTypeInfo {
  id: StepTypeOption;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'form' | 'verification' | 'branching' | 'other';
}

const STEP_TYPES: StepTypeInfo[] = [
  {
    id: 'form',
    label: 'Form Fields',
    description: 'Collect user data with input fields',
    icon: <LayoutList className="w-5 h-5" />,
    category: 'form',
  },
  {
    id: 'verification',
    label: 'Verification',
    description: 'Identity verification step with configurable type (Doc+Bio, Data+Bio, Data Only, or mDL)',
    icon: <Workflow className="w-5 h-5" />,
    category: 'verification',
  },
  {
    id: 'decision',
    label: 'Decision / Branch',
    description: 'Let users choose a path (up to 4 options) with custom results per branch',
    icon: <SplitSquareVertical className="w-5 h-5" />,
    category: 'branching',
  },
  {
    id: 'api',
    label: 'API Call',
    description: 'Make an API request between steps',
    icon: <Plug className="w-5 h-5" />,
    category: 'other',
  },
  {
    id: 'page',
    label: 'Display Page',
    description: 'Show custom content with dynamic data',
    icon: <FileText className="w-5 h-5" />,
    category: 'other',
  },
];

interface AddStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStep: (type: StepTypeOption, title: string) => void;
}

export function AddStepDialog({ open, onOpenChange, onAddStep }: AddStepDialogProps) {
  const [selectedType, setSelectedType] = useState<StepTypeOption>('form');
  const [stepTitle, setStepTitle] = useState('');

  const handleSubmit = () => {
    const defaultTitles: Record<StepTypeOption, string> = {
      form: 'Form Step',
      verification: 'Identity Verification',
      decision: 'Choose Your Path',
      api: 'API Submission',
      page: 'Display Page',
    };
    
    const title = stepTitle.trim() || defaultTitles[selectedType];
    onAddStep(selectedType, title);
    setStepTitle('');
    setSelectedType('form');
    onOpenChange(false);
  };

  const formTypes = STEP_TYPES.filter(t => t.category === 'form');
  const verificationTypes = STEP_TYPES.filter(t => t.category === 'verification');
  const branchingTypes = STEP_TYPES.filter(t => t.category === 'branching');
  const otherTypes = STEP_TYPES.filter(t => t.category === 'other');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Step</DialogTitle>
          <DialogDescription>
            Choose the type of step you want to add to your form flow
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="step-title">Step Title (optional)</Label>
            <Input
              id="step-title"
              placeholder="Enter step title..."
              value={stepTitle}
              onChange={(e) => setStepTitle(e.target.value)}
            />
          </div>

          <RadioGroup
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as StepTypeOption)}
            className="space-y-4"
          >
            {/* Form Section */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Data Collection</h4>
              <div className="space-y-2">
                {formTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedType === type.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }
                    `}
                  >
                    <RadioGroupItem value={type.id} className="sr-only" />
                    <div className={`p-2 rounded-md ${selectedType === type.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Verification Section */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Verification
              </h4>
              <div className="space-y-2">
                {verificationTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedType === type.id 
                        ? 'border-cyan-500 bg-cyan-500/5' 
                        : 'border-border hover:border-cyan-500/50 hover:bg-accent/50'
                      }
                    `}
                  >
                    <RadioGroupItem value={type.id} className="sr-only" />
                    <div className={`p-2 rounded-md ${selectedType === type.id ? 'bg-cyan-500 text-white' : 'bg-cyan-500/10 text-cyan-600'}`}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Branching Section */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4" />
                Branching
              </h4>
              <div className="space-y-2">
                {branchingTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedType === type.id 
                        ? 'border-amber-500 bg-amber-500/5' 
                        : 'border-border hover:border-amber-500/50 hover:bg-accent/50'
                      }
                    `}
                  >
                    <RadioGroupItem value={type.id} className="sr-only" />
                    <div className={`p-2 rounded-md ${selectedType === type.id ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-600'}`}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Other Section */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Other Step Types</h4>
              <div className="space-y-2">
                {otherTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedType === type.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }
                    `}
                  >
                    <RadioGroupItem value={type.id} className="sr-only" />
                    <div className={`p-2 rounded-md ${selectedType === type.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Step
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
