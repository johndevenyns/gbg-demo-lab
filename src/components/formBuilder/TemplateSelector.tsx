import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormStep, INDUSTRY_TEMPLATES, IndustryTemplate } from '@/types/demo';
import { MINIMAL_TEMPLATES, FormTemplate } from '@/types/formBuilder';
import { 
  Building2, Car, Gamepad2, HeartPulse, Shield, ShoppingBag, Wand2,
  Zap, ClipboardList, FileCheck, LayoutTemplate
} from 'lucide-react';

const INDUSTRY_ICONS: Record<IndustryTemplate, React.ReactNode> = {
  bank: <Building2 className="w-5 h-5" />,
  rental_car: <Car className="w-5 h-5" />,
  online_gambling: <Gamepad2 className="w-5 h-5" />,
  healthcare: <HeartPulse className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  retail: <ShoppingBag className="w-5 h-5" />,
  custom: <Wand2 className="w-5 h-5" />,
};

const MINIMAL_ICONS: Record<string, React.ReactNode> = {
  'quick-verify': <Zap className="w-5 h-5" />,
  'standard': <ClipboardList className="w-5 h-5" />,
  'full-kyc': <FileCheck className="w-5 h-5" />,
};

interface TemplateSelectorProps {
  currentTemplate?: IndustryTemplate;
  onApplyTemplate: (steps: FormStep[], templateName: string) => void;
}

export function TemplateSelector({ currentTemplate, onApplyTemplate }: TemplateSelectorProps) {
  const industryTemplateList = (Object.keys(INDUSTRY_TEMPLATES) as IndustryTemplate[]).map((key) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    ...INDUSTRY_TEMPLATES[key],
  }));

  const handleSelectIndustry = (templateId: IndustryTemplate) => {
    const template = INDUSTRY_TEMPLATES[templateId];
    if (template.formSteps) {
      const templateName = templateId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      onApplyTemplate(template.formSteps as FormStep[], templateName);
    }
  };

  const handleSelectMinimal = (template: FormTemplate) => {
    onApplyTemplate(template.steps, template.id);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5" />
          Form Templates
        </CardTitle>
        <CardDescription>
          Start with a pre-built template or build from scratch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="minimal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="minimal">Quick Start</TabsTrigger>
            <TabsTrigger value="industry">Industry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="minimal" className="space-y-3">
            {MINIMAL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectMinimal(template)}
                className="w-full p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    {MINIMAL_ICONS[template.id]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.steps.length} step{template.steps.length > 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="secondary" className="text-xs uppercase">
                        {template.verificationType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </TabsContent>
          
          <TabsContent value="industry" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {industryTemplateList.map((template) => {
                const isActive = currentTemplate === template.id;
                const stepCount = template.formSteps?.length || 0;
                
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectIndustry(template.id as IndustryTemplate)}
                    className={`
                      p-4 rounded-lg border transition-all text-left
                      ${isActive 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`
                        p-2 rounded-lg transition-colors
                        ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                      `}>
                        {INDUSTRY_ICONS[template.id]}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant="outline" className="text-xs">
                            {stepCount} step{stepCount > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <Badge variant="default" className="text-xs mt-2">
                        Current Template
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
