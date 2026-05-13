import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormStep, VerificationFlowConfig as VerificationFlowConfigType, AVAILABLE_DID_PROVIDERS, DemoEnvironment } from '@/types/demo';
import { VERIFICATION_PATHS } from '@/types/formBuilder';
import { DidProviderConfig } from './DidProviderConfig';
import { StepCompletionActionsConfig } from './StepCompletionActionsConfig';
import { 
  QrCode, Activity, Smartphone, ChevronDown, ChevronUp, Settings2, 
  Clock, ArrowRight, FileCheck, Database, Workflow, CheckCircle2
} from 'lucide-react';

const PATH_ICONS: Record<string, React.ReactNode> = {
  docbio: <FileCheck className="w-6 h-6" />,
  databio: <Database className="w-6 h-6" />,
  dataonly: <Database className="w-6 h-6" />,
  did: <Smartphone className="w-6 h-6" />,
};

const PATH_COLORS: Record<string, string> = {
  docbio: 'text-purple-600 bg-purple-500/20',
  databio: 'text-blue-600 bg-blue-500/20',
  dataonly: 'text-cyan-600 bg-cyan-500/20',
  did: 'text-green-600 bg-green-500/20',
};

const DEFAULT_CONFIG: VerificationFlowConfigType = {
  pathType: 'docbio',
  qrCodeEnabled: true,
  qrCodeTitle: 'Scan to Verify',
  qrCodeInstructions: 'Scan this QR code with your mobile device to complete verification',
  statusEnabled: true,
  statusPollingInterval: 5,
  mobileIdEnabled: false,
  mobileIdTitle: 'Digital ID Verification',
  mobileIdInstructions: 'Use your Digital ID for faster verification',
  mobileIdProviders: AVAILABLE_DID_PROVIDERS.map(p => ({ ...p, enabled: true })),
  autoAdvanceOnComplete: true,
  showBackButton: true,
  backButtonLabel: 'Back',
  showNextButton: false,
  nextButtonLabel: 'Continue',
};

interface VerificationFlowConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
  demo?: DemoEnvironment; // For accessing default result pages
}

export function VerificationFlowConfig({ step, onUpdateStep, demo }: VerificationFlowConfigProps) {
  const [isDisplayOpen, setIsDisplayOpen] = useState(true);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  
  const config = step.verificationFlowConfig || DEFAULT_CONFIG;
  const currentPath = VERIFICATION_PATHS.find(p => p.id === config.pathType) || VERIFICATION_PATHS[0];

  const handleConfigUpdate = (updates: Partial<VerificationFlowConfigType>) => {
    onUpdateStep({
      verificationFlowConfig: { ...config, ...updates }
    });
  };

  // Determine which display options are relevant based on path type
  const isDataOnlyPath = config.pathType === 'dataonly';
  const isDidPath = config.pathType === 'did';

  return (
    <div className="space-y-4">
      {/* Path Selection Preview */}
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5">
        <div className="flex items-center justify-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${PATH_COLORS[config.pathType] || PATH_COLORS.docbio}`}>
            {PATH_ICONS[config.pathType] || PATH_ICONS.docbio}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{config.title || currentPath.name}</p>
            <p className="text-sm text-muted-foreground">
              {config.description || currentPath.description}
            </p>
            {config.resourceId && (
              <p className="text-xs text-muted-foreground mt-1">
                Resource ID: {config.resourceId}
              </p>
            )}
          </div>
        </div>
        
        {/* Display elements preview */}
        {!isDataOnlyPath && (
          <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-center gap-6">
            {config.qrCodeEnabled && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-1 bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
                  <QrCode className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-purple-600 font-medium">QR Code</p>
              </div>
            )}
            {config.statusEnabled && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-1 bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
                  <Activity className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-blue-600 font-medium">Status</p>
              </div>
            )}
            {isDidPath && config.mobileIdEnabled && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-1 bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
                  <Smartphone className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-green-600 font-medium">dID</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Path Configuration */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              Verification Type
            </Label>
            <Select
              value={config.pathType}
              onValueChange={(v) => handleConfigUpdate({ 
                pathType: v as 'docbio' | 'databio' | 'dataonly' | 'did',
                // Auto-enable relevant options based on path type
                qrCodeEnabled: v !== 'dataonly',
                mobileIdEnabled: v === 'did',
              })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {VERIFICATION_PATHS.map(path => (
                  <SelectItem key={path.id} value={path.id}>
                    <div className="flex items-center gap-2">
                      {PATH_ICONS[path.id]}
                      <span>{path.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {currentPath.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Resource ID (optional override)</Label>
            <Input
              value={config.resourceId || ''}
              onChange={(e) => handleConfigUpdate({ resourceId: e.target.value })}
              placeholder="Uses demo default if empty"
              className="bg-background font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Override the demo's default resource ID for this verification type.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => handleConfigUpdate({ title: e.target.value })}
                placeholder={currentPath.name}
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Description</Label>
              <Input
                value={config.description || ''}
                onChange={(e) => handleConfigUpdate({ description: e.target.value })}
                placeholder={currentPath.description}
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Configuration - Only show for non-dataonly paths */}
      {!isDataOnlyPath && (
        <Collapsible open={isDisplayOpen} onOpenChange={setIsDisplayOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between px-3 py-2 h-auto">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Verification Display</span>
                <div className="flex gap-1">
                  {config.qrCodeEnabled && (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                      <QrCode className="w-3 h-3 mr-1" />
                      QR
                    </Badge>
                  )}
                  {config.statusEnabled && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                      <Activity className="w-3 h-3 mr-1" />
                      Status
                    </Badge>
                  )}
                  {isDidPath && config.mobileIdEnabled && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <Smartphone className="w-3 h-3 mr-1" />
                      dID
                    </Badge>
                  )}
                </div>
              </div>
              {isDisplayOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="px-3 pb-3 pt-2 space-y-4">
            {/* QR Code Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <QrCode className="w-3 h-3" />
                  QR Code Display
                </Label>
                <Switch
                  checked={config.qrCodeEnabled}
                  onCheckedChange={(v) => handleConfigUpdate({ qrCodeEnabled: v })}
                  className="scale-75"
                />
              </div>
              
              {config.qrCodeEnabled && (
                <div className="space-y-3 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Title</Label>
                      <Input
                        value={config.qrCodeTitle || ''}
                        onChange={(e) => handleConfigUpdate({ qrCodeTitle: e.target.value })}
                        placeholder="Scan to Verify"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Instructions</Label>
                      <Input
                        value={config.qrCodeInstructions || ''}
                        onChange={(e) => handleConfigUpdate({ qrCodeInstructions: e.target.value })}
                        placeholder="Scan with your device..."
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Display Configuration */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  Status Polling
                </Label>
                <Switch
                  checked={config.statusEnabled}
                  onCheckedChange={(v) => handleConfigUpdate({ statusEnabled: v })}
                  className="scale-75"
                />
              </div>
              
              {config.statusEnabled && (
                <div className="space-y-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Polling Interval (seconds)
                    </Label>
                    <Input
                      type="number"
                      value={config.statusPollingInterval || 5}
                      onChange={(e) => handleConfigUpdate({ statusPollingInterval: parseInt(e.target.value) || 5 })}
                      min={1}
                      max={60}
                      className="h-8 text-sm w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      How often to check for verification completion
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Digital ID Configuration - Only for dID path */}
            {isDidPath && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Smartphone className="w-3 h-3" />
                    Digital ID Providers
                  </Label>
                  <Switch
                    checked={config.mobileIdEnabled}
                    onCheckedChange={(v) => handleConfigUpdate({ mobileIdEnabled: v })}
                    className="scale-75"
                  />
                </div>
                
                {config.mobileIdEnabled && (
                  <div className="space-y-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Title</Label>
                        <Input
                          value={config.mobileIdTitle || ''}
                          onChange={(e) => handleConfigUpdate({ mobileIdTitle: e.target.value })}
                          placeholder="Digital ID Verification"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Instructions</Label>
                        <Input
                          value={config.mobileIdInstructions || ''}
                          onChange={(e) => handleConfigUpdate({ mobileIdInstructions: e.target.value })}
                          placeholder="Use your Digital ID..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* dID Provider Selection */}
                    <div className="pt-2 border-t border-green-500/20">
                      <DidProviderConfig
                        enabledProviders={config.mobileIdProviders || []}
                        onChange={(providers) => handleConfigUpdate({ mobileIdProviders: providers })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <ArrowRight className="w-3 h-3" />
                Navigation Buttons
              </Label>
              
              <div className="p-3 rounded-lg border border-border space-y-3">
                {/* Back Button */}
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
                
                {/* Next/Continue Button */}
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.showNextButton ?? false}
                    onCheckedChange={(v) => handleConfigUpdate({ showNextButton: v })}
                    className="scale-75"
                  />
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm">Next/Submit Button</Label>
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

            {/* Completion Behavior */}
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                Completion Behavior
              </Label>
              
              <div className="p-3 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Auto-advance on Complete</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically move to next step when verification completes
                    </p>
                  </div>
                  <Switch
                    checked={config.autoAdvanceOnComplete ?? true}
                    onCheckedChange={(v) => handleConfigUpdate({ autoAdvanceOnComplete: v })}
                    className="scale-75"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Completion Redirect URL (optional)</Label>
                  <Input
                    value={config.completionRedirectUrl || ''}
                    onChange={(e) => handleConfigUpdate({ completionRedirectUrl: e.target.value })}
                    placeholder="https://example.com/success"
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Redirect to this URL instead of showing result page
                  </p>
                </div>

                {/* Completion Actions */}
                <div className="pt-3 border-t border-border/50">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
                    Completion Actions
                  </Label>
                  <StepCompletionActionsConfig
                    config={step.stepCompletionConfig}
                    onChange={(completionConfig) => onUpdateStep({ stepCompletionConfig: completionConfig })}
                    inline
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Data Only specific info */}
      {isDataOnlyPath && (
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-cyan-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-cyan-700">Data Only Verification</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This verification type runs in the background without user interaction. 
                  The form data is submitted directly to the API and verified server-side.
                  No QR code or mobile handoff is needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
