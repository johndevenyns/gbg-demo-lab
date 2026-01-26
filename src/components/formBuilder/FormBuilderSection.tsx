import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoEnvironment, FormStep } from '@/types/demo';
import { PathCondition } from '@/types/formBuilder';
import { FormBuilderCanvas } from './FormBuilderCanvas';
import { TemplateSelector } from './TemplateSelector';
import { VerificationPathConfig } from './VerificationPathConfig';
import { ResultPagesConfig } from './ResultPagesConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutGrid, Settings2, Workflow, ExternalLink, Save, RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormBuilderSectionProps {
  demo: DemoEnvironment;
  onUpdate: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

export function FormBuilderSection({ demo, onUpdate }: FormBuilderSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('builder');
  
  // Local state for verification paths
  const [enabledPaths, setEnabledPaths] = useState<string[]>(['docbio', 'databio']);
  const [pathConditions, setPathConditions] = useState<Record<string, PathCondition>>({
    docbio: 'always',
    databio: 'document_available',
    dataonly: 'always',
    mdl: 'mobile_detected',
  });
  const [defaultPath, setDefaultPath] = useState<string>('docbio');

  const handleUpdateSteps = useCallback((steps: FormStep[]) => {
    onUpdate({ formSteps: steps });
  }, [onUpdate]);

  const handleApplyTemplate = useCallback((steps: FormStep[], templateName: string) => {
    onUpdate({ formSteps: steps });
    toast({
      title: 'Template Applied',
      description: `Applied "${templateName}" template with ${steps.length} step(s)`,
    });
  }, [onUpdate, toast]);

  const handleTogglePath = useCallback((pathId: string) => {
    setEnabledPaths(prev => {
      if (prev.includes(pathId)) {
        // Don't allow disabling the last path
        if (prev.length === 1) return prev;
        // If disabling the default, set a new default
        if (defaultPath === pathId) {
          const remaining = prev.filter(p => p !== pathId);
          setDefaultPath(remaining[0]);
        }
        return prev.filter(p => p !== pathId);
      }
      return [...prev, pathId];
    });
  }, [defaultPath]);

  const handleSetCondition = useCallback((pathId: string, condition: PathCondition) => {
    setPathConditions(prev => ({ ...prev, [pathId]: condition }));
  }, []);

  const handleSetDefaultPath = useCallback((pathId: string) => {
    setDefaultPath(pathId);
  }, []);

  const handleUpdateResourceId = useCallback((field: 'resourceIdDocBio' | 'resourceIdDataBio' | 'resourceIdDataOnly', value: string) => {
    onUpdate({ [field]: value });
  }, [onUpdate]);

  const handleResetForm = useCallback(() => {
    if (confirm('Are you sure you want to reset all form steps? This cannot be undone.')) {
      onUpdate({
        formSteps: [{
          id: crypto.randomUUID(),
          title: 'Step 1',
          order: 1,
          fields: [],
        }],
      });
      toast({
        title: 'Form Reset',
        description: 'All steps and fields have been cleared',
      });
    }
  }, [onUpdate, toast]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Application Form Builder
            </CardTitle>
            <CardDescription>
              Design your multi-step verification application flow
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetForm}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Form Builder</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              <span className="hidden sm:inline">Paths</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-0">
            <FormBuilderCanvas
              steps={demo.formSteps}
              onUpdateSteps={handleUpdateSteps}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <TemplateSelector
              currentTemplate={demo.industryTemplate}
              onApplyTemplate={handleApplyTemplate}
            />
          </TabsContent>

          <TabsContent value="paths" className="mt-0">
            <VerificationPathConfig
              enabledPaths={enabledPaths}
              pathConditions={pathConditions}
              defaultPath={defaultPath}
              resourceIds={{
                resourceIdDocBio: demo.resourceIdDocBio || '',
                resourceIdDataBio: demo.resourceIdDataBio || '',
                resourceIdDataOnly: demo.resourceIdDataOnly || '',
              }}
              onTogglePath={handleTogglePath}
              onSetCondition={handleSetCondition}
              onSetDefaultPath={handleSetDefaultPath}
              onUpdateResourceId={handleUpdateResourceId}
            />
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <ResultPagesConfig
              approvedUrl={demo.approvedUrl || ''}
              rejectedUrl={demo.rejectedUrl || ''}
              returnUrl={demo.returnUrl}
              onUpdateApprovedUrl={(url) => onUpdate({ approvedUrl: url })}
              onUpdateRejectedUrl={(url) => onUpdate({ rejectedUrl: url })}
              onUpdateReturnUrl={(url) => onUpdate({ returnUrl: url })}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
