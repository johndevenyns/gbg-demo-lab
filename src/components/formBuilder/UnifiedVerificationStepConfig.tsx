import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StepCompletionActionsConfig } from './StepCompletionActionsConfig';
import { useAdminResourceIdsForUser } from '@/hooks/useAdminResourceIds';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormStep, DemoEnvironment, DecisionChoiceIcon } from '@/types/demo';
import { 
  UnifiedVerificationConfig, 
  VerificationTypeOverride, 
  VerificationMethodSelection,
  VerificationTypeConfig,
  DidProvider,
  UserSelectionChoice,
  SelectionIconType,
  UserSelectionScreen,
} from '@/types/verification';
import { useVerificationTypes, useDidProviders } from '@/hooks/useVerificationAdmin';
import { 
  FileText, UserCheck, Database, Smartphone, QrCode, Activity, Clock, Settings2,
  ChevronRight, Check, AlertCircle, Loader2, ChevronDown, ChevronUp, GripVertical,
  Shield, User, Fingerprint, Camera, CreditCard
} from 'lucide-react';

// Icon mapping for verification types
const TYPE_ICONS: Record<string, React.ReactNode> = {
  docbio: <FileText className="w-5 h-5" />,
  databio: <UserCheck className="w-5 h-5" />,
  dataonly: <Database className="w-5 h-5" />,
  did: <Smartphone className="w-5 h-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  docbio: 'data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-700 data-[state=on]:border-purple-500',
  databio: 'data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-700 data-[state=on]:border-blue-500',
  dataonly: 'data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-700 data-[state=on]:border-cyan-500',
  did: 'data-[state=on]:bg-green-500/20 data-[state=on]:text-green-700 data-[state=on]:border-green-500',
};

const ACCORDION_COLORS: Record<string, string> = {
  docbio: 'border-purple-500/30 bg-purple-500/5',
  databio: 'border-blue-500/30 bg-blue-500/5',
  dataonly: 'border-cyan-500/30 bg-cyan-500/5',
  did: 'border-green-500/30 bg-green-500/5',
};

const ICON_OPTIONS: { id: DecisionChoiceIcon; label: string; icon: React.ReactNode }[] = [
  { id: 'document', label: 'Document', icon: <FileText className="w-4 h-4" /> },
  { id: 'smartphone', label: 'Smartphone', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
  { id: 'shield', label: 'Shield', icon: <Shield className="w-4 h-4" /> },
  { id: 'user', label: 'User', icon: <User className="w-4 h-4" /> },
  { id: 'fingerprint', label: 'Fingerprint', icon: <Fingerprint className="w-4 h-4" /> },
  { id: 'camera', label: 'Camera', icon: <Camera className="w-4 h-4" /> },
  { id: 'id-card', label: 'ID Card', icon: <CreditCard className="w-4 h-4" /> },
];

const getIconComponent = (iconId?: DecisionChoiceIcon) => {
  const iconOption = ICON_OPTIONS.find(i => i.id === iconId);
  return iconOption?.icon || <FileText className="w-4 h-4" />;
};

const DEFAULT_CONFIG: UnifiedVerificationConfig = {
  methodSelection: 'admin_preselect',
  enabledTypes: ['docbio'],
  typeConfigs: {},
  successDestination: 'default',
  failureDestination: 'default',
  showBackButton: true,
  backButtonLabel: 'Back',
  showNextButton: false,
  nextButtonLabel: 'Continue',
  userSelectionScreen: {
    title: 'Choose Verification Method',
    subtitle: 'Select how you would like to verify your identity',
    showDescriptions: true,
    choices: [],
  },
};

interface UnifiedVerificationStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
  demo?: DemoEnvironment;
}

export function UnifiedVerificationStepConfig({ step, onUpdateStep, demo }: UnifiedVerificationStepConfigProps) {
  const { data: verificationTypes = [], isLoading: typesLoading } = useVerificationTypes(true);
  const { data: didProviders = [], isLoading: providersLoading } = useDidProviders(true);
  const { data: adminResourceIds = [] } = useAdminResourceIdsForUser(demo?.createdBy);
  
  // Get config from step or use defaults, ensuring all required arrays exist
  const rawConfig = step.unifiedVerificationConfig || DEFAULT_CONFIG;
  const config: UnifiedVerificationConfig = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    enabledTypes: rawConfig.enabledTypes || (rawConfig as any).enabledMethods || DEFAULT_CONFIG.enabledTypes,
    typeConfigs: rawConfig.typeConfigs || {},
  };
  
  // Track which accordion panel is open (single open at a time for accordion style)
  const [openPanel, setOpenPanel] = useState<string | undefined>(
    config.enabledTypes.length > 0 ? config.enabledTypes[0] : undefined
  );

  const handleConfigUpdate = (updates: Partial<UnifiedVerificationConfig>) => {
    onUpdateStep({
      unifiedVerificationConfig: { ...config, ...updates }
    });
  };

  const handleTypeToggle = (typeKeys: string[]) => {
    // Ensure at least one type is always selected
    if (typeKeys.length === 0) return;
    
    // Update enabled types and set the first newly added type as open
    const newTypes = typeKeys.filter(t => !config.enabledTypes.includes(t));
    if (newTypes.length > 0) {
      setOpenPanel(newTypes[0]);
    }
    
    // Auto-generate user selection choices for new types
    const existingChoiceKeys = config.userSelectionScreen?.choices.map(c => c.typeKey) || [];
    const newChoices = newTypes
      .filter(typeKey => !existingChoiceKeys.includes(typeKey))
      .map(typeKey => {
        const globalType = verificationTypes.find(t => t.typeKey === typeKey);
        return {
          typeKey,
          label: globalType?.displayName || typeKey,
          description: globalType?.description || '',
          icon: getDefaultIcon(typeKey),
          collapsedByDefault: false,
        };
      });
    
    // Remove choices for types that were deselected
    const updatedChoices = [
      ...(config.userSelectionScreen?.choices.filter(c => typeKeys.includes(c.typeKey)) || []),
      ...newChoices,
    ];
    
    handleConfigUpdate({ 
      enabledTypes: typeKeys,
      userSelectionScreen: {
        ...config.userSelectionScreen,
        title: config.userSelectionScreen?.title || 'Choose Verification Method',
        subtitle: config.userSelectionScreen?.subtitle || 'Select how you would like to verify your identity',
        showDescriptions: config.userSelectionScreen?.showDescriptions ?? true,
        choices: updatedChoices,
      }
    });
  };

  const getDefaultIcon = (typeKey: string): SelectionIconType => {
    switch (typeKey) {
      case 'docbio': return 'document';
      case 'databio': return 'fingerprint';
      case 'dataonly': return 'database';
      case 'did': return 'smartphone';
      default: return 'document';
    }
  };

  const handleTypeConfigUpdate = (typeKey: string, updates: Partial<VerificationTypeOverride>) => {
    const currentTypeConfig = config.typeConfigs[typeKey] || {};
    handleConfigUpdate({
      typeConfigs: {
        ...config.typeConfigs,
        [typeKey]: { ...currentTypeConfig, ...updates }
      }
    });
  };

  const handleUserSelectionUpdate = (updates: Partial<UserSelectionScreen>) => {
    handleConfigUpdate({
      userSelectionScreen: {
        ...config.userSelectionScreen,
        title: config.userSelectionScreen?.title || 'Choose Verification Method',
        subtitle: config.userSelectionScreen?.subtitle || 'Select how you would like to verify your identity',
        showDescriptions: config.userSelectionScreen?.showDescriptions ?? true,
        choices: config.userSelectionScreen?.choices || [],
        ...updates,
      }
    });
  };

  const handleChoiceUpdate = (typeKey: string, updates: Partial<UserSelectionChoice>) => {
    const currentChoices = config.userSelectionScreen?.choices || [];
    const updatedChoices = currentChoices.map(c => 
      c.typeKey === typeKey ? { ...c, ...updates } : c
    );
    handleUserSelectionUpdate({ choices: updatedChoices });
  };

  const getTypeConfig = (typeKey: string): VerificationTypeOverride => {
    return config.typeConfigs[typeKey] || {};
  };

  const getGlobalTypeInfo = (typeKey: string): VerificationTypeConfig | undefined => {
    return verificationTypes.find(t => t.typeKey === typeKey);
  };

  if (typesLoading || providersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading verification configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Method Selection Mode */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Verification Method Selection
          </Label>
          
          <RadioGroup
            value={config.methodSelection}
            onValueChange={(v) => handleConfigUpdate({ methodSelection: v as VerificationMethodSelection })}
            className="space-y-2"
          >
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <RadioGroupItem value="admin_preselect" id="admin_preselect" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="admin_preselect" className="font-medium cursor-pointer">
                  Admin Pre-selects
                </Label>
                <p className="text-sm text-muted-foreground">
                  System uses the first enabled verification type automatically
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <RadioGroupItem value="user_choice" id="user_choice" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="user_choice" className="font-medium cursor-pointer">
                  User Chooses
                </Label>
                <p className="text-sm text-muted-foreground">
                  User sees a selection screen to pick their verification method
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <RadioGroupItem value="auto_detect" id="auto_detect" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto_detect" className="font-medium cursor-pointer">
                  Auto-detect (Web/Mobile)
                </Label>
                <p className="text-sm text-muted-foreground">
                  System automatically chooses based on device type
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* User Selection Screen Configuration - only when user_choice is selected */}
      {config.methodSelection === 'user_choice' && config.enabledTypes.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Selection Screen Configuration
            </Label>
            
            {/* Screen Title and Subtitle */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Title</Label>
                <Input
                  value={config.userSelectionScreen?.title || ''}
                  onChange={(e) => handleUserSelectionUpdate({ title: e.target.value })}
                  placeholder="Choose Verification Method"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Subtitle</Label>
                <Input
                  value={config.userSelectionScreen?.subtitle || ''}
                  onChange={(e) => handleUserSelectionUpdate({ subtitle: e.target.value })}
                  placeholder="Select how you would like to verify..."
                  className="bg-background"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-primary/20">
              <Switch
                checked={config.userSelectionScreen?.showDescriptions ?? true}
                onCheckedChange={(v) => handleUserSelectionUpdate({ showDescriptions: v })}
                className="scale-75"
              />
              <Label className="text-sm">Show expanded descriptions by default</Label>
            </div>

            {/* Choice Cards Configuration */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Choice Cards ({config.enabledTypes.length})
              </Label>
              
              {config.userSelectionScreen?.choices.map((choice) => {
                const globalType = getGlobalTypeInfo(choice.typeKey);
                if (!globalType) return null;
                
                return (
                  <Collapsible key={choice.typeKey}>
                    <Card className="border-border overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                            {getIconComponent(choice.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{choice.label || globalType.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {choice.description || globalType.description}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${ACCORDION_COLORS[choice.typeKey] || ''}`}>
                            {choice.typeKey}
                          </Badge>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 space-y-3 border-t border-border">
                          {/* Label and Icon */}
                          <div className="grid grid-cols-2 gap-3 pt-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Label</Label>
                              <Input
                                value={choice.label}
                                onChange={(e) => handleChoiceUpdate(choice.typeKey, { label: e.target.value })}
                                placeholder={globalType.displayName}
                                className="h-8 text-sm bg-background"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Icon</Label>
                              <Select
                                value={choice.icon || 'document'}
                                onValueChange={(v) => handleChoiceUpdate(choice.typeKey, { icon: v as SelectionIconType })}
                              >
                                <SelectTrigger className="h-8 text-sm bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background border z-50">
                                  {ICON_OPTIONS.map(icon => (
                                    <SelectItem key={icon.id} value={icon.id}>
                                      <div className="flex items-center gap-2">
                                        {icon.icon}
                                        <span>{icon.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-2">
                            <Label className="text-sm">Description</Label>
                            <Textarea
                              value={choice.description || ''}
                              onChange={(e) => handleChoiceUpdate(choice.typeKey, { description: e.target.value })}
                              placeholder={globalType.description || 'Describe this option...'}
                              className="text-sm min-h-[60px] bg-background"
                            />
                          </div>

                          {/* Collapsed by default */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={choice.collapsedByDefault || false}
                              onCheckedChange={(v) => handleChoiceUpdate(choice.typeKey, { collapsedByDefault: v })}
                              className="scale-75"
                            />
                            <Label className="text-sm text-muted-foreground">Start collapsed (only show label)</Label>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
              
              {(!config.userSelectionScreen?.choices || config.userSelectionScreen.choices.length === 0) && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Enable verification types above to configure selection cards
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          Enabled Verification Types
        </Label>
        
        <ToggleGroup
          type="multiple"
          value={config.enabledTypes}
          onValueChange={handleTypeToggle}
          className="flex flex-wrap gap-2 justify-start"
        >
          {verificationTypes.map((type) => (
            <ToggleGroupItem
              key={type.typeKey}
              value={type.typeKey}
              className={`
                flex items-center gap-2 px-4 py-2 border rounded-lg transition-all
                ${TYPE_COLORS[type.typeKey] || ''}
              `}
            >
              {TYPE_ICONS[type.typeKey] || <FileText className="w-5 h-5" />}
              <span className="font-medium">{type.displayName}</span>
              {config.enabledTypes.includes(type.typeKey) && (
                <Check className="w-4 h-4" />
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {config.enabledTypes.length === 0 && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">At least one verification type must be enabled</span>
          </div>
        )}
      </div>

      {/* Per-Type Configuration Panels */}
      {config.enabledTypes.length > 0 && (
        <div className="space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Type Configuration
            <Badge variant="secondary" className="text-xs">
              {config.enabledTypes.length} type{config.enabledTypes.length > 1 ? 's' : ''}
            </Badge>
          </Label>

          <Accordion
            type="single"
            collapsible
            value={openPanel}
            onValueChange={setOpenPanel}
            className="space-y-2"
          >
            {config.enabledTypes.map((typeKey) => {
              const globalType = getGlobalTypeInfo(typeKey);
              const typeConfig = getTypeConfig(typeKey);
              
              if (!globalType) return null;

              return (
                <AccordionItem
                  key={typeKey}
                  value={typeKey}
                  className={`border rounded-lg overflow-hidden ${ACCORDION_COLORS[typeKey] || ''}`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background">
                        {TYPE_ICONS[typeKey]}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{globalType.displayName}</p>
                        <p className="text-xs text-muted-foreground">{globalType.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-4 pb-4">
                    <VerificationTypePanel
                      typeKey={typeKey}
                      globalType={globalType}
                      typeConfig={typeConfig}
                      didProviders={didProviders}
                      demo={demo}
                      adminResourceIds={adminResourceIds}
                      onUpdate={(updates) => handleTypeConfigUpdate(typeKey, updates)}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Post-Verification Behavior */}
      <Card className="border-border">
        <CardContent className="pt-4 space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Post-Verification Behavior
          </Label>

          {/* Completion Actions */}
          <StepCompletionActionsConfig
            config={step.stepCompletionConfig}
            onChange={(completionConfig) => onUpdateStep({ stepCompletionConfig: completionConfig })}
            inline
            demoSlug={demo?.slug}
            extraCustomPages={demo?.extraCustomPages}
            successPageConfig={demo?.successPageConfig}
            failurePageConfig={demo?.failurePageConfig}
          />

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-border space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Navigation Buttons
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.showBackButton ?? true}
                  onCheckedChange={(v) => handleConfigUpdate({ showBackButton: v })}
                  className="scale-75"
                />
                <div className="flex-1 space-y-1">
                  <Label className="text-sm">Back Button</Label>
                  {config.showBackButton !== false && (
                    <Input
                      value={config.backButtonLabel || 'Back'}
                      onChange={(e) => handleConfigUpdate({ backButtonLabel: e.target.value })}
                      placeholder="Back"
                      className="h-7 text-sm"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.showNextButton ?? false}
                  onCheckedChange={(v) => handleConfigUpdate({ showNextButton: v })}
                  className="scale-75"
                />
                <div className="flex-1 space-y-1">
                  <Label className="text-sm">Next Button</Label>
                  {config.showNextButton && (
                    <Input
                      value={config.nextButtonLabel || 'Continue'}
                      onChange={(e) => handleConfigUpdate({ nextButtonLabel: e.target.value })}
                      placeholder="Continue"
                      className="h-7 text-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual type configuration panel
interface VerificationTypePanelProps {
  typeKey: string;
  globalType: VerificationTypeConfig;
  typeConfig: VerificationTypeOverride;
  didProviders: DidProvider[];
  demo?: DemoEnvironment;
  adminResourceIds: import('@/hooks/useAdminResourceIds').AdminResourceId[];
  onUpdate: (updates: Partial<VerificationTypeOverride>) => void;
}

function VerificationTypePanel({ 
  typeKey, 
  globalType, 
  typeConfig, 
  didProviders,
  demo,
  adminResourceIds,
  onUpdate 
}: VerificationTypePanelProps) {
  const isDidType = typeKey === 'did';
  const isDataOnly = typeKey === 'dataonly';
  const isDataBio = typeKey === 'databio';

  // Local state for resource ID to prevent overwriting while typing
  const [localResourceId, setLocalResourceId] = useState(typeConfig.resourceId || '');
  
  // Sync local state when typeConfig changes from external source
  useEffect(() => {
    setLocalResourceId(typeConfig.resourceId || '');
  }, [typeConfig.resourceId]);

  // 3-tier values
  const globalDefault = globalType.defaultResourceId || '';
  const adminDefault = adminResourceIds.find(a => a.typeKey === typeKey)?.resourceId || '';
  const getDemoLevelResourceId = () => {
    if (demo) {
      switch (typeKey) {
        case 'docbio': return demo.resourceIdDocBio || demo.resourceId;
        case 'databio': return demo.resourceIdDataBio || demo.resourceId;
        case 'dataonly': return demo.resourceIdDataOnly || demo.resourceId;
        default: return demo.resourceId;
      }
    }
    return '';
  };
  const demoLevel = getDemoLevelResourceId();

  // Determine current selection mode from typeConfig
  // If there's a step override stored, mode is 'custom'
  // Otherwise we infer from what's available or default to global
  const getInitialMode = (): 'global' | 'admin' | 'custom' => {
    if (typeConfig.resourceId) return 'custom';
    // Check if the demo-level resource ID is set (meaning admin chose demo-level)
    // But since we're simplifying to 3 options, if no override → pick the highest available
    return 'global';
  };

  const [resourceIdMode, setResourceIdMode] = useState<'global' | 'admin' | 'custom'>(getInitialMode);

  // Sync mode when typeConfig changes externally
  useEffect(() => {
    if (typeConfig.resourceId) {
      setResourceIdMode('custom');
    }
  }, [typeConfig.resourceId]);

  const activeId = resourceIdMode === 'custom' 
    ? (typeConfig.resourceId || '') 
    : resourceIdMode === 'admin' 
      ? adminDefault 
      : globalDefault;

  const handleModeChange = (mode: string) => {
    const newMode = mode as 'global' | 'admin' | 'custom';
    setResourceIdMode(newMode);
    if (newMode !== 'custom') {
      // Clear the step override when switching away from custom
      setLocalResourceId('');
      onUpdate({ resourceId: undefined });
    }
  };

  return (
    <div className="space-y-4">
      {/* Resource ID Selector - Compact inline layout */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Resource ID</Label>
        <div className="flex items-center gap-2">
          <Select value={resourceIdMode} onValueChange={handleModeChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                  <span>Global</span>
                </div>
              </SelectItem>
              <SelectItem value="admin" disabled={!adminDefault}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${adminDefault ? 'bg-emerald-500' : 'bg-muted'}`} />
                  <span>Admin</span>
                </div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span>Custom</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Show active ID or custom input */}
          {resourceIdMode === 'custom' ? (
            <Input
              value={localResourceId}
              onChange={(e) => setLocalResourceId(e.target.value)}
              onBlur={() => {
                if (localResourceId !== (typeConfig.resourceId || '')) {
                  onUpdate({ resourceId: localResourceId || undefined });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Enter Resource ID..."
              className="font-mono text-sm h-8 flex-1"
            />
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {activeId ? (
                <code className="font-mono text-xs bg-muted px-2 py-1.5 rounded border border-border truncate">{activeId}</code>
              ) : (
                <span className="text-xs text-destructive italic">Not configured</span>
              )}
            </div>
          )}
        </div>
        {resourceIdMode === 'custom' && (
          <p className="text-xs text-muted-foreground">
            This resource ID will be used only for this verification step.
          </p>
        )}
      </div>

      {/* Custom display settings */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Custom Title</Label>
          <Input
            value={typeConfig.customTitle || ''}
            onChange={(e) => onUpdate({ customTitle: e.target.value })}
            placeholder={globalType.displayName}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Custom Description</Label>
          <Input
            value={typeConfig.customDescription || ''}
            onChange={(e) => onUpdate({ customDescription: e.target.value })}
            placeholder={globalType.description || ''}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* QR Code settings - only for types that support it */}
      {globalType.supportsQrCode && !isDataOnly && (
        <div className="space-y-3 p-3 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code Display
            </Label>
            <Switch
              checked={typeConfig.qrCodeEnabled ?? true}
              onCheckedChange={(v) => onUpdate({ qrCodeEnabled: v })}
              className="scale-75"
            />
          </div>
          
          {typeConfig.qrCodeEnabled !== false && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input
                  value={typeConfig.qrCodeTitle || ''}
                  onChange={(e) => onUpdate({ qrCodeTitle: e.target.value })}
                  placeholder="Scan to Verify"
                  className="h-7 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Instructions</Label>
                <Input
                  value={typeConfig.qrCodeInstructions || ''}
                  onChange={(e) => onUpdate({ qrCodeInstructions: e.target.value })}
                  placeholder="Scan with your device..."
                  className="h-7 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile popup launch (Trinsic web-ui) */}
      {!isDataOnly && (
        <div className="space-y-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Mobile Popup Launch
            </Label>
            <Switch
              checked={typeConfig.popupMode ?? false}
              onCheckedChange={(v) => onUpdate({ popupMode: v })}
              className="scale-75"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, the verifyUrl is opened as a popup using the Trinsic web-ui SDK.
            On completion, the user is auto-redirected to the demo's approved or rejected URL.
            The popup's redirect target is set to <code className="font-mono">/verify/redirect</code>.
          </p>
        </div>
      )}

      {/* DataBio capture options — documents + biometrics */}
      {isDataBio && (() => {
        const opts = typeConfig.dataBioOptions || {};
        const documentsEnabled = opts.documentsEnabled ?? true;
        const documentsCount = opts.documentsCount ?? 2;
        const biometricsEnabled = opts.biometricsEnabled ?? true;
        const biometricsFaceCount = opts.biometricsFaceCount ?? 1;
        const update = (patch: Partial<NonNullable<VerificationTypeOverride['dataBioOptions']>>) =>
          onUpdate({ dataBioOptions: { documentsEnabled, documentsCount, biometricsEnabled, biometricsFaceCount, ...patch } });
        return (
          <div className="space-y-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              DataBio Capture Options
            </Label>

            <div className="space-y-2 p-2 rounded border border-border bg-background/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Documents
                </Label>
                <Switch
                  checked={documentsEnabled}
                  onCheckedChange={(v) => update({ documentsEnabled: v })}
                  className="scale-75"
                />
              </div>
              {documentsEnabled && (
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Document count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={documentsCount}
                    onChange={(e) => update({ documentsCount: parseInt(e.target.value) || 1 })}
                    className="h-7 text-sm w-20"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 p-2 rounded border border-border bg-background/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  Biometrics
                </Label>
                <Switch
                  checked={biometricsEnabled}
                  onCheckedChange={(v) => update({ biometricsEnabled: v })}
                  className="scale-75"
                />
              </div>
              {biometricsEnabled && (
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Face count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3}
                    value={biometricsFaceCount}
                    onChange={(e) => update({ biometricsFaceCount: parseInt(e.target.value) || 1 })}
                    className="h-7 text-sm w-20"
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Sent as <code className="font-mono">options.documents</code> and{' '}
              <code className="font-mono">options.biometrics</code> on the verification session payload.
            </p>
          </div>
        );
      })()}

      {/* Status polling */}
      {!isDataOnly && (
        <div className="space-y-2 p-3 rounded-lg border border-border">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Status Polling
          </Label>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              value={typeConfig.statusPollingInterval || 5}
              onChange={(e) => onUpdate({ statusPollingInterval: parseInt(e.target.value) || 5 })}
              min={1}
              max={60}
              className="h-7 text-sm w-20"
            />
            <span className="text-sm text-muted-foreground">seconds</span>
          </div>
        </div>
      )}

      {/* DiD Provider selection */}
      {isDidType && didProviders.length > 0 && (
        <div className="space-y-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Available Providers
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {didProviders.map((provider) => {
              const isEnabled = typeConfig.enabledProviderKeys?.some(key => didProviderMatchesKey(provider, key)) ?? true;
              
              return (
                <div
                  key={provider.id}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all
                    ${isEnabled 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-border bg-muted/30 opacity-60'
                    }
                  `}
                  onClick={() => {
                    const currentEnabled = typeConfig.enabledProviderKeys || didProviders.map(p => p.providerKey);
                    const newEnabled = isEnabled
                      ? currentEnabled.filter(k => k !== provider.providerKey)
                      : [...currentEnabled, provider.providerKey];
                    onUpdate({ enabledProviderKeys: newEnabled });
                  }}
                >
                  <div className="w-8 h-8 rounded bg-white flex items-center justify-center overflow-hidden">
                    {provider.logoUrl ? (
                      <img src={provider.logoUrl} alt={provider.displayName} className="w-6 h-6 object-contain" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{provider.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{provider.domain}</p>
                  </div>
                  {isEnabled && <Check className="w-4 h-4 text-green-600" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
