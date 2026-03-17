import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, ChevronDown, Settings2 } from 'lucide-react';
import { ResultPageConfig, ResultButtonAction, DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from '@/components/preview/ResultPage';

export type ResultPageMode = 'default' | 'custom';

export interface CompletionBehaviorSettings {
  successPageMode: ResultPageMode;
  failurePageMode: ResultPageMode;
  customSuccessPage?: ResultPageConfig;
  customFailurePage?: ResultPageConfig;
}

interface CompletionBehaviorConfigProps {
  settings: CompletionBehaviorSettings;
  onChange: (settings: CompletionBehaviorSettings) => void;
  defaultSuccessPage?: ResultPageConfig;
  defaultFailurePage?: ResultPageConfig;
}

export function CompletionBehaviorConfig({
  settings,
  onChange,
  defaultSuccessPage,
  defaultFailurePage,
}: CompletionBehaviorConfigProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'failure'>('success');
  const [isExpanded, setIsExpanded] = useState(
    settings.successPageMode === 'custom' || settings.failurePageMode === 'custom'
  );

  const handleModeChange = (type: 'success' | 'failure', mode: ResultPageMode) => {
    if (type === 'success') {
      onChange({
        ...settings,
        successPageMode: mode,
        // Initialize custom config if switching to custom and not set
        customSuccessPage: mode === 'custom' && !settings.customSuccessPage 
          ? { ...(defaultSuccessPage || DEFAULT_SUCCESS_CONFIG) }
          : settings.customSuccessPage,
      });
    } else {
      onChange({
        ...settings,
        failurePageMode: mode,
        customFailurePage: mode === 'custom' && !settings.customFailurePage
          ? { ...(defaultFailurePage || DEFAULT_FAILURE_CONFIG) }
          : settings.customFailurePage,
      });
    }
  };

  const handleUpdateCustomPage = (type: 'success' | 'failure', config: ResultPageConfig) => {
    if (type === 'success') {
      onChange({ ...settings, customSuccessPage: config });
    } else {
      onChange({ ...settings, customFailurePage: config });
    }
  };

  const renderConfigFields = (
    config: ResultPageConfig,
    onUpdate: (config: ResultPageConfig) => void,
    type: 'success' | 'failure'
  ) => (
    <div className="space-y-4 pt-4">
      {/* Title */}
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={config.title}
          onChange={(e) => onUpdate({ ...config, title: e.target.value })}
          placeholder={type === 'success' ? 'Verification Complete' : 'Verification Failed'}
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Input
          value={config.subtitle || ''}
          onChange={(e) => onUpdate({ ...config, subtitle: e.target.value })}
          placeholder="A brief subtitle under the main title"
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          value={config.message || ''}
          onChange={(e) => onUpdate({ ...config, message: e.target.value })}
          placeholder="Additional details or instructions for the user"
          rows={3}
        />
      </div>

      {/* Toggle options */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Show Icon</Label>
          <p className="text-xs text-muted-foreground">Display the success/failure icon</p>
        </div>
        <Switch
          checked={config.showIcon !== false}
          onCheckedChange={(checked) => onUpdate({ ...config, showIcon: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Show Reference ID</Label>
          <p className="text-xs text-muted-foreground">Display the transaction reference</p>
        </div>
        <Switch
          checked={config.showReferenceId !== false}
          onCheckedChange={(checked) => onUpdate({ ...config, showReferenceId: checked })}
        />
      </div>

      {/* Button configuration */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Button Settings</h4>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={config.buttonText || ''}
              onChange={(e) => onUpdate({ ...config, buttonText: e.target.value })}
              placeholder={type === 'success' ? 'Continue' : 'Try Again'}
            />
          </div>

          {type === 'success' && (
            <div className="space-y-2">
              <Label>Button Action</Label>
              <Select
                value={config.buttonAction || 'url'}
                onValueChange={(v) => onUpdate({ ...config, buttonAction: v as ResultButtonAction })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">Redirect to URL</SelectItem>
                  <SelectItem value="portal">Go to account portal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {config.buttonAction === 'portal'
                  ? 'User will be logged into the industry portal'
                  : 'User will be redirected to the URL below'}
              </p>
            </div>
          )}

          {(config.buttonAction !== 'portal' || type === 'failure') && (
            <div className="space-y-2">
              <Label>Button URL (optional)</Label>
              <Input
                type="url"
                value={config.buttonUrl || ''}
                onChange={(e) => onUpdate({ ...config, buttonUrl: e.target.value })}
                placeholder="https://yoursite.com/next-step"
              />
            </div>
          )}
        </div>
      </div>

      {/* Custom HTML content */}
      <div className="border-t pt-4 mt-4">
        <div className="space-y-2">
          <Label>Custom HTML Content (optional)</Label>
          <Textarea
            value={config.customContent || ''}
            onChange={(e) => onUpdate({ ...config, customContent: e.target.value })}
            placeholder="<p>Additional custom HTML content...</p>"
            rows={3}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Completion Behavior
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-4 space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'success' | 'failure')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="success" className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Success
            </TabsTrigger>
            <TabsTrigger value="failure" className="flex items-center gap-2 text-xs">
              <XCircle className="w-3 h-3 text-red-500" />
              Failure
            </TabsTrigger>
          </TabsList>

          <TabsContent value="success" className="space-y-4">
            <RadioGroup
              value={settings.successPageMode}
              onValueChange={(v) => handleModeChange('success', v as ResultPageMode)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="success-default" />
                <Label htmlFor="success-default" className="cursor-pointer">
                  Use default from Results tab
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="success-custom" />
                <Label htmlFor="success-custom" className="cursor-pointer">
                  Use custom page for this step
                </Label>
              </div>
            </RadioGroup>

            {settings.successPageMode === 'custom' && settings.customSuccessPage && (
              renderConfigFields(
                settings.customSuccessPage,
                (config) => handleUpdateCustomPage('success', config),
                'success'
              )
            )}
          </TabsContent>

          <TabsContent value="failure" className="space-y-4">
            <RadioGroup
              value={settings.failurePageMode}
              onValueChange={(v) => handleModeChange('failure', v as ResultPageMode)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="failure-default" />
                <Label htmlFor="failure-default" className="cursor-pointer">
                  Use default from Results tab
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="failure-custom" />
                <Label htmlFor="failure-custom" className="cursor-pointer">
                  Use custom page for this step
                </Label>
              </div>
            </RadioGroup>

            {settings.failurePageMode === 'custom' && settings.customFailurePage && (
              renderConfigFields(
                settings.customFailurePage,
                (config) => handleUpdateCustomPage('failure', config),
                'failure'
              )
            )}
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
