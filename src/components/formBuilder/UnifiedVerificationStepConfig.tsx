import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormStep, DemoEnvironment } from '@/types/demo';
import { 
  UnifiedVerificationConfig, 
  VerificationTypeOverride, 
  VerificationMethodSelection,
  VerificationTypeConfig,
  MdlProvider 
} from '@/types/verification';
import { useVerificationTypes, useMdlProviders } from '@/hooks/useVerificationAdmin';
import { 
  FileText, UserCheck, Database, Smartphone, QrCode, Activity, Clock, Settings2,
  ChevronRight, Check, AlertCircle, Loader2
} from 'lucide-react';

// Icon mapping for verification types
const TYPE_ICONS: Record<string, React.ReactNode> = {
  docbio: <FileText className="w-5 h-5" />,
  databio: <UserCheck className="w-5 h-5" />,
  dataonly: <Database className="w-5 h-5" />,
  mdl: <Smartphone className="w-5 h-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  docbio: 'data-[state=on]:bg-purple-500/20 data-[state=on]:text-purple-700 data-[state=on]:border-purple-500',
  databio: 'data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-700 data-[state=on]:border-blue-500',
  dataonly: 'data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-700 data-[state=on]:border-cyan-500',
  mdl: 'data-[state=on]:bg-green-500/20 data-[state=on]:text-green-700 data-[state=on]:border-green-500',
};

const TAB_COLORS: Record<string, string> = {
  docbio: 'data-[state=active]:border-purple-500 data-[state=active]:text-purple-700',
  databio: 'data-[state=active]:border-blue-500 data-[state=active]:text-blue-700',
  dataonly: 'data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-700',
  mdl: 'data-[state=active]:border-green-500 data-[state=active]:text-green-700',
};

const PANEL_COLORS: Record<string, string> = {
  docbio: 'border-purple-500/30 bg-purple-500/5',
  databio: 'border-blue-500/30 bg-blue-500/5',
  dataonly: 'border-cyan-500/30 bg-cyan-500/5',
  mdl: 'border-green-500/30 bg-green-500/5',
};

const DEFAULT_CONFIG: UnifiedVerificationConfig = {
  methodSelection: 'user_choice',
  enabledTypes: ['docbio'],
  typeConfigs: {},
  successDestination: 'default',
  failureDestination: 'default',
  showBackButton: true,
  backButtonLabel: 'Back',
  showNextButton: false,
  nextButtonLabel: 'Continue',
};

interface UnifiedVerificationStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
  demo?: DemoEnvironment;
}

export function UnifiedVerificationStepConfig({ step, onUpdateStep, demo }: UnifiedVerificationStepConfigProps) {
  const { data: verificationTypes = [], isLoading: typesLoading } = useVerificationTypes(true);
  const { data: mdlProviders = [], isLoading: providersLoading } = useMdlProviders(true);
  
  // Get config from step or use defaults
  const config: UnifiedVerificationConfig = step.unifiedVerificationConfig || DEFAULT_CONFIG;
  
  // Track which tab is active
  const [activeTab, setActiveTab] = useState<string>(
    config.enabledTypes.length > 0 ? config.enabledTypes[0] : 'docbio'
  );

  // Sync activeTab when enabledTypes changes
  useEffect(() => {
    if (config.enabledTypes.length > 0 && !config.enabledTypes.includes(activeTab)) {
      setActiveTab(config.enabledTypes[0]);
    }
  }, [config.enabledTypes, activeTab]);

  const handleConfigUpdate = (updates: Partial<UnifiedVerificationConfig>) => {
    onUpdateStep({
      unifiedVerificationConfig: { ...config, ...updates }
    });
  };

  const handleTypeToggle = (typeKeys: string[]) => {
    // Ensure at least one type is always selected
    if (typeKeys.length === 0) return;
    
    // Update enabled types and set the first newly added type as active tab
    const newTypes = typeKeys.filter(t => !config.enabledTypes.includes(t));
    if (newTypes.length > 0) {
      setActiveTab(newTypes[0]);
    } else if (!typeKeys.includes(activeTab)) {
      // If active tab was removed, switch to first available
      setActiveTab(typeKeys[0]);
    }
    
    handleConfigUpdate({ enabledTypes: typeKeys });
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
            How is the verification method determined?
          </Label>
          
          <RadioGroup
            value={config.methodSelection}
            onValueChange={(v) => handleConfigUpdate({ methodSelection: v as VerificationMethodSelection })}
            className="space-y-2"
          >
            <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              config.methodSelection === 'user_choice'
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/30'
            }`}>
              <RadioGroupItem value="user_choice" id="user_choice" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="user_choice" className="font-medium cursor-pointer">
                  User Selects Method
                </Label>
                <p className="text-sm text-muted-foreground">
                  User sees a selection screen to choose from the enabled verification methods below
                </p>
              </div>
            </div>
            
            <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              config.methodSelection === 'auto_detect'
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/30'
            }`}>
              <RadioGroupItem value="auto_detect" id="auto_detect" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto_detect" className="font-medium cursor-pointer">
                  Auto-detect (Web/Mobile)
                </Label>
                <p className="text-sm text-muted-foreground">
                  System automatically chooses the appropriate method based on device type
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* User selection screen settings */}
          {config.methodSelection === 'user_choice' && (
            <div className="space-y-3 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selection Screen Settings
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Title</Label>
                  <Input
                    value={config.userSelectionTitle || ''}
                    onChange={(e) => handleConfigUpdate({ userSelectionTitle: e.target.value })}
                    placeholder="Choose Verification Method"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Subtitle</Label>
                  <Input
                    value={config.userSelectionSubtitle || ''}
                    onChange={(e) => handleConfigUpdate({ userSelectionSubtitle: e.target.value })}
                    placeholder="Select how you'd like to verify..."
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Types Selection */}
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
              {config.enabledTypes.map((typeKey) => {
                const globalType = getGlobalTypeInfo(typeKey);
                if (!globalType) return null;

                return (
                  <TabsTrigger
                    key={typeKey}
                    value={typeKey}
                    className={`flex items-center gap-2 px-3 py-2 border-b-2 border-transparent ${TAB_COLORS[typeKey] || ''}`}
                  >
                    {TYPE_ICONS[typeKey]}
                    <span className="font-medium">{globalType.displayName}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {config.enabledTypes.map((typeKey) => {
              const globalType = getGlobalTypeInfo(typeKey);
              const typeConfig = getTypeConfig(typeKey);
              
              if (!globalType) return null;

              return (
                <TabsContent
                  key={typeKey}
                  value={typeKey}
                  className={`mt-3 p-4 rounded-lg border ${PANEL_COLORS[typeKey] || 'border-border'}`}
                >
                  <div className="mb-3">
                    <p className="font-semibold flex items-center gap-2">
                      {TYPE_ICONS[typeKey]}
                      {globalType.displayName}
                    </p>
                    <p className="text-sm text-muted-foreground">{globalType.description}</p>
                  </div>
                  <VerificationTypePanel
                    typeKey={typeKey}
                    globalType={globalType}
                    typeConfig={typeConfig}
                    mdlProviders={mdlProviders}
                    demo={demo}
                    onUpdate={(updates) => handleTypeConfigUpdate(typeKey, updates)}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* Post-Verification Handling */}
      <Card className="border-border">
        <CardContent className="pt-4 space-y-4">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Post-Verification Behavior
          </Label>

          <div className="grid grid-cols-2 gap-4">
            {/* Success Destination */}
            <div className="space-y-2">
              <Label className="text-sm text-success flex items-center gap-1">
                <Check className="w-3 h-3" />
                On Success
              </Label>
              <RadioGroup
                value={config.successDestination}
                onValueChange={(v) => handleConfigUpdate({ successDestination: v as 'default' | 'custom' | 'per_type' })}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="default" id="success_default" />
                  <Label htmlFor="success_default" className="text-sm cursor-pointer">Use demo default</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="success_custom" />
                  <Label htmlFor="success_custom" className="text-sm cursor-pointer">Custom URL</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="per_type" id="success_per_type" />
                  <Label htmlFor="success_per_type" className="text-sm cursor-pointer">Per-type override</Label>
                </div>
              </RadioGroup>
              {config.successDestination === 'custom' && (
                <Input
                  value={config.customSuccessUrl || ''}
                  onChange={(e) => handleConfigUpdate({ customSuccessUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
              )}
            </div>

            {/* Failure Destination */}
            <div className="space-y-2">
              <Label className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                On Failure
              </Label>
              <RadioGroup
                value={config.failureDestination}
                onValueChange={(v) => handleConfigUpdate({ failureDestination: v as 'default' | 'custom' | 'per_type' })}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="default" id="failure_default" />
                  <Label htmlFor="failure_default" className="text-sm cursor-pointer">Use demo default</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="failure_custom" />
                  <Label htmlFor="failure_custom" className="text-sm cursor-pointer">Custom URL</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="per_type" id="failure_per_type" />
                  <Label htmlFor="failure_per_type" className="text-sm cursor-pointer">Per-type override</Label>
                </div>
              </RadioGroup>
              {config.failureDestination === 'custom' && (
                <Input
                  value={config.customFailureUrl || ''}
                  onChange={(e) => handleConfigUpdate({ customFailureUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
              )}
            </div>
          </div>

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
  mdlProviders: MdlProvider[];
  demo?: DemoEnvironment;
  onUpdate: (updates: Partial<VerificationTypeOverride>) => void;
}

function VerificationTypePanel({ 
  typeKey, 
  globalType, 
  typeConfig, 
  mdlProviders,
  demo,
  onUpdate 
}: VerificationTypePanelProps) {
  const isMdlType = typeKey === 'mdl';
  const isDataOnly = typeKey === 'dataonly';

  // Get default resource ID from demo or global type
  const getDefaultResourceId = () => {
    if (demo) {
      switch (typeKey) {
        case 'docbio': return demo.resourceIdDocBio || demo.resourceId;
        case 'databio': return demo.resourceIdDataBio || demo.resourceId;
        case 'dataonly': return demo.resourceIdDataOnly || demo.resourceId;
        default: return demo.resourceId;
      }
    }
    return globalType.defaultResourceId || '';
  };

  return (
    <div className="space-y-4">
      {/* Resource ID */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Resource ID</Label>
        <Input
          value={typeConfig.resourceId || ''}
          onChange={(e) => onUpdate({ resourceId: e.target.value })}
          placeholder={getDefaultResourceId() || 'Uses global default'}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Override the demo's default resource ID for this verification type.
          {getDefaultResourceId() && (
            <span className="block mt-1">
              Current default: <code className="bg-muted px-1 rounded">{getDefaultResourceId()}</code>
            </span>
          )}
        </p>
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

      {/* mDL Provider selection */}
      {isMdlType && mdlProviders.length > 0 && (
        <div className="space-y-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Available Providers
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {mdlProviders.map((provider) => {
              const isEnabled = typeConfig.enabledProviderKeys?.includes(provider.providerKey) ?? true;
              
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
                    const currentEnabled = typeConfig.enabledProviderKeys || mdlProviders.map(p => p.providerKey);
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

      {/* Per-type result page overrides */}
      <div className="space-y-2 p-3 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Custom Result Pages</Label>
          <Switch
            checked={typeConfig.useCustomResultPages ?? false}
            onCheckedChange={(v) => onUpdate({ useCustomResultPages: v })}
            className="scale-75"
          />
        </div>
        
        {typeConfig.useCustomResultPages && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-success">Success URL</Label>
              <Input
                value={typeConfig.customSuccessUrl || ''}
                onChange={(e) => onUpdate({ customSuccessUrl: e.target.value })}
                placeholder="https://..."
                className="h-7 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-destructive">Failure URL</Label>
              <Input
                value={typeConfig.customFailureUrl || ''}
                onChange={(e) => onUpdate({ customFailureUrl: e.target.value })}
                placeholder="https://..."
                className="h-7 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
