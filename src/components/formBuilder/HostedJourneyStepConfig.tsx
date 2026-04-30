import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, ExternalLink } from 'lucide-react';
import { FormStep, HostedJourneyStepConfig as HostedJourneyStepConfigType } from '@/types/demo';

interface Props {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function HostedJourneyStepConfig({ step, onUpdateStep }: Props) {
  const config: HostedJourneyStepConfigType = step.hostedJourneyConfig || {
    url: '',
    height: '600px',
    allowFullScreen: true,
  };

  const update = (updates: Partial<HostedJourneyStepConfigType>) => {
    onUpdateStep({ hostedJourneyConfig: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="border-2 border-dashed border-sky-500/30 rounded-lg p-6 bg-sky-500/5 text-center">
        <Globe className="w-10 h-10 mx-auto mb-2 text-sky-500/70" />
        <p className="text-sm font-medium text-sky-700 dark:text-sky-300">Hosted Journey iframe</p>
        <p className="text-xs text-muted-foreground break-all mt-1">
          {config.url ? config.url : 'Enter a URL below to load it inside the demo flow'}
        </p>
      </div>

      <Card className="border-sky-500/30 bg-sky-500/5">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Journey URL
            </Label>
            <Input
              value={config.url || ''}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://example.com/journey/start"
              className="bg-background font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The URL that will load in the iframe when this step is reached. You can use{' '}
              <code className="px-1 py-0.5 bg-muted rounded">{'{{fieldName}}'}</code> to inject
              values from prior steps (e.g. session id from an API response).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Iframe Height</Label>
              <Input
                value={config.height || ''}
                onChange={(e) => update({ height: e.target.value })}
                placeholder="600px"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">CSS value (e.g. 600px, 80vh).</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Allow Fullscreen</Label>
              <div className="h-10 flex items-center">
                <Switch
                  checked={config.allowFullScreen ?? true}
                  onCheckedChange={(v) => update({ allowFullScreen: v })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}