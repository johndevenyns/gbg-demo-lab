import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DemoEnvironment, FormStep, StoredTestData } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { PathCondition } from '@/types/formBuilder';
import { Switch } from '@/components/ui/switch';
import { FormBuilderCanvas } from './FormBuilderCanvas';
import { TemplateSelector } from './TemplateSelector';
import { VerificationPathConfig } from './VerificationPathConfig';

import { SaveTemplateDialog } from './SaveTemplateDialog';
import { StoredUserDataConfig } from './StoredUserDataConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutGrid, Settings2, Workflow, RotateCcw, Bookmark, Users,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTestProfiles } from '@/hooks/useTestProfiles';

interface FormBuilderSectionProps {
  demo: DemoEnvironment;
  onUpdate: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

export function FormBuilderSection({ demo, onUpdate }: FormBuilderSectionProps) {
  const { toast } = useToast();
  const { data: globalProfiles = [] } = useTestProfiles();
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

  const handleApplyTemplate = useCallback((steps: FormStep[], templateName: string, formStyle?: FormStyleConfig, fillDefaults?: { showFillPass: boolean; showFillFail: boolean }) => {
    const updates: Partial<DemoEnvironment> = { formSteps: steps };
    if (formStyle) {
      updates.formStyle = formStyle;
    }
    if (fillDefaults) {
      updates.storedTestData = {
        ...demo.storedTestData,
        passData: demo.storedTestData?.passData || {},
        failData: demo.storedTestData?.failData || {},
        showFillPassButton: fillDefaults.showFillPass,
        showFillFailButton: fillDefaults.showFillFail,
      };
    }
    onUpdate(updates);
    toast({
      title: 'Template Applied',
      description: `Applied "${templateName}" template with ${steps.length} step(s)`,
    });
  }, [onUpdate, toast, demo.storedTestData]);

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
    onUpdate({ storedTestData: data });
  }, [onUpdate]);

  const handleToggleFillButton = useCallback((type: 'pass' | 'fail', enabled: boolean) => {
    // Pull defaults from global profiles
    const firstPass = globalProfiles.find((p) => p.profile_type === 'pass');
    const firstFail = globalProfiles.find((p) => p.profile_type === 'fail');
    const defaultPassData: Record<string, string> = firstPass?.field_data ?? {};
    const defaultFailData: Record<string, string> = firstFail?.field_data ?? {};
    
    const currentData = demo.storedTestData || { passData: {}, failData: {} };
    
    // When enabling, populate with defaults if data is empty
    let updatedPassData = currentData.passData;
    let updatedFailData = currentData.failData;
    
    if (enabled && type === 'pass' && (!currentData.passData || Object.keys(currentData.passData).length === 0)) {
      updatedPassData = defaultPassData;
    }
    if (enabled && type === 'fail' && (!currentData.failData || Object.keys(currentData.failData).length === 0)) {
      updatedFailData = defaultFailData;
    }
    
    const updatedData: StoredTestData = {
      ...currentData,
      passData: updatedPassData,
      failData: updatedFailData,
      showFillPassButton: type === 'pass' ? enabled : currentData.showFillPassButton,
      showFillFailButton: type === 'fail' ? enabled : currentData.showFillFailButton,
    };
    onUpdate({ storedTestData: updatedData });
  }, [demo.storedTestData, onUpdate, globalProfiles]);

  // Auto-sync stored test data from global profiles when profiles load/change
  const syncedProfilesRef = useRef<string | null>(null);
  useEffect(() => {
    if (globalProfiles.length === 0) return;
    const showPass = demo.storedTestData?.showFillPassButton === true;
    const showFail = demo.storedTestData?.showFillFailButton === true;
    if (!showPass && !showFail) return;

    // Build a fingerprint to avoid unnecessary updates
    const fingerprint = JSON.stringify(globalProfiles.map(p => ({ id: p.id, updated: p.updated_at })));
    if (syncedProfilesRef.current === fingerprint) return;
    syncedProfilesRef.current = fingerprint;

    const firstPass = globalProfiles.find((p) => p.profile_type === 'pass');
    const firstFail = globalProfiles.find((p) => p.profile_type === 'fail');

    const currentData = demo.storedTestData || { passData: {}, failData: {} };
    let needsUpdate = false;
    let updatedPassData = currentData.passData;
    let updatedFailData = currentData.failData;

    if (showPass && firstPass) {
      const profileData = firstPass.field_data as Record<string, string>;
      if (JSON.stringify(updatedPassData) !== JSON.stringify(profileData)) {
        updatedPassData = profileData;
        needsUpdate = true;
      }
    }
    if (showFail && firstFail) {
      const profileData = firstFail.field_data as Record<string, string>;
      if (JSON.stringify(updatedFailData) !== JSON.stringify(profileData)) {
        updatedFailData = profileData;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      onUpdate({ storedTestData: { ...currentData, passData: updatedPassData, failData: updatedFailData } });
    }
  }, [globalProfiles, demo.storedTestData, onUpdate]);

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
              Workflow Builder
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
                  className="scale-90"
                />
                <label htmlFor="fill-pass" className="text-xs font-medium text-muted-foreground cursor-pointer">
                  Pass
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="fill-fail"
                  checked={showFillFail}
                  onCheckedChange={(v) => handleToggleFillButton('fail', v)}
                  className="scale-90"
                />
                <label htmlFor="fill-fail" className="text-xs font-medium text-muted-foreground cursor-pointer">
                  Fail
                </label>
              </div>
              {/* Position selector - only show if at least one button is enabled */}
              {(showFillPass || showFillFail) && (
                <div className="flex items-center border rounded-md overflow-hidden ml-2">
                  <button
                    type="button"
                    className={`p-1.5 transition-colors ${
                      (demo.storedTestData?.buttonPosition || 'right') === 'left' 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    onClick={() => onUpdate({ 
                      storedTestData: { 
                        ...demo.storedTestData, 
                        passData: demo.storedTestData?.passData || {}, 
                        failData: demo.storedTestData?.failData || {},
                        buttonPosition: 'left' 
                      } 
                    })}
                    title="Align left"
                  >
                    <AlignLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    className={`p-1.5 border-x transition-colors ${
                      demo.storedTestData?.buttonPosition === 'center' 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    onClick={() => onUpdate({ 
                      storedTestData: { 
                        ...demo.storedTestData, 
                        passData: demo.storedTestData?.passData || {}, 
                        failData: demo.storedTestData?.failData || {},
                        buttonPosition: 'center' 
                      } 
                    })}
                    title="Align center"
                  >
                    <AlignCenter className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    className={`p-1.5 transition-colors ${
                      (demo.storedTestData?.buttonPosition || 'right') === 'right' 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    onClick={() => onUpdate({ 
                      storedTestData: { 
                        ...demo.storedTestData, 
                        passData: demo.storedTestData?.passData || {}, 
                        failData: demo.storedTestData?.failData || {},
                        buttonPosition: 'right' 
                      } 
                    })}
                    title="Align right"
                  >
                    <AlignRight className="w-3 h-3" />
                  </button>
                </div>
              )}
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
        showFillPass={showFillPass}
        showFillFail={showFillFail}
        onSaved={handleTemplateSaved}
      />
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Workflow Builder</span>
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              <span className="hidden sm:inline">Verification Types</span>
            </TabsTrigger>
            <TabsTrigger value="testdata" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Test Data</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-0">
            <FormBuilderCanvas
              steps={demo.formSteps}
              onUpdateSteps={handleUpdateSteps}
              demo={demo}
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
