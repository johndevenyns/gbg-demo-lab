import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DemoEnvironment, FormStep, StoredTestData } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { PathCondition } from '@/types/formBuilder';
import { Switch } from '@/components/ui/switch';
import { FormBuilderCanvas } from './FormBuilderCanvas';
import { TemplateSelector } from './TemplateSelector';
import { VerificationPathConfig } from './VerificationPathConfig';
import { ResultPagesConfig } from './ResultPagesConfig';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { StoredUserDataConfig } from './StoredUserDataConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutGrid, Settings2, Workflow, ExternalLink, RotateCcw, Bookmark, Users, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormBuilderSectionProps {
  demo: DemoEnvironment;
  onUpdate: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

export function FormBuilderSection({ demo, onUpdate }: FormBuilderSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('builder');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateRefreshTrigger, setTemplateRefreshTrigger] = useState(0);
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

  const handleApplyTemplate = useCallback((steps: FormStep[], templateName: string, formStyle?: FormStyleConfig) => {
    const updates: Partial<DemoEnvironment> = { formSteps: steps };
    if (formStyle) {
      updates.formStyle = formStyle;
    }
    onUpdate(updates);
    toast({
      title: 'Template Applied',
      description: `Applied "${templateName}" template with ${steps.length} step(s)`,
    });
  }, [onUpdate, toast]);

  const handleTemplateSaved = useCallback(() => {
    setTemplateRefreshTrigger(prev => prev + 1);
    // Switch to templates tab to show the saved template
    setActiveTab('templates');
  }, []);

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

  const handleUpdateGlobalResourceId = useCallback((value: string) => {
    onUpdate({ resourceId: value });
  }, [onUpdate]);

  const handleUpdateStoredTestData = useCallback((data: StoredTestData) => {
    // Include formStyle to ensure proper persistence (storedTestData is stored within formStyle JSON)
    onUpdate({ storedTestData: data, formStyle: demo.formStyle });
  }, [onUpdate, demo.formStyle]);

  const handleToggleFillButton = useCallback((type: 'pass' | 'fail', enabled: boolean) => {
    const currentData = demo.storedTestData || { passData: {}, failData: {} };
    const updatedData: StoredTestData = {
      ...currentData,
      showFillPassButton: type === 'pass' ? enabled : currentData.showFillPassButton,
      showFillFailButton: type === 'fail' ? enabled : currentData.showFillFailButton,
    };
    // Include formStyle to ensure proper persistence (storedTestData is stored within formStyle JSON)
    onUpdate({ storedTestData: updatedData, formStyle: demo.formStyle });
  }, [demo.storedTestData, demo.formStyle, onUpdate]);

  const showFillPass = demo.storedTestData?.showFillPassButton ?? false;
  const showFillFail = demo.storedTestData?.showFillFailButton ?? false;

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
            {/* Fill Button Toggles */}
            <div className="flex items-center gap-4 pr-4 border-r border-border">
              <div className="flex items-center gap-2">
                <Switch
                  id="fill-pass"
                  checked={showFillPass}
                  onCheckedChange={(v) => handleToggleFillButton('pass', v)}
                  className="data-[state=checked]:bg-green-500"
                />
                <label htmlFor="fill-pass" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Fill Pass
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="fill-fail"
                  checked={showFillFail}
                  onCheckedChange={(v) => handleToggleFillButton('fail', v)}
                  className="data-[state=checked]:bg-red-500"
                />
                <label htmlFor="fill-fail" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Fill Fail
                </label>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(true)}>
              <Bookmark className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetForm}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        formSteps={demo.formSteps}
        formStyle={demo.formStyle}
        onSaved={handleTemplateSaved}
      />
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
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
            <TabsTrigger value="testdata" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Test Data</span>
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
              refreshTrigger={templateRefreshTrigger}
            />
          </TabsContent>

          <TabsContent value="paths" className="mt-0">
            <VerificationPathConfig
              enabledPaths={enabledPaths}
              pathConditions={pathConditions}
              defaultPath={defaultPath}
              globalResourceId={demo.resourceId || ''}
              resourceIds={{
                resourceIdDocBio: demo.resourceIdDocBio || '',
                resourceIdDataBio: demo.resourceIdDataBio || '',
                resourceIdDataOnly: demo.resourceIdDataOnly || '',
              }}
              onTogglePath={handleTogglePath}
              onSetCondition={handleSetCondition}
              onSetDefaultPath={handleSetDefaultPath}
              onUpdateResourceId={handleUpdateResourceId}
              onUpdateGlobalResourceId={handleUpdateGlobalResourceId}
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

          <TabsContent value="testdata" className="mt-0">
            <StoredUserDataConfig
              storedTestData={demo.storedTestData}
              formSteps={demo.formSteps}
              onUpdate={handleUpdateStoredTestData}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
