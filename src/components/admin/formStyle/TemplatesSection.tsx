import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate } from 'lucide-react';
import { FormStyleConfig, FormStyleTemplate, FORM_STYLE_TEMPLATES } from '@/types/formStyle';

interface TemplatesSectionProps {
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  isActive: boolean;
}

export function TemplatesSection({
  formStyle,
  onUpdateStyle,
  isActive,
}: TemplatesSectionProps) {
  const applyTemplate = (template: FormStyleTemplate) => {
    onUpdateStyle({
      ...template.style,
      source: 'template',
      templateId: template.id,
    });
  };

  const hasTemplateSelected = formStyle.source === 'template' && formStyle.templateId;
  const activeTemplate = FORM_STYLE_TEMPLATES.find(t => t.id === formStyle.templateId);

  return (
    <Card className={isActive ? 'border-2 border-primary/30 bg-primary/5' : 'border-border'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutTemplate className={isActive ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-muted-foreground'} />
          Style Templates
          {isActive && <Badge variant="default" className="ml-2">Active</Badge>}
          {hasTemplateSelected && !isActive && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
              {activeTemplate?.name || 'Selected'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Choose from pre-designed form styles for quick setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FORM_STYLE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className={`p-3 rounded-lg border-2 text-left transition-all hover:border-primary/50 ${
                formStyle.source === 'template' && formStyle.templateId === template.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </div>
                {formStyle.source === 'template' && formStyle.templateId === template.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: template.preview.primaryColor }}
                  title="Primary color"
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: template.preview.bgColor }}
                  title="Background color"
                />
                <div
                  className="flex-1 h-6 rounded border flex items-center px-2 text-[10px]"
                  style={{
                    backgroundColor: template.style.inputBgColor,
                    color: template.style.inputTextColor,
                    borderColor: template.style.inputBorderColor,
                    fontFamily: template.style.fontFamily,
                  }}
                >
                  Input
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
