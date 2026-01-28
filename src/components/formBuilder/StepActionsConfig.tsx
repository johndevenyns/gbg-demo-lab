import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormStep, StepButton, StepApiConfig } from '@/types/demo';
import { 
  ArrowRight, ArrowLeft, Send, Settings2, ChevronDown, ChevronUp,
  Plug, Eye
} from 'lucide-react';

const DEFAULT_BUTTONS: StepButton[] = [
  { id: 'back', enabled: true, label: 'Back' },
  { id: 'next', enabled: true, label: 'Next' },
  { id: 'submit', enabled: false, label: 'Submit' },
];

const BUTTON_ICONS: Record<string, React.ReactNode> = {
  back: <ArrowLeft className="w-4 h-4" />,
  next: <ArrowRight className="w-4 h-4" />,
  submit: <Send className="w-4 h-4" />,
};

interface StepActionsConfigProps {
  step: FormStep;
  stepNumber: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function StepActionsConfig({
  step,
  stepNumber,
  isFirstStep,
  isLastStep,
  onUpdateStep,
}: StepActionsConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get current buttons or use defaults
  const buttons = step.buttons || DEFAULT_BUTTONS;
  const apiConfig = step.apiConfig || { enabled: false };

  const handleButtonToggle = (buttonId: 'next' | 'back' | 'submit', enabled: boolean) => {
    const updatedButtons = buttons.map(btn =>
      btn.id === buttonId ? { ...btn, enabled } : btn
    );
    onUpdateStep({ buttons: updatedButtons });
  };

  const handleButtonLabelChange = (buttonId: 'next' | 'back' | 'submit', label: string) => {
    const updatedButtons = buttons.map(btn =>
      btn.id === buttonId ? { ...btn, label } : btn
    );
    onUpdateStep({ buttons: updatedButtons });
  };

  const handleApiToggle = (enabled: boolean) => {
    onUpdateStep({
      apiConfig: { ...apiConfig, enabled }
    });
  };

  const handleApiFieldsChange = (fields: string) => {
    const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean);
    onUpdateStep({
      apiConfig: { ...apiConfig, includeFields: fieldList.length > 0 ? fieldList : undefined }
    });
  };

  const handleResponseDisplayChange = (fields: string) => {
    const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean);
    onUpdateStep({
      apiConfig: { ...apiConfig, responseDisplayFields: fieldList.length > 0 ? fieldList : undefined }
    });
  };

  const backButton = buttons.find(b => b.id === 'back') || DEFAULT_BUTTONS[0];
  const nextButton = buttons.find(b => b.id === 'next') || DEFAULT_BUTTONS[1];
  const submitButton = buttons.find(b => b.id === 'submit') || DEFAULT_BUTTONS[2];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between px-3 py-2 h-auto">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Step {stepNumber} Actions</span>
            <div className="flex gap-1">
              {backButton.enabled && !isFirstStep && (
                <Badge variant="outline" className="text-xs">{backButton.label}</Badge>
              )}
              {nextButton.enabled && !isLastStep && (
                <Badge variant="outline" className="text-xs">{nextButton.label}</Badge>
              )}
              {submitButton.enabled && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                  {submitButton.label}
                </Badge>
              )}
              {apiConfig.enabled && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <Plug className="w-3 h-3 mr-1" />
                  API
                </Badge>
              )}
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-3 pb-3 pt-2 space-y-4">
        {/* Buttons Configuration */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Navigation Buttons
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Back Button */}
            <div className={`p-3 rounded-lg border ${isFirstStep ? 'opacity-50' : ''} ${backButton.enabled && !isFirstStep ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {BUTTON_ICONS.back}
                  <span className="text-sm font-medium">Back</span>
                </div>
                <Switch
                  checked={backButton.enabled && !isFirstStep}
                  onCheckedChange={(v) => handleButtonToggle('back', v)}
                  disabled={isFirstStep}
                  className="scale-75"
                />
              </div>
              {backButton.enabled && !isFirstStep && (
                <Input
                  value={backButton.label}
                  onChange={(e) => handleButtonLabelChange('back', e.target.value)}
                  placeholder="Back"
                  className="h-8 text-sm"
                />
              )}
              {isFirstStep && (
                <p className="text-xs text-muted-foreground">First step - no back</p>
              )}
            </div>
            
            {/* Next Button */}
            <div className={`p-3 rounded-lg border ${isLastStep ? 'opacity-50' : ''} ${nextButton.enabled && !isLastStep ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {BUTTON_ICONS.next}
                  <span className="text-sm font-medium">Next</span>
                </div>
                <Switch
                  checked={nextButton.enabled && !isLastStep}
                  onCheckedChange={(v) => handleButtonToggle('next', v)}
                  disabled={isLastStep}
                  className="scale-75"
                />
              </div>
              {nextButton.enabled && !isLastStep && (
                <Input
                  value={nextButton.label}
                  onChange={(e) => handleButtonLabelChange('next', e.target.value)}
                  placeholder="Next"
                  className="h-8 text-sm"
                />
              )}
              {isLastStep && (
                <p className="text-xs text-muted-foreground">Last step - use submit</p>
              )}
            </div>
            
            {/* Submit Button */}
            <div className={`p-3 rounded-lg border ${submitButton.enabled ? 'border-blue-500/30 bg-blue-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {BUTTON_ICONS.submit}
                  <span className="text-sm font-medium">Submit</span>
                </div>
                <Switch
                  checked={submitButton.enabled}
                  onCheckedChange={(v) => handleButtonToggle('submit', v)}
                  className="scale-75"
                />
              </div>
              {submitButton.enabled && (
                <Input
                  value={submitButton.label}
                  onChange={(e) => handleButtonLabelChange('submit', e.target.value)}
                  placeholder="Submit"
                  className="h-8 text-sm"
                />
              )}
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Plug className="w-3 h-3" />
              API Submission
            </Label>
            <Switch
              checked={apiConfig.enabled}
              onCheckedChange={handleApiToggle}
              className="scale-75"
            />
          </div>
          
          {apiConfig.enabled && (
            <div className="space-y-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="space-y-2">
                <Label className="text-sm">Fields to Submit</Label>
                <Input
                  value={apiConfig.includeFields?.join(', ') || ''}
                  onChange={(e) => handleApiFieldsChange(e.target.value)}
                  placeholder="Leave empty for all step fields"
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated field names. Empty = all fields from this step.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Eye className="w-3 h-3" />
                  Response Fields to Display
                </Label>
                <Input
                  value={apiConfig.responseDisplayFields?.join(', ') || ''}
                  onChange={(e) => handleResponseDisplayChange(e.target.value)}
                  placeholder="e.g., referenceId, status, transactionId"
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  API response fields to show in the UI after submission.
                </p>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
