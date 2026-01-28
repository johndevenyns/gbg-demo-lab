import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ResultPageConfig, DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from '@/components/preview/ResultPage';

interface ResultPageEditorProps {
  successConfig: ResultPageConfig;
  failureConfig: ResultPageConfig;
  onUpdateSuccess: (config: ResultPageConfig) => void;
  onUpdateFailure: (config: ResultPageConfig) => void;
}

export function ResultPageEditor({
  successConfig,
  failureConfig,
  onUpdateSuccess,
  onUpdateFailure,
}: ResultPageEditorProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'failure'>('success');

  const renderConfigFields = (
    config: ResultPageConfig,
    onUpdate: (config: ResultPageConfig) => void,
    type: 'success' | 'failure'
  ) => (
    <div className="space-y-4">
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

          <div className="space-y-2">
            <Label>Button URL (optional)</Label>
            <Input
              type="url"
              value={config.buttonUrl || ''}
              onChange={(e) => onUpdate({ ...config, buttonUrl: e.target.value })}
              placeholder="https://yoursite.com/next-step"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to close the modal or use default redirect
            </p>
          </div>
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
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Add custom HTML to display additional content, links, or instructions
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Result Pages</CardTitle>
        <CardDescription>
          Customize the success and failure pages shown after verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'success' | 'failure')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="success" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Success Page
            </TabsTrigger>
            <TabsTrigger value="failure" className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Failure Page
            </TabsTrigger>
          </TabsList>

          <TabsContent value="success">
            {renderConfigFields(successConfig, onUpdateSuccess, 'success')}
          </TabsContent>

          <TabsContent value="failure">
            {renderConfigFields(failureConfig, onUpdateFailure, 'failure')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Export default configs for use elsewhere
export { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG };
