import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BufferedInput } from '@/components/ui/buffered-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, ExternalLink, AlertTriangle, QrCode, Link2, Settings2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DemoEnvironment, FormStep, HostedJourneyStepConfig as HostedJourneyStepConfigType } from '@/types/demo';
import { useVerificationTypes } from '@/hooks/useVerificationAdmin';
import { useAdminResourceIdsForUser } from '@/hooks/useAdminResourceIds';
import { StepCompletionActionsConfig } from './StepCompletionActionsConfig';

interface Props {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
  demo?: DemoEnvironment;
}

export function HostedJourneyStepConfig({ step, onUpdateStep, demo }: Props) {
  const config: HostedJourneyStepConfigType = step.hostedJourneyConfig || {
    url: '',
    height: '600px',
    allowFullScreen: true,
    mode: 'iframe',
  };
  const { data: verificationTypes = [] } = useVerificationTypes(true);
  const { data: adminResourceIds = [] } = useAdminResourceIdsForUser(demo?.createdBy);
  const isGo = config.provider === 'gbg_go';
  const globalDefault = verificationTypes.find((type) => type.typeKey === 'hosted_journey')?.defaultResourceId || '';
  const adminDefault = adminResourceIds.find((item) => item.typeKey === 'hosted_journey')?.resourceId || '';
  const demoDefault = demo?.resourceIdHostedJourney || '';
  const inheritedResourceId = demoDefault || adminDefault || globalDefault;
  const inheritedSource = demoDefault ? 'Demo' : adminDefault ? 'Admin' : globalDefault ? 'Global' : 'Backend fallback';
  const [resourceMode, setResourceMode] = useState<'inherit' | 'custom'>(config.resourceId ? 'custom' : 'inherit');
  const [localResourceId, setLocalResourceId] = useState(config.resourceId || '');

  useEffect(() => {
    setLocalResourceId(config.resourceId || '');
    setResourceMode(config.resourceId ? 'custom' : 'inherit');
  }, [config.resourceId]);

  const update = (updates: Partial<HostedJourneyStepConfigType>) => {
    onUpdateStep({ hostedJourneyConfig: { ...config, ...updates } });
  };

  const configuredMode = config.mode || 'iframe';
  const effectiveMode = isGo ? 'popup' : configuredMode;

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-sky-500/30 rounded-lg p-6 bg-sky-500/5 text-center">
        <Globe className="w-10 h-10 mx-auto mb-2 text-sky-500/70" />
        <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
          {isGo ? 'GBG GO hosted journey' : 'Hosted Journey'}
        </p>
        <p className="text-xs text-muted-foreground break-all mt-1">
          {isGo
            ? 'Fresh one-time journey link · new window · mobile QR · automatic result'
            : config.url || 'Enter a URL below to load it inside the demo flow'}
        </p>
      </div>

      <Card className="border-sky-500/30 bg-sky-500/5">
        <CardContent className="pt-4 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">Journey Provider</Label>
            <Select
              value={config.provider || 'url'}
              onValueChange={(value) => update({
                provider: value as 'url' | 'gbg_go',
                ...(value === 'gbg_go' ? { mode: 'popup', showQrCode: config.showQrCode ?? true, showUrl: config.showUrl ?? true, startTrigger: config.startTrigger ?? 'startButton' } : {}),
              })}
            >
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="url">Fixed URL</SelectItem>
                <SelectItem value="gbg_go">GBG GO hosted journey</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isGo ? (
            <div className="space-y-3 rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Resource ID</Label>
                <Badge variant="outline">{resourceMode === 'custom' ? 'Step override' : inheritedSource}</Badge>
              </div>
              <Select
                value={resourceMode}
                onValueChange={(value) => {
                  const mode = value as 'inherit' | 'custom';
                  setResourceMode(mode);
                  if (mode === 'inherit') update({ resourceId: undefined });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit demo → admin → global</SelectItem>
                  <SelectItem value="custom">Custom for this step</SelectItem>
                </SelectContent>
              </Select>
              {resourceMode === 'custom' ? (
                <Input
                  value={localResourceId}
                  onChange={(event) => setLocalResourceId(event.target.value)}
                  onBlur={() => update({ resourceId: localResourceId.trim() || undefined })}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  placeholder="Enter this journey's Resource ID"
                  className="font-mono text-sm"
                />
              ) : (
                <code className="block rounded border bg-muted px-2 py-2 text-xs break-all">
                  {inheritedResourceId || 'Secure backend default'}
                </code>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Demo: {demoDefault ? 'set' : 'not set'}</span>
                <span>Admin: {adminDefault ? 'set' : 'not set'}</span>
                <span>Global: {globalDefault ? 'set' : 'not set'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set demo defaults under Verification Types, admin defaults under My Resource IDs, and global defaults under Verification settings.
              </p>
              <div className="space-y-2">
                <Label className="text-sm">Journey Version</Label>
                <Input
                  value={config.version || ''}
                  onChange={(event) => update({ version: event.target.value })}
                  placeholder="latest"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Start Journey</Label>
                <Select
                  value={config.startTrigger || 'startButton'}
                  onValueChange={(value) => update({ startTrigger: value as 'onEnter' | 'previousStep' | 'startButton' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startButton">Show a start button on this step</SelectItem>
                    <SelectItem value="onEnter">When this step opens</SelectItem>
                    <SelectItem value="previousStep">From the previous step's button</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  "Show a start button" displays a built-in Get Started screen on this step — clicking it calls GO and then reveals the URL and QR code. "From the previous step's button" starts the journey when the user clicks Next on the step before this one.
                </p>
              </div>
              {(config.startTrigger || 'startButton') === 'startButton' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Start Title</Label>
                    <BufferedInput value={config.startTitle ?? ''} onValueChange={(v) => update({ startTitle: v })} placeholder="Verify your identity" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Start Description</Label>
                    <BufferedInput value={config.startDescription ?? ''} onValueChange={(v) => update({ startDescription: v })} placeholder="Click below to begin the verification." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Start Button Label</Label>
                    <BufferedInput value={config.startButtonLabel ?? ''} onValueChange={(v) => update({ startButtonLabel: v })} placeholder="Get Started" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2"><ExternalLink className="w-4 h-4" />Journey URL</Label>
              <Input
                value={config.url || ''}
                onChange={(event) => update({ url: event.target.value })}
                placeholder="https://example.com/journey/start"
                className="bg-background font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="px-1 py-0.5 bg-muted rounded">{'{{fieldName}}'}</code> to insert values from earlier steps.
              </p>
            </div>
          )}

          {!isGo && (
            <div className="space-y-2">
              <Label className="text-sm">Display Mode</Label>
              <Select value={configuredMode} onValueChange={(value) => update({ mode: value as 'iframe' | 'popup' })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iframe">Embed in page</SelectItem>
                  <SelectItem value="popup">Open in new window</SelectItem>
                </SelectContent>
              </Select>
              {configuredMode === 'iframe' && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>If the provider blocks embedding and appears blank, switch to <strong>Open in new window</strong>.</span>
                </div>
              )}
            </div>
          )}

          {effectiveMode === 'iframe' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Iframe Height</Label>
                <Input value={config.height || ''} onChange={(event) => update({ height: event.target.value })} placeholder="600px" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Allow Fullscreen</Label>
                <div className="h-10 flex items-center">
                  <Switch checked={config.allowFullScreen ?? true} onCheckedChange={(value) => update({ allowFullScreen: value })} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-md border bg-background p-3">
              <Label className="text-sm font-medium flex items-center gap-2"><Settings2 className="w-4 h-4" />Launch Screen</Label>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Show heading and description</Label>
                <Switch checked={config.showLaunchText ?? true} onCheckedChange={(value) => update({ showLaunchText: value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Title</Label>
                  <Input value={config.launchTitle ?? ''} onChange={(event) => update({ launchTitle: event.target.value })} placeholder="Continue in a new window" disabled={config.showLaunchText === false} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <Input value={config.launchDescription ?? ''} onChange={(event) => update({ launchDescription: event.target.value })} placeholder="Complete verification in the window that opens." disabled={config.showLaunchText === false} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm flex items-center gap-2"><ExternalLink className="w-4 h-4" />Show new-window button</Label>
                <Switch checked={config.showLaunchButton ?? true} onCheckedChange={(value) => update({ showLaunchButton: value })} />
              </div>
              {(config.showLaunchButton ?? true) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Button Label</Label>
                    <BufferedInput value={config.launchButtonLabel ?? ''} onValueChange={(v) => update({ launchButtonLabel: v })} placeholder="Continue in a new window" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Window Width</Label>
                    <Input type="number" value={config.popupWidth ?? ''} onChange={(event) => update({ popupWidth: event.target.value ? Number(event.target.value) : undefined })} placeholder="1024" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Window Height</Label>
                    <Input type="number" value={config.popupHeight ?? ''} onChange={(event) => update({ popupHeight: event.target.value ? Number(event.target.value) : undefined })} placeholder="768" />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm flex items-center gap-2"><QrCode className="w-4 h-4" />Show mobile QR code</Label>
                <Switch checked={config.showQrCode ?? isGo} onCheckedChange={(value) => update({ showQrCode: value })} />
              </div>
              {(config.showQrCode ?? isGo) && (
                <Input value={config.qrCodeLabel ?? ''} onChange={(event) => update({ qrCodeLabel: event.target.value })} placeholder="Or scan to continue on your phone" />
              )}
              {isGo && (
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4" />Show journey URL</Label>
                  <Switch checked={config.showUrl ?? true} onCheckedChange={(value) => update({ showUrl: value })} />
                </div>
              )}
              {isGo && <p className="text-xs text-muted-foreground">GO reports completion automatically and the configured success or failure actions run immediately.</p>}
            </div>
          )}

          {!isGo && (
            <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Simulate success after delay</Label>
                <Switch checked={(config.autoCompleteAfterSeconds ?? 0) > 0} onCheckedChange={(value) => update({ autoCompleteAfterSeconds: value ? 10 : undefined })} />
              </div>
              {(config.autoCompleteAfterSeconds ?? 0) > 0 && (
                <Input type="number" min={1} value={config.autoCompleteAfterSeconds ?? 10} onChange={(event) => update({ autoCompleteAfterSeconds: event.target.value ? Math.max(1, Number(event.target.value)) : undefined })} className="w-32" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <StepCompletionActionsConfig
        config={step.stepCompletionConfig}
        onChange={(stepCompletionConfig) => onUpdateStep({ stepCompletionConfig })}
        inline
        demoSlug={demo?.slug}
        extraCustomPages={demo?.extraCustomPages}
        successPageConfig={demo?.successPageConfig}
        failurePageConfig={demo?.failurePageConfig}
      />
    </div>
  );
}