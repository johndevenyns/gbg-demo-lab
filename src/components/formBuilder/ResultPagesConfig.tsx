import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, ExternalLink, Settings2, Paintbrush, Sparkles, Upload, Loader2, Eye, ArrowLeft, FileText, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ResultPageConfig, ResultButtonAction, ResultPageMode, DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG, DEFAULT_LANDING_CONFIG } from '@/components/preview/ResultPage';
import { ResultPage } from '@/components/preview/ResultPage';
import type { FormStyleConfig } from '@/types/formStyle';
import type { ExtraCustomPage } from '@/types/demo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ResultPageScreenshotConfig } from '@/components/preview/ResultPage';

function LivePreview({
  config,
  formStyle,
  buttonColor,
  mirrorHeaderHtml,
  mirrorFooterHtml,
  mirrorCss,
}: {
  config: ResultPageConfig;
  formStyle?: FormStyleConfig;
  buttonColor?: string;
  mirrorHeaderHtml?: string;
  mirrorFooterHtml?: string;
  mirrorCss?: string;
}) {
  return (
    <div className="lg:sticky lg:top-4 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Live Preview</Label>
        <span className="text-xs text-muted-foreground">{config.pageMode || 'default'}</span>
      </div>
      <div className="border rounded-md overflow-hidden bg-muted/30" style={{ height: 600 }}>
        <div className="w-full h-full overflow-auto">
          <ResultPage
            config={config}
            formStyle={formStyle}
            buttonColor={buttonColor}
            mirrorHeaderHtml={mirrorHeaderHtml}
            mirrorFooterHtml={mirrorFooterHtml}
            mirrorCss={mirrorCss}
            onButtonClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function ScreenshotSlotEditor({
  label,
  value,
  onChange,
  upload,
}: {
  label: string;
  value?: ResultPageScreenshotConfig;
  onChange: (next: ResultPageScreenshotConfig | undefined) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const cur = value || {};

  const handlePick = async (file: File) => {
    setBusy(true);
    const url = await upload(file);
    setBusy(false);
    if (url) onChange({ ...cur, url });
  };

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label} image</Label>
        {cur.url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Remove
          </Button>
        )}
      </div>
      {cur.url ? (
        <img src={cur.url} alt={`${label} preview`} className="w-full max-h-32 object-contain bg-muted rounded" />
      ) : (
        <div className="h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No image</div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
          {cur.url ? 'Replace' : 'Upload'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePick(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Height (px)</Label>
          <Input
            type="number"
            min={40}
            value={cur.height ?? ''}
            placeholder="auto"
            onChange={(e) => onChange({ ...cur, height: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
        </div>
        <div>
          <Label className="text-xs">Background</Label>
          <Input
            type="color"
            value={cur.bgColor || '#ffffff'}
            onChange={(e) => onChange({ ...cur, bgColor: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Display</Label>
          <Select
            value={cur.fitMode || 'contain'}
            onValueChange={(v) => onChange({ ...cur, fitMode: v as NonNullable<ResultPageScreenshotConfig['fitMode']> })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Fit (actual aspect)</SelectItem>
              <SelectItem value="cover">Cover (fill, may crop)</SelectItem>
              <SelectItem value="stretch">Stretch (fill, distort)</SelectItem>
              <SelectItem value="actual">Actual size</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Align X</Label>
          <Select
            value={cur.positionX || 'center'}
            onValueChange={(v) => onChange({ ...cur, positionX: v as NonNullable<ResultPageScreenshotConfig['positionX']> })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Align Y</Label>
          <Select
            value={cur.positionY || 'center'}
            onValueChange={(v) => onChange({ ...cur, positionY: v as NonNullable<ResultPageScreenshotConfig['positionY']> })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function SingleScreenshotEditor({
  config,
  onUpdate,
  upload,
}: {
  config: ResultPageConfig;
  onUpdate: (c: ResultPageConfig) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const handlePick = async (file: File) => {
    setBusy(true);
    const url = await upload(file);
    setBusy(false);
    if (url) onUpdate({ ...config, singleScreenshotUrl: url });
  };
  return (
    <div className="border rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium">Screenshot</Label>
        {config.singleScreenshotUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onUpdate({ ...config, singleScreenshotUrl: undefined })}>
            Remove
          </Button>
        )}
      </div>
      {config.singleScreenshotUrl ? (
        <img src={config.singleScreenshotUrl} alt="Screenshot preview" className="w-full max-h-48 object-contain bg-muted rounded" />
      ) : (
        <div className="h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No image</div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
          {config.singleScreenshotUrl ? 'Replace' : 'Upload'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePick(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Background</Label>
          <Input
            type="color"
            value={config.singleScreenshotBgColor || '#ffffff'}
            onChange={(e) => onUpdate({ ...config, singleScreenshotBgColor: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Padding top (px)</Label>
          <Input
            type="number"
            min={0}
            value={config.singleScreenshotPaddingTop ?? ''}
            placeholder="0"
            onChange={(e) => onUpdate({ ...config, singleScreenshotPaddingTop: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
        </div>
        <div>
          <Label className="text-xs">Padding bottom (px)</Label>
          <Input
            type="number"
            min={0}
            value={config.singleScreenshotPaddingBottom ?? ''}
            placeholder="0"
            onChange={(e) => onUpdate({ ...config, singleScreenshotPaddingBottom: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Display</Label>
        <Select
          value={config.singleScreenshotFitMode || 'contain'}
          onValueChange={(v) => onUpdate({ ...config, singleScreenshotFitMode: v as NonNullable<ResultPageConfig['singleScreenshotFitMode']> })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Fit (actual aspect)</SelectItem>
            <SelectItem value="cover">Cover (fill width)</SelectItem>
            <SelectItem value="stretch">Stretch (full width)</SelectItem>
            <SelectItem value="actual">Actual size</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface ResultPagesConfigProps {
  approvedUrl: string;
  rejectedUrl: string;
  returnUrl: string;
  successPageConfig?: ResultPageConfig;
  failurePageConfig?: ResultPageConfig;
  landingPageConfig?: ResultPageConfig;
  extraCustomPages?: ExtraCustomPage[];
  buttonColor?: string;
  demoId?: string;
  demoSlug?: string;
  formStyle?: FormStyleConfig;
  mirrorHeaderHtml?: string;
  mirrorFooterHtml?: string;
  mirrorCss?: string;
  onUpdateApprovedUrl: (url: string) => void;
  onUpdateRejectedUrl: (url: string) => void;
  onUpdateReturnUrl: (url: string) => void;
  onUpdateSuccessPage: (config: ResultPageConfig) => void;
  onUpdateFailurePage: (config: ResultPageConfig) => void;
  onUpdateLandingPage: (config: ResultPageConfig) => void;
  onUpdateExtraCustomPages?: (pages: ExtraCustomPage[]) => void;
}

export function ResultPagesConfig({
  approvedUrl,
  rejectedUrl,
  returnUrl,
  successPageConfig,
  failurePageConfig,
  landingPageConfig,
  extraCustomPages,
  buttonColor,
  demoId,
  demoSlug,
  formStyle,
  mirrorHeaderHtml,
  mirrorFooterHtml,
  mirrorCss,
  onUpdateApprovedUrl,
  onUpdateRejectedUrl,
  onUpdateReturnUrl,
  onUpdateSuccessPage,
  onUpdateFailurePage,
  onUpdateLandingPage,
  onUpdateExtraCustomPages,
}: ResultPagesConfigProps) {
  // PageKey is 'success' | 'failure' | 'landing' | `extra:<id>`
  type PageKey = string;
  const [selectedPage, setSelectedPage] = useState<PageKey | null>(null);
  const [urlSettingsOpen, setUrlSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const { toast } = useToast();
  const pages = extraCustomPages || [];

  // Use provided configs or defaults
  const successConfig = successPageConfig || DEFAULT_SUCCESS_CONFIG;
  const failureConfig = failurePageConfig || DEFAULT_FAILURE_CONFIG;
  const landingConfig = landingPageConfig || DEFAULT_LANDING_CONFIG;

  const uploadImage = async (file: File, slot: string): Promise<string | null> => {
    if (!demoId) {
      toast({ title: 'Save the demo first', description: 'Upload requires a saved demo.', variant: 'destructive' });
      return null;
    }
    const ext = file.name.split('.').pop() || 'png';
    const path = `${demoId}/result-${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('demo-logos').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    return supabase.storage.from('demo-logos').getPublicUrl(path).data.publicUrl;
  };

  const handleGenerateAi = async (config: ResultPageConfig, onUpdate: (c: ResultPageConfig) => void, type: PageKey) => {
    if (!config.aiPrompt || !config.aiPrompt.trim()) {
      toast({ title: 'Add a prompt', description: 'Describe what the page should look like.', variant: 'destructive' });
      return;
    }
    setGenerating(type);
    try {
      const { data, error } = await supabase.functions.invoke('generate-result-page', {
        body: {
          demoId,
          resultType: type,
          prompt: config.aiPrompt,
          title: config.title,
          subtitle: config.subtitle,
          message: config.message,
        },
      });
      if (error) throw error;
      const html = (data as { html?: string })?.html;
      if (!html) throw new Error('No HTML returned');
      onUpdate({ ...config, aiGeneratedHtml: html, aiGeneratedAt: new Date().toISOString() });
      toast({ title: 'Page generated', description: 'Saved as the AI page for this result.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const renderConfigFields = (
    config: ResultPageConfig,
    onUpdate: (config: ResultPageConfig) => void,
    type: PageKey
  ) => {
    const mode: ResultPageMode = config.pageMode || 'default';
    return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="space-y-2">
        <Label>Page Mode</Label>
        <Select value={mode} onValueChange={(v) => onUpdate({ ...config, pageMode: v as ResultPageMode })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default template</SelectItem>
            <SelectItem value="mirror">Mirror site layout (header + main + footer)</SelectItem>
            <SelectItem value="ai_generated">AI-generated page (Lovable AI)</SelectItem>
            <SelectItem value="custom_html">Fully custom HTML</SelectItem>
            <SelectItem value="screenshots">Screenshots (header/main/footer images)</SelectItem>
            <SelectItem value="single_screenshot">Single screenshot (one image + spacing + bg)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Debug borders toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Show Borders</Label>
          <p className="text-xs text-muted-foreground">Outline iframe / image slots to debug spacing</p>
        </div>
        <Switch
          checked={config.showBorders === true}
          onCheckedChange={(checked) => onUpdate({ ...config, showBorders: checked })}
        />
      </div>

      {/* === Default mode fields === */}
      {mode === 'default' && (
        <>
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
          {/* Custom HTML insert (default mode) */}
          <div className="border-t pt-4 mt-4 space-y-2">
            <Label>Custom HTML insert (optional)</Label>
            <Textarea
              value={config.customContent || ''}
              onChange={(e) => onUpdate({ ...config, customContent: e.target.value })}
              placeholder="<p>Additional custom HTML...</p>"
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}

      {/* === Mirror mode === */}
      {mode === 'mirror' && (
        <div className="space-y-2">
          <Label>Main content HTML</Label>
          <p className="text-xs text-muted-foreground">Rendered between the demo's scraped header & footer. Inline styles supported.</p>
          <Textarea
            value={config.mirrorMainHtml || ''}
            onChange={(e) => onUpdate({ ...config, mirrorMainHtml: e.target.value })}
            placeholder={`<div style="text-align:center;padding:48px 16px;">\n  <h1>${type === 'success' ? 'You are verified' : 'Verification failed'}</h1>\n  <p>Custom message here.</p>\n</div>`}
            rows={10}
            className="font-mono text-xs"
          />
        </div>
      )}

      {/* === Custom HTML mode === */}
      {mode === 'custom_html' && (
        <div className="space-y-2">
          <Label>Full page HTML</Label>
          <p className="text-xs text-muted-foreground">Renders as the entire result page. Scripts and iframes are stripped for safety.</p>
          <Textarea
            value={config.customHtml || ''}
            onChange={(e) => onUpdate({ ...config, customHtml: e.target.value })}
            placeholder="<section>...your full page...</section>"
            rows={14}
            className="font-mono text-xs"
          />
        </div>
      )}

      {/* === AI-generated mode === */}
      {mode === 'ai_generated' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Prompt for Lovable AI</Label>
            <Textarea
              value={config.aiPrompt || ''}
              onChange={(e) => onUpdate({ ...config, aiPrompt: e.target.value })}
              placeholder={type === 'success'
                ? 'A celebratory verification success page matching our brand, with a thank-you message and a clear continue button.'
                : 'A friendly verification-failed page with troubleshooting tips and a retry button.'}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              The AI receives your demo branding, mirrored site chrome, and verification outcome.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => handleGenerateAi(config, onUpdate, type)}
            disabled={generating === type}
            className="gap-2"
          >
            {generating === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {config.aiGeneratedHtml ? 'Regenerate page' : 'Generate page'}
          </Button>
          {config.aiGeneratedHtml && (
            <div className="space-y-2">
              <Label>Generated HTML (editable)</Label>
              <Textarea
                value={config.aiGeneratedHtml}
                onChange={(e) => onUpdate({ ...config, aiGeneratedHtml: e.target.value })}
                rows={10}
                className="font-mono text-xs"
              />
              {config.aiGeneratedAt && (
                <p className="text-xs text-muted-foreground">Last generated {new Date(config.aiGeneratedAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* === Screenshots mode === */}
      {mode === 'screenshots' && (
        <div className="space-y-4">
          {(['Header','Main','Footer'] as const).map((slot) => {
            const key = slot.toLowerCase() as 'header' | 'main' | 'footer';
            const cfgKey = (`screenshot${slot}`) as 'screenshotHeader' | 'screenshotMain' | 'screenshotFooter';
            const current = config[cfgKey];
            return (
              <ScreenshotSlotEditor
                key={slot}
                label={slot}
                value={current}
                onChange={(next) => onUpdate({ ...config, [cfgKey]: next })}
                upload={(file) => uploadImage(file, key)}
              />
            );
          })}
        </div>
      )}

      {/* === Single screenshot mode === */}
      {mode === 'single_screenshot' && (
        <div className="space-y-4">
          {/* Header source */}
          <div className="border rounded-md p-3 space-y-2">
            <Label className="font-medium">Header</Label>
            <Select
              value={config.headerSource || 'none'}
              onValueChange={(v) => onUpdate({ ...config, headerSource: v as 'none' | 'mirror' | 'upload' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No header</SelectItem>
                <SelectItem value="mirror">Use main site header</SelectItem>
                <SelectItem value="upload">Upload my own image</SelectItem>
              </SelectContent>
            </Select>
            {config.headerSource === 'upload' && (
              <ScreenshotSlotEditor
                label="Header"
                value={config.headerScreenshot}
                onChange={(next) => onUpdate({ ...config, headerScreenshot: next })}
                upload={(file) => uploadImage(file, 'header')}
              />
            )}
          </div>

          {/* Main */}
          <SingleScreenshotEditor
            config={config}
            onUpdate={onUpdate}
            upload={(file) => uploadImage(file, 'single')}
          />

          {/* Footer source */}
          <div className="border rounded-md p-3 space-y-2">
            <Label className="font-medium">Footer</Label>
            <Select
              value={config.footerSource || 'none'}
              onValueChange={(v) => onUpdate({ ...config, footerSource: v as 'none' | 'mirror' | 'upload' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No footer</SelectItem>
                <SelectItem value="mirror">Use main site footer</SelectItem>
                <SelectItem value="upload">Upload my own image</SelectItem>
              </SelectContent>
            </Select>
            {config.footerSource === 'upload' && (
              <ScreenshotSlotEditor
                label="Footer"
                value={config.footerScreenshot}
                onChange={(next) => onUpdate({ ...config, footerScreenshot: next })}
                upload={(file) => uploadImage(file, 'footer')}
              />
            )}
          </div>
        </div>
      )}

      {/* Button configuration */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Button Settings</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Button</Label>
              <p className="text-xs text-muted-foreground">Display an action button on this page</p>
            </div>
            <Switch
              checked={config.showButton !== false}
              onCheckedChange={(checked) => onUpdate({ ...config, showButton: checked })}
            />
          </div>

          {config.showButton !== false && (
          <>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={config.buttonText || ''}
              onChange={(e) => onUpdate({ ...config, buttonText: e.target.value })}
              placeholder={type === 'success' ? 'Continue' : 'Try Again'}
            />
          </div>

          {(type === 'success' || type === 'landing') && (
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
                  {type === 'success' && (
                    <SelectItem value="landing">Go to custom landing page</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {config.buttonAction === 'portal'
                  ? 'User will be logged into the industry portal'
                  : config.buttonAction === 'landing'
                  ? 'User will be taken to the custom Landing page you configure below'
                  : 'User will be redirected to the URL below'}
              </p>
            </div>
          )}

          {config.buttonAction !== 'portal' && config.buttonAction !== 'landing' && (
            <div className="space-y-2">
              <Label>Button URL (optional)</Label>
              <Input
                type="url"
                value={config.buttonUrl || ''}
                onChange={(e) => onUpdate({ ...config, buttonUrl: e.target.value })}
                placeholder="https://yoursite.com/next-step"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the {type === 'success' ? 'Approved' : type === 'failure' ? 'Rejected' : 'default'} URL below
              </p>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5" />
          Custom Pages
        </CardTitle>
        <CardDescription>
          The default pages shown after verification. Edit Success, Failure, and your custom Landing page. Steps may override these with their own custom result pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Page list / editor */}
        {selectedPage === null ? (
          <div className="space-y-3">
            {([
              {
                key: 'success' as const,
                label: 'Success Page',
                description: 'Shown when verification succeeds.',
                icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                cfg: successConfig,
                previewParam: 'success',
              },
              {
                key: 'failure' as const,
                label: 'Failure Page',
                description: 'Shown when verification fails.',
                icon: <XCircle className="w-5 h-5 text-red-500" />,
                cfg: failureConfig,
                previewParam: 'failure',
              },
              {
                key: 'landing' as const,
                label: 'Custom Landing Page',
                description: 'Optional page you can link to from the Success page button.',
                icon: <FileText className="w-5 h-5 text-primary" />,
                cfg: landingConfig,
                previewParam: 'landing',
              },
            ]).map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {row.icon}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{row.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.cfg.title} — {row.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Mode: <span className="font-mono">{row.cfg.pageMode || 'default'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {demoSlug && row.key !== 'landing' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/demo/${demoSlug}?previewResult=${row.previewParam}`, '_blank', 'noopener')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setSelectedPage(row.key)}>
                    Edit
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Extra custom pages */}
            {pages.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      /demo/{demoSlug || ':slug'}/page/{p.slug}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Mode: <span className="font-mono">{p.config.pageMode || 'default'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {demoSlug && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/demo/${demoSlug}/page/${p.slug}`, '_blank', 'noopener')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!onUpdateExtraCustomPages) return;
                      if (!confirm(`Delete "${p.name}"?`)) return;
                      onUpdateExtraCustomPages(pages.filter((x) => x.id !== p.id));
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => setSelectedPage(`extra:${p.id}`)}>
                    Edit
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}

            {/* New page button */}
            {onUpdateExtraCustomPages && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const name = prompt('Page name?', `Custom Page ${pages.length + 1}`);
                  if (!name) return;
                  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `page-${pages.length + 1}`;
                  let slug = baseSlug;
                  let i = 2;
                  while (pages.some((x) => x.slug === slug)) slug = `${baseSlug}-${i++}`;
                  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `p_${Date.now()}`;
                  const newPage: ExtraCustomPage = {
                    id,
                    slug,
                    name,
                    config: { ...DEFAULT_LANDING_CONFIG, title: name, pageMode: 'single_screenshot' },
                  };
                  onUpdateExtraCustomPages([...pages, newPage]);
                  setSelectedPage(`extra:${id}`);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New custom page
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPage(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to pages
              </Button>
              {demoSlug && selectedPage !== 'landing' && (selectedPage === 'success' || selectedPage === 'failure' || selectedPage.startsWith('extra:')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedPage.startsWith('extra:')) {
                      const id = selectedPage.slice('extra:'.length);
                      const p = pages.find((x) => x.id === id);
                      if (p) window.open(`/demo/${demoSlug}/page/${p.slug}`, '_blank', 'noopener');
                    } else {
                      window.open(`/demo/${demoSlug}?previewResult=${selectedPage}`, '_blank', 'noopener');
                    }
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview in new window
                </Button>
              )}
            </div>
            {(() => {
              let cfg: ResultPageConfig;
              let upd: (c: ResultPageConfig) => void;
              let typeKey: string = selectedPage;
              if (selectedPage === 'success') { cfg = successConfig; upd = onUpdateSuccessPage; }
              else if (selectedPage === 'failure') { cfg = failureConfig; upd = onUpdateFailurePage; }
              else if (selectedPage === 'landing') { cfg = landingConfig; upd = onUpdateLandingPage; }
              else if (selectedPage.startsWith('extra:')) {
                const id = selectedPage.slice('extra:'.length);
                const p = pages.find((x) => x.id === id);
                if (!p || !onUpdateExtraCustomPages) return null;
                cfg = p.config;
                upd = (c: ResultPageConfig) => onUpdateExtraCustomPages(pages.map((x) => x.id === id ? { ...x, config: c } : x));
                typeKey = 'extra';
              } else { return null; }
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {selectedPage.startsWith('extra:') && onUpdateExtraCustomPages && (() => {
                      const id = selectedPage.slice('extra:'.length);
                      const p = pages.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-muted/30">
                          <div>
                            <Label className="text-xs">Page name</Label>
                            <Input
                              value={p.name}
                              onChange={(e) => onUpdateExtraCustomPages(pages.map((x) => x.id === id ? { ...x, name: e.target.value } : x))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Slug (URL)</Label>
                            <Input
                              value={p.slug}
                              onChange={(e) => {
                                const next = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                onUpdateExtraCustomPages(pages.map((x) => x.id === id ? { ...x, slug: next } : x));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                    {renderConfigFields(cfg, upd, typeKey)}
                  </div>
                  <LivePreview
                    config={{ ...cfg, referenceId: cfg.referenceId || 'PREVIEW-1234' }}
                    formStyle={formStyle}
                    buttonColor={buttonColor}
                    mirrorHeaderHtml={mirrorHeaderHtml}
                    mirrorFooterHtml={mirrorFooterHtml}
                    mirrorCss={mirrorCss}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* Redirect URL Settings - Collapsible */}
        <Collapsible open={urlSettingsOpen} onOpenChange={setUrlSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Redirect URL Settings
              </span>
              <Settings2 className={`w-4 h-4 transition-transform ${urlSettingsOpen ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            {/* Success Redirect URL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <Label className="font-medium">Approved URL</Label>
              </div>
              <Input
                type="url"
                placeholder="https://yoursite.com/verified"
                value={approvedUrl}
                onChange={(e) => onUpdateApprovedUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Redirect users after clicking the success page button
              </p>
            </div>

            {/* Failure Redirect URL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <Label className="font-medium">Rejected URL</Label>
              </div>
              <Input
                type="url"
                placeholder="https://yoursite.com/verification-failed"
                value={rejectedUrl}
                onChange={(e) => onUpdateRejectedUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Redirect users after clicking the failure page button
              </p>
            </div>

            {/* Default Return URL */}
            <div className="space-y-2">
              <Label className="font-medium">Default Return URL</Label>
              <Input
                type="url"
                placeholder="https://yoursite.com/return"
                value={returnUrl}
                onChange={(e) => onUpdateReturnUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Fallback URL if specific approved/rejected URLs aren't set
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Export default configs for use elsewhere
export { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG };
