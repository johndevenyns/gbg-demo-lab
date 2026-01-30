import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { FormStep, VerificationStepConfig as VerificationConfig, AVAILABLE_MDL_PROVIDERS } from '@/types/demo';
import { MdlProviderConfig } from './MdlProviderConfig';
import { 
  QrCode, Activity, Smartphone, ChevronDown, ChevronUp, Settings2, 
  Link, Clock, ArrowRight
} from 'lucide-react';

const DEFAULT_CONFIG: VerificationConfig = {
  qrCodeEnabled: true,
  qrCodeTitle: 'Scan to Verify',
  qrCodeInstructions: 'Scan this QR code with your mobile device to complete verification',
  statusEnabled: true,
  statusPollingInterval: 5,
  mobileIdEnabled: false,
  mobileIdTitle: 'Mobile ID Verification',
  mobileIdInstructions: 'Use your mobile driver\'s license for faster verification',
  mobileIdProviders: AVAILABLE_MDL_PROVIDERS.map(p => ({ ...p, enabled: true })),
  autoAdvanceOnComplete: true,
  showBackButton: true,
  backButtonLabel: 'Back',
  showNextButton: false,
  nextButtonLabel: 'Continue',
};

interface VerificationStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function VerificationStepConfig({ step, onUpdateStep }: VerificationStepConfigProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const config = step.verificationConfig || DEFAULT_CONFIG;

  const handleConfigUpdate = (updates: Partial<VerificationConfig>) => {
    onUpdateStep({
      verificationConfig: { ...config, ...updates }
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
              {config.mobileIdEnabled && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <Smartphone className="w-3 h-3 mr-1" />
                  mDL
                </Badge>
              )}
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Link className="w-3 h-3" />
                  URL Field (from API response)
                </Label>
                <Input
                  value={config.qrCodeUrlField || ''}
                  onChange={(e) => handleConfigUpdate({ qrCodeUrlField: e.target.value })}
                  placeholder="e.g., verificationUrl, qrCodeUrl"
                  className="h-8 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  The API response field containing the QR code URL
                </p>
              </div>
              
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
              Verification Status
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
                  <Link className="w-3 h-3" />
                  Status Field (from API response)
                </Label>
                <Input
                  value={config.statusField || ''}
                  onChange={(e) => handleConfigUpdate({ statusField: e.target.value })}
                  placeholder="e.g., status, verificationStatus"
                  className="h-8 text-sm font-mono"
                />
              </div>
              
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
              </div>
            </div>
          )}
        </div>

        {/* Mobile ID Configuration */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Smartphone className="w-3 h-3" />
              Mobile ID / mDL Path
            </Label>
            <Switch
              checked={config.mobileIdEnabled}
              onCheckedChange={(v) => handleConfigUpdate({ mobileIdEnabled: v })}
              className="scale-75"
            />
          </div>
          
          {config.mobileIdEnabled && (
            <div className="space-y-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Link className="w-3 h-3" />
                  Mobile ID URL Field (from API response)
                </Label>
                <Input
                  value={config.mobileIdUrlField || ''}
                  onChange={(e) => handleConfigUpdate({ mobileIdUrlField: e.target.value })}
                  placeholder="e.g., mobileIdUrl, mdlUrl"
                  className="h-8 text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  URL for mobile driver's license verification flow
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Title</Label>
                  <Input
                    value={config.mobileIdTitle || ''}
                    onChange={(e) => handleConfigUpdate({ mobileIdTitle: e.target.value })}
                    placeholder="Mobile ID Verification"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Instructions</Label>
                  <Input
                    value={config.mobileIdInstructions || ''}
                    onChange={(e) => handleConfigUpdate({ mobileIdInstructions: e.target.value })}
                    placeholder="Use your mobile license..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* mDL Provider Selection */}
              <div className="pt-2 border-t border-green-500/20">
                <MdlProviderConfig
                  enabledProviders={config.mobileIdProviders || []}
                  onChange={(providers) => handleConfigUpdate({ mobileIdProviders: providers })}
                />
              </div>
            </div>
          )}
        </div>

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
            <ArrowRight className="w-3 h-3" />
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
                Redirect to this URL instead of advancing to next step
              </p>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
