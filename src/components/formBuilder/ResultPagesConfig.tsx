import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, ExternalLink, Settings2, Paintbrush, Sparkles, Upload, Loader2, Eye, ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { ResultPageConfig, ResultButtonAction, ResultPageMode, DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG, DEFAULT_LANDING_CONFIG } from '@/components/preview/ResultPage';
import { ResultPage } from '@/components/preview/ResultPage';
import type { FormStyleConfig } from '@/types/formStyle';
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

interface ResultPagesConfigProps {
  approvedUrl: string;
  rejectedUrl: string;
  returnUrl: string;
  successPageConfig?: ResultPageConfig;
  failurePageConfig?: ResultPageConfig;
  landingPageConfig?: ResultPageConfig;
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
}

export function ResultPagesConfig({
  approvedUrl,
  rejectedUrl,
  returnUrl,
  successPageConfig,
  failurePageConfig,
  landingPageConfig,
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
}: ResultPagesConfigProps) {
  type PageKey = 'success' | 'failure' | 'landing';
  const [selectedPage, setSelectedPage] = useState<PageKey | null>(null);
  const [urlSettingsOpen, setUrlSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState<null | PageKey>(null);
  const { toast } = useToast();

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
              <p className="text-xs text-muted-foreground">
                Leave empty to use the {type === 'success' ? 'Approved' : 'Rejected'} URL below
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
          Result Pages
        </CardTitle>
        <CardDescription>
          Customize the success and failure pages shown after verification. These are the default pages used unless a step specifies custom result pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Page Content Editor */}
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
            {demoSlug && (
              <div className="flex justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/demo/${demoSlug}?previewResult=success`, '_blank', 'noopener')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview in new window
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>{renderConfigFields(successConfig, onUpdateSuccessPage, 'success')}</div>
              <LivePreview
                config={{ ...successConfig, referenceId: successConfig.referenceId || 'PREVIEW-1234' }}
                formStyle={formStyle}
                buttonColor={buttonColor}
                mirrorHeaderHtml={mirrorHeaderHtml}
                mirrorFooterHtml={mirrorFooterHtml}
                mirrorCss={mirrorCss}
              />
            </div>
          </TabsContent>

          <TabsContent value="failure">
            {demoSlug && (
              <div className="flex justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/demo/${demoSlug}?previewResult=failure`, '_blank', 'noopener')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview in new window
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>{renderConfigFields(failureConfig, onUpdateFailurePage, 'failure')}</div>
              <LivePreview
                config={{ ...failureConfig, referenceId: failureConfig.referenceId || 'PREVIEW-1234' }}
                formStyle={formStyle}
                buttonColor={buttonColor}
                mirrorHeaderHtml={mirrorHeaderHtml}
                mirrorFooterHtml={mirrorFooterHtml}
                mirrorCss={mirrorCss}
              />
            </div>
          </TabsContent>
        </Tabs>

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
