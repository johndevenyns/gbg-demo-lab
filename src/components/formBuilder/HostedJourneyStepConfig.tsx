import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    mode: 'iframe',
  };

  const update = (updates: Partial<HostedJourneyStepConfigType>) => {
    onUpdateStep({ hostedJourneyConfig: { ...config, ...updates } });
  };

  const mode = config.mode || 'iframe';

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
            <Label className="text-sm">Display Mode</Label>
            <Select value={mode} onValueChange={(v) => update({ mode: v as 'iframe' | 'popup' })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iframe">Embed in page (iframe)</SelectItem>
                <SelectItem value="popup">Open in popup window</SelectItem>
              </SelectContent>
            </Select>
            {mode === 'iframe' && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Many hosted verification providers (e.g. GBG Go, Trinsic) block iframe
                  embedding via <code>X-Frame-Options</code> or CSP. If the page loads in a
                  normal browser tab but appears blank here, switch to <strong>Open in
                  popup window</strong>.
                </span>
              </div>
            )}
          </div>

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

          {mode === 'iframe' ? (
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
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border bg-background p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show heading & description</Label>
                  <p className="text-xs text-muted-foreground">
                    Display a title and short message above the launch button.
                  </p>
                </div>
                <Switch
                  checked={config.showLaunchText ?? true}
                  onCheckedChange={(v) => update({ showLaunchText: v })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Launch Screen Title</Label>
                <Input
                  value={config.launchTitle ?? ''}
                  onChange={(e) => update({ launchTitle: e.target.value })}
                  placeholder="Continue your verification"
                  className="bg-background"
                  disabled={config.showLaunchText === false}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Launch Screen Description</Label>
                <Input
                  value={config.launchDescription ?? ''}
                  onChange={(e) => update({ launchDescription: e.target.value })}
                  placeholder="A new window will open to complete the next step."
                  className="bg-background"
                  disabled={config.showLaunchText === false}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Button Label</Label>
                  <Input
                    value={config.launchButtonLabel ?? ''}
                    onChange={(e) => update({ launchButtonLabel: e.target.value })}
                    placeholder="Launch verification"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Popup Width</Label>
                  <Input
                    type="number"
                    value={config.popupWidth ?? ''}
                    onChange={(e) =>
                      update({ popupWidth: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="1024"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Popup Height</Label>
                  <Input
                    type="number"
                    value={config.popupHeight ?? ''}
                    onChange={(e) =>
                      update({ popupHeight: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="768"
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border bg-background p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Show QR code</Label>
                  <p className="text-xs text-muted-foreground">
                    Render a scannable QR of the journey URL so users can continue on mobile.
                  </p>
                </div>
                <Switch
                  checked={config.showQrCode ?? false}
                  onCheckedChange={(v) => update({ showQrCode: v })}
                />
              </div>
              {config.showQrCode && (
                <div className="space-y-2">
                  <Label className="text-sm">QR Code Caption</Label>
                  <Input
                    value={config.qrCodeLabel ?? ''}
                    onChange={(e) => update({ qrCodeLabel: e.target.value })}
                    placeholder="Or scan to continue on your phone"
                    className="bg-background"
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                The popup must be triggered by a user click (browser requirement). After the
                user finishes in the popup, they can close it and click <em>Next</em> to
                continue the demo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}