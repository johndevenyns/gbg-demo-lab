import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormStep } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { Check } from 'lucide-react';

export interface TemplatePreviewData {
  name: string;
  description?: string;
  steps: FormStep[];
  formStyle?: FormStyleConfig;
  fillDefaults?: { showFillPass: boolean; showFillFail: boolean };
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplatePreviewData | null;
  onApply: (template: TemplatePreviewData) => void;
}

export function TemplatePreviewDialog({ open, onOpenChange, template, onApply }: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Preview: {template.name}
            <Badge variant="outline" className="text-xs">
              {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            {template.steps.map((step, idx) => (
              <div key={step.id || idx} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">Step {idx + 1}</Badge>
                  <h4 className="font-semibold text-sm">{step.title || `Step ${idx + 1}`}</h4>
                  {(step as any).type && (
                    <Badge variant="outline" className="text-xs capitalize">{(step as any).type}</Badge>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-muted-foreground mb-3">{step.description}</p>
                )}
                {step.fields && step.fields.length > 0 ? (
                  <ul className="space-y-1.5">
                    {step.fields.map((field) => (
                      <li key={field.id} className="flex items-center gap-2 text-sm">
                        <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{field.label}</span>
                        <span className="text-xs text-muted-foreground">({field.type})</span>
                        {field.required && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">required</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No fields</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(template);
              onOpenChange(false);
            }}
          >
            Apply this template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}