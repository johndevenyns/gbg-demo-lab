import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormStep, ApiStepConfig as ApiStepConfigType } from '@/types/demo';
import { Plug, Eye, Clock } from 'lucide-react';

interface ApiStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function ApiStepConfig({ step, onUpdateStep }: ApiStepConfigProps) {
  const config = step.apiStepConfig || {
    method: 'POST',
    autoAdvanceOnSuccess: true,
    autoAdvanceDelay: 2,
  };

  const handleConfigChange = (updates: Partial<ApiStepConfigType>) => {
    onUpdateStep({
      apiStepConfig: { ...config, ...updates }
    });
  };

  const handleFieldsChange = (fields: string) => {
    const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean);
    handleConfigChange({ includeFields: fieldList.length > 0 ? fieldList : undefined });
  };

  const handleResponseDisplayChange = (fields: string) => {
    const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean);
    handleConfigChange({ responseDisplayFields: fieldList.length > 0 ? fieldList : undefined });
  };

  return (
    <div className="space-y-4">
      {/* API Preview */}
      <div className={`border-2 border-dashed rounded-lg p-6 ${config.endpointUrl ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
        <div className="flex items-center justify-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.endpointUrl ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
            <Plug className={`w-8 h-8 ${config.endpointUrl ? 'text-green-600' : 'text-yellow-600'}`} />
          </div>
          <div className="text-center">
            <p className={`text-lg font-semibold ${config.endpointUrl ? 'text-green-600' : 'text-yellow-600'}`}>
              {config.endpointUrl ? 'API Submission Step' : 'API Step (Mock Mode)'}
            </p>
            <p className="text-sm text-muted-foreground">
              {config.method || 'POST'} → {config.endpointUrl || '(no endpoint - will use mock data)'}
            </p>
            {!config.endpointUrl && (
              <p className="text-xs text-yellow-600 mt-1">
                Configure an endpoint URL below to make real API calls
              </p>
            )}
            {config.responseDisplayFields && config.responseDisplayFields.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Displaying: {config.responseDisplayFields.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">HTTP Method</Label>
              <Select
                value={config.method || 'POST'}
                onValueChange={(v) => handleConfigChange({ method: v as 'GET' | 'POST' | 'PUT' | 'PATCH' })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Endpoint URL</Label>
              <Input
                value={config.endpointUrl || ''}
                onChange={(e) => handleConfigChange({ endpointUrl: e.target.value })}
                placeholder="https://api.example.com/verify"
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Plug className="w-4 h-4" />
              Fields to Submit
            </Label>
            <Input
              value={config.includeFields?.join(', ') || ''}
              onChange={(e) => handleFieldsChange(e.target.value)}
              placeholder="Leave empty for all previous step fields"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated field names from previous steps. Empty = all available fields.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Response Fields to Display
            </Label>
            <Input
              value={config.responseDisplayFields?.join(', ') || ''}
              onChange={(e) => handleResponseDisplayChange(e.target.value)}
              placeholder="e.g., referenceId, status, transactionId"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              API response fields to show in the UI after submission.
            </p>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Auto-advance on Success
              </Label>
              <Switch
                checked={config.autoAdvanceOnSuccess ?? true}
                onCheckedChange={(v) => handleConfigChange({ autoAdvanceOnSuccess: v })}
              />
            </div>
            
            {config.autoAdvanceOnSuccess && (
              <div className="space-y-2">
                <Label className="text-sm">Delay (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={config.autoAdvanceDelay ?? 2}
                  onChange={(e) => handleConfigChange({ autoAdvanceDelay: parseInt(e.target.value) || 0 })}
                  className="bg-background w-24"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
