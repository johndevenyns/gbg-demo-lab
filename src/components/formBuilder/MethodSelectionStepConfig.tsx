import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormStep, MethodSelectionStepConfig as MethodSelectionConfig, AVAILABLE_DID_PROVIDERS } from '@/types/demo';
import { DidProviderConfig } from './DidProviderConfig';
import { 
  FileText, Smartphone, ChevronDown, ChevronUp, Settings2, SplitSquareVertical
} from 'lucide-react';

const DEFAULT_CONFIG: MethodSelectionConfig = {
  title: 'Choose your verification method',
  subtitle: 'Select how you\'d like to verify your identity',
  documentScanEnabled: true,
  documentScanTitle: 'Document Verification',
  documentScanDescription: 'Scan your driver\'s license or ID and take a selfie',
  documentScanPath: 'docbio',
  mobileIdEnabled: true,
  mobileIdProviders: AVAILABLE_DID_PROVIDERS.map(p => ({ ...p, enabled: true })),
};

interface MethodSelectionStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function MethodSelectionStepConfig({ step, onUpdateStep }: MethodSelectionStepConfigProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const config = step.methodSelectionConfig || DEFAULT_CONFIG;

  const handleConfigUpdate = (updates: Partial<MethodSelectionConfig>) => {
    onUpdateStep({
      methodSelectionConfig: { ...config, ...updates }
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between px-3 py-2 h-auto">
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Method Selection Options</span>
            <div className="flex gap-1">
              {config.documentScanEnabled && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <FileText className="w-3 h-3 mr-1" />
                  Doc
                </Badge>
              )}
              {config.mobileIdEnabled && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <Smartphone className="w-3 h-3 mr-1" />
                  dID
                </Badge>
              )}
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-3 pb-3 pt-2 space-y-4">
        {/* Page Header */}
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Page Header
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => handleConfigUpdate({ title: e.target.value })}
                placeholder="Choose your verification method"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Subtitle</Label>
              <Input
                value={config.subtitle || ''}
                onChange={(e) => handleConfigUpdate({ subtitle: e.target.value })}
                placeholder="Select how you'd like to verify..."
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Document Scan Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Document Scan Option
            </Label>
            <Switch
              checked={config.documentScanEnabled}
              onCheckedChange={(v) => handleConfigUpdate({ documentScanEnabled: v })}
              className="scale-75"
            />
          </div>
          
          {config.documentScanEnabled && (
            <div className="space-y-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Title</Label>
                  <Input
                    value={config.documentScanTitle || ''}
                    onChange={(e) => handleConfigUpdate({ documentScanTitle: e.target.value })}
                    placeholder="Document Verification"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <Input
                    value={config.documentScanDescription || ''}
                    onChange={(e) => handleConfigUpdate({ documentScanDescription: e.target.value })}
                    placeholder="Scan your ID..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Verification Path</Label>
                <Select
                  value={config.documentScanPath || 'docbio'}
                  onValueChange={(v) => handleConfigUpdate({ documentScanPath: v as 'docbio' | 'databio' })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docbio">Doc + Bio (Document & Selfie)</SelectItem>
                    <SelectItem value="databio">Data + Bio (Data & Selfie)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Which verification path to use when user selects document scan
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile ID Configuration */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Smartphone className="w-3 h-3" />
              Mobile ID Providers
            </Label>
            <Switch
              checked={config.mobileIdEnabled}
              onCheckedChange={(v) => handleConfigUpdate({ mobileIdEnabled: v })}
              className="scale-75"
            />
          </div>
          
          {config.mobileIdEnabled && (
            <div className="space-y-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <DidProviderConfig
                enabledProviders={config.mobileIdProviders || []}
                onChange={(providers) => handleConfigUpdate({ mobileIdProviders: providers })}
              />
            </div>
          )}
        </div>

        {/* Validation warning */}
        {!config.documentScanEnabled && !config.mobileIdEnabled && (
          <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
            ⚠️ At least one verification method must be enabled.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
