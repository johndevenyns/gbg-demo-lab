import { useState } from 'react';
import { Globe, Loader2, Paintbrush, CheckCircle, AlertCircle, Search, Wand2, ListPlus } from 'lucide-react';
import { CompareFixButton } from './CompareFixButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { FormStyleConfig } from '@/types/formStyle';
import { scrapingApi, FormElementStyles, CapturedFormData, ExtractedField } from '@/lib/api/scraping';
import { FormStep, FormField, FormFieldType } from '@/types/demo';
import { capturedFormDataToConfig } from '@/lib/formStyleUtils';

interface ExactCaptureSectionProps {
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  isActive: boolean;
  /** Optional: when provided, enables a "Generate Form Steps" button that builds workflow steps from the captured fields. */
  onGenerateFormSteps?: (steps: FormStep[]) => void;
}

export function ExactCaptureSection({
  formStyle,
  onUpdateStyle,
  isActive,
  onGenerateFormSteps,
}: ExactCaptureSectionProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineScore, setRefineScore] = useState<number | null>(null);
  const [captureFormId, setCaptureFormId] = useState(formStyle.capturedFormId || '');
  const [captureUrl, setCaptureUrl] = useState(formStyle.capturedSourceUrl || formStyle.formStyleUrl || '');
  const [captureTrigger, setCaptureTrigger] = useState<string>('');
  const [capturedData, setCapturedData] = useState<CapturedFormData | null>(null);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [captureMessage, setCaptureMessage] = useState<string>('');
  const [availableFormIds, setAvailableFormIds] = useState<string[]>([]);
  const [originalScreenshot, setOriginalScreenshot] = useState<string | null>(null);

  const handleAutoDetect = async () => {
    if (!captureUrl) {
      toast({ title: 'URL required', description: 'Enter the customer site URL first', variant: 'destructive' });
      return;
    }
    setIsDiscovering(true);
    setCaptureStatus('capturing');
    setCaptureMessage('Crawling site for application/contact forms...');
    try {
      const res = await scrapingApi.discoverForms(captureUrl, { formType: 'any', maxPages: 6 });
      if (!res.success || !res.data) throw new Error(res.error || 'No forms found');
      const best = res.data.best;
      setCaptureUrl(best.pageUrl);
      setCaptureFormId(best.formId || '');
      setCaptureStatus('idle');
      setCaptureMessage('');
      toast({
        title: 'Form found',
        description: `Best match: ${best.detectedKind} form (${best.fieldCount} fields) on ${new URL(best.pageUrl).pathname}. Click Capture to extract it.`,
      });
    } catch (e) {
      setCaptureStatus('error');
      setCaptureMessage(e instanceof Error ? e.message : 'Discovery failed');
      toast({ title: 'Discovery failed', description: e instanceof Error ? e.message : 'Could not find a form', variant: 'destructive' });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleRefineWithAi = async () => {
    if (!originalScreenshot || !formStyle.capturedFormHtml) {
      toast({ title: 'Capture a form first', description: 'Refinement requires a captured form and original screenshot.', variant: 'destructive' });
      return;
    }
    setIsRefining(true);
    setRefineScore(null);
    try {
      const res = await scrapingApi.refineFormCapture(
        originalScreenshot,
        formStyle.capturedFormHtml,
        formStyle.capturedFormCss || '',
      );
      if (!res.success || !res.data) throw new Error(res.error || 'Refinement failed');
      const additional = res.data.additionalCss || '';
      const updated: FormStyleConfig = {
        ...formStyle,
        capturedFormCss: (formStyle.capturedFormCss || '') + '\n\n/* AI refinements */\n' + additional,
      };
      const c = res.data.detectedColors;
      if (c) {
        if (c.buttonBgColor) {
          updated.buttonBgColor = c.buttonBgColor;
          updated.buttonHoverBgColor = getSmartHoverColor(c.buttonBgColor);
        }
        if (c.buttonTextColor) updated.buttonTextColor = c.buttonTextColor;
        if (c.inputBorderColor) updated.inputBorderColor = c.inputBorderColor;
        if (c.inputFocusBorderColor) updated.inputFocusBorderColor = c.inputFocusBorderColor;
        if (c.labelColor) updated.labelColor = c.labelColor;
        if (c.formBgColor) updated.formBgColor = c.formBgColor;
      }
      onUpdateStyle(updated);
      setRefineScore(res.data.matchScore);
      toast({ title: 'AI refinement applied', description: `Match score: ${res.data.matchScore}% — ${res.data.changes.length} change(s) applied.` });
    } catch (e) {
      toast({ title: 'Refinement failed', description: e instanceof Error ? e.message : 'Could not refine', variant: 'destructive' });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateSteps = () => {
    const fields = capturedData?.extractedFields;
    if (!fields || fields.length === 0) {
      toast({ title: 'No fields detected', description: 'Re-capture the form to extract field metadata.', variant: 'destructive' });
      return;
    }
    if (!onGenerateFormSteps) return;
    const formFields: FormField[] = fields.map((f, i) => ({
      id: `f-${Date.now()}-${i}`,
      type: (f.canonicalType as FormFieldType) || 'text',
      label: f.label || f.name,
      name: f.name || `field_${i}`,
      placeholder: f.placeholder || undefined,
      required: f.required,
      order: i + 1,
    }));
    const step: FormStep = {
      id: `step-${Date.now()}`,
      title: 'Application',
      description: 'Auto-generated from captured form',
      order: 1,
      fields: formFields,
    };
    onGenerateFormSteps([step]);
    toast({ title: 'Form steps generated', description: `Created ${formFields.length} matching field(s) in the workflow builder.` });
  };

  const handleCaptureFormById = async () => {
    if (!captureUrl) {
      toast({
        title: 'URL required',
        description: 'Please enter the URL of the page containing the form',
        variant: 'destructive',
      });
      return;
    }

    setIsCapturing(true);
    setCaptureStatus('capturing');
    setCaptureMessage(captureFormId 
      ? `Fetching page and extracting form "${captureFormId}"...`
      : 'Fetching page and extracting first form...');

    try {
      const response = await scrapingApi.captureFormById(
        captureUrl,
        captureFormId || '', // Pass empty string if not specified - backend will find first form
        {
          triggerSelector: captureTrigger || undefined,
          waitTime: captureTrigger ? 6000 : 5000,
        }
      );

      if (!response.success || !response.data) {
        if (response.availableFormIds) {
          setAvailableFormIds(response.availableFormIds);
        }
        throw new Error(response.error || 'Failed to capture form');
      }

      if (response.data.availableFormIds) {
        setAvailableFormIds(response.data.availableFormIds);
      }

      setCapturedData(response.data);
      if (response.data.formScreenshot) setOriginalScreenshot(response.data.formScreenshot);
      setCaptureStatus('success');

      const patternInfo = response.data.patterns
        ? `Label: ${response.data.patterns.labelStyle}, Layout: ${response.data.patterns.fieldLayout}`
        : '';
      setCaptureMessage(`Form captured! (${response.data.formHtml.length} chars HTML, ${response.data.formCss.length} chars CSS) ${patternInfo}`);

      const capturedConfig = capturedFormDataToConfig(response.data, formStyle);

      onUpdateStyle(capturedConfig);

      toast({
        title: 'Form Captured Successfully',
        description: `Captured form "${captureFormId}" - Label style: ${response.data.patterns?.labelStyle || 'detected'}`,
      });
    } catch (error) {
      setCaptureStatus('error');
      setCaptureMessage(error instanceof Error ? error.message : 'Failed to capture form');
      toast({
        title: 'Capture failed',
        description: error instanceof Error ? error.message : 'Could not capture form',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const hasCapturedForm = formStyle.source === 'captured' && formStyle.capturedFormHtml;

  return (
    <Card className={isActive ? 'border-2 border-primary/30 bg-primary/5' : 'border-border'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className={isActive ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-muted-foreground'} />
          Exact Form Capture
          {isActive && <Badge variant="default" className="ml-2">Active</Badge>}
          {hasCapturedForm && !isActive && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Capture the exact form HTML and CSS by form ID for pixel-perfect reproduction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capture URL */}
        <div className="space-y-2">
          <Label htmlFor="capture-url">Page URL</Label>
          <div className="flex items-center gap-2">
            <Input
              id="capture-url"
              placeholder="https://example.com/signup"
              value={captureUrl}
              onChange={(e) => {
                setCaptureUrl(e.target.value);
                setCaptureStatus('idle');
              }}
            />
            {captureUrl && (
              <Button variant="outline" size="icon" asChild>
                <a href={captureUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Form ID Input */}
        <div className="space-y-2">
          <Label htmlFor="capture-form-id">
            Form ID <span className="text-muted-foreground text-xs">(recommended)</span>
          </Label>
          <Input
            id="capture-form-id"
            placeholder="membershipForm"
            value={captureFormId}
            onChange={(e) => {
              setCaptureFormId(e.target.value);
              setCaptureStatus('idle');
            }}
          />
          <p className="text-xs text-muted-foreground">
            The form's ID attribute helps target a specific form. If left empty, the first form on the page will be captured.
          </p>
        </div>

        {/* Modal Trigger */}
        <div className="space-y-2">
          <Label htmlFor="capture-trigger">Modal Trigger (Optional)</Label>
          <Input
            id="capture-trigger"
            placeholder="e.g., #open-form-btn, .apply-button"
            value={captureTrigger}
            onChange={(e) => setCaptureTrigger(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            If the form is hidden behind a button click, enter the button's CSS selector
          </p>
        </div>

        {/* Capture Button */}
        <Button
          onClick={handleCaptureFormById}
          disabled={!captureUrl || isCapturing}
          className="w-full"
          variant={isActive ? 'default' : 'outline'}
          size="lg"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Capturing Form...
            </>
          ) : (
            <>
              <Paintbrush className="w-4 h-4 mr-2" />
              {captureFormId ? `Capture Form "${captureFormId}"` : 'Capture First Form'}
            </>
          )}
        </Button>

        {/* Auto-Detect Form (site crawl) */}
        <Button
          onClick={handleAutoDetect}
          disabled={!captureUrl || isDiscovering || isCapturing}
          className="w-full"
          variant="outline"
        >
          {isDiscovering ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching site for forms...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Auto-Detect Form on Site
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground -mt-2">
          Crawls common pages (apply, contact, signup, quote) and picks the best application/contact form.
        </p>

        {/* Capture Status Feedback */}
        {captureStatus !== 'idle' && captureMessage && (
          <Alert
            variant={captureStatus === 'success' ? 'default' : captureStatus === 'error' ? 'destructive' : 'default'}
            className={captureStatus === 'success' ? 'border-green-500/50 bg-green-500/10' : ''}
          >
            {captureStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {captureStatus === 'error' && <AlertCircle className="w-4 h-4" />}
            {captureStatus === 'capturing' && <Loader2 className="w-4 h-4 animate-spin" />}
            <AlertDescription className="ml-2">
              {captureMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Available form IDs on error */}
        {captureStatus === 'error' && availableFormIds.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
            <p className="text-xs font-medium">Available Form/Container IDs found on page:</p>
            <div className="flex flex-wrap gap-1">
              {availableFormIds.slice(0, 12).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setCaptureFormId(id);
                    setCaptureStatus('idle');
                  }}
                  className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-mono transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show captured form status */}
        {hasCapturedForm && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">
                Form Captured: <code className="text-xs">{formStyle.capturedFormId}</code>
              </span>
              {refineScore !== null && (
                <Badge variant="secondary" className="ml-auto">AI match: {refineScore}%</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              From: {formStyle.capturedSourceUrl}
            </p>
            <p className="text-xs text-muted-foreground">
              {formStyle.capturedFormHtml?.length.toLocaleString()} chars HTML, {(formStyle.capturedFormCss?.length || 0).toLocaleString()} chars CSS
            </p>
            {formStyle.capturedPatterns && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">Labels: {formStyle.capturedPatterns.labelStyle}</Badge>
                <Badge variant="outline" className="text-xs">Layout: {formStyle.capturedPatterns.fieldLayout}</Badge>
                {capturedData?.extractedFields && (
                  <Badge variant="outline" className="text-xs">Fields: {capturedData.extractedFields.length}</Badge>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefineWithAi}
                disabled={isRefining || !originalScreenshot}
              >
                {isRefining ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Refining with AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Refine with AI
                  </>
                )}
              </Button>
              {onGenerateFormSteps && capturedData?.extractedFields && capturedData.extractedFields.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleGenerateSteps}>
                  <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                  Generate Form Steps ({capturedData.extractedFields.length})
                </Button>
              )}
            </div>
            {onGenerateFormSteps && capturedData?.extractedFields && capturedData.extractedFields.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Generate Form Steps will replace your current workflow with one step containing the captured fields, mapped to canonical types (name, email, phone, address, etc.).
              </p>
            )}
          </div>
        )}

        {/* Compare & Fix with AI */}
        {hasCapturedForm && (
          <CompareFixButton
            formStyle={formStyle}
            onUpdateStyle={onUpdateStyle}
            originalScreenshot={originalScreenshot || capturedData?.formScreenshot || null}
          />
        )}
      </CardContent>
    </Card>
  );
}
