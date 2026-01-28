import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormStep, INDUSTRY_TEMPLATES, IndustryTemplate } from '@/types/demo';
import { MINIMAL_TEMPLATES, FormTemplate } from '@/types/formBuilder';
import { FormStyleConfig } from '@/types/formStyle';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Car, Gamepad2, HeartPulse, Shield, ShoppingBag, Wand2,
  Zap, ClipboardList, FileCheck, LayoutTemplate, Bookmark, Loader2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

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

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  form_steps: FormStep[];
  form_style: FormStyleConfig | null;
  created_at: string;
}

interface TemplateSelectorProps {
  currentTemplate?: IndustryTemplate;
  onApplyTemplate: (steps: FormStep[], templateName: string, formStyle?: FormStyleConfig) => void;
  refreshTrigger?: number;
}

export function TemplateSelector({ currentTemplate, onApplyTemplate, refreshTrigger }: TemplateSelectorProps) {
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const industryTemplateList = (Object.keys(INDUSTRY_TEMPLATES) as IndustryTemplate[]).map((key) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    ...INDUSTRY_TEMPLATES[key],
  }));

  // Fetch saved templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedTemplates((data || []) as unknown as SavedTemplate[]);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [refreshTrigger]);

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

  const handleSelectSaved = (template: SavedTemplate) => {
    onApplyTemplate(
      template.form_steps,
      template.name,
      template.form_style || undefined
    );
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeletingId(templateId);
    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
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
        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="saved" className="relative">
              Saved
              {savedTemplates.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {savedTemplates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="minimal">Quick Start</TabsTrigger>
            <TabsTrigger value="industry">Industry</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No saved templates yet</p>
                <p className="text-sm mt-1">
                  Save your current form using the "Save as Template" button
                </p>
              </div>
            ) : (
              savedTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectSaved(template)}
                  className="w-full p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all text-left group relative"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold truncate">{template.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {template.form_steps?.length || 0} step{(template.form_steps?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                        {template.category !== 'custom' && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {template.category}
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Saved {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteTemplate(e, template.id)}
                      disabled={deletingId === template.id}
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </button>
              ))
            )}
          </TabsContent>
          
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
