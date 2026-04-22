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
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { scrapingApi, FormElementStyles, CapturedFormData, ExtractedField } from '@/lib/api/scraping';
import { FormStep, FormField, FormFieldType } from '@/types/demo';

interface ExactCaptureSectionProps {
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  isActive: boolean;
  /** Optional: when provided, enables a "Generate Form Steps" button that builds workflow steps from the captured fields. */
  onGenerateFormSteps?: (steps: FormStep[]) => void;
}

// Helper to calculate luminance and determine if color is light or dark
function getLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

// Adjust color brightness - positive = lighter, negative = darker
function adjustColorBrightness(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Smart hover color: lighter for dark buttons, darker for light buttons
function getSmartHoverColor(bgColor: string): string {
  return isLightColor(bgColor) 
    ? adjustColorBrightness(bgColor, -15) // Darken light buttons
    : adjustColorBrightness(bgColor, 25);  // Lighten dark buttons
}

// Comprehensive helper to convert extracted form styles to full FormStyleConfig
function formElementStylesToFullConfig(styles: FormElementStyles, branding?: { colors?: Record<string, string>; fonts?: Array<{ family: string }> } | null): FormStyleConfig {
  const config: FormStyleConfig = {
    ...DEFAULT_FORM_STYLE,
    source: 'captured',
  };

  // ========== TYPOGRAPHY ==========
  if (styles.inputFontFamily || styles.labelFontFamily) {
    config.fontFamily = styles.inputFontFamily || styles.labelFontFamily || DEFAULT_FORM_STYLE.fontFamily;
  } else if (branding?.fonts && branding.fonts.length > 0) {
    config.fontFamily = branding.fonts.map(f => f.family).join(', ') + ', sans-serif';
  }

  if (styles.inputFontSize) {
    const size = parseInt(styles.inputFontSize);
    if (size <= 14) config.fontSize = 'sm';
    else if (size >= 18) config.fontSize = 'lg';
    else config.fontSize = 'base';
  }

  // ========== INPUT STYLING ==========
  if (styles.inputBgColor) config.inputBgColor = styles.inputBgColor;
  if (styles.inputTextColor) config.inputTextColor = styles.inputTextColor;
  if (styles.inputBorderColor) config.inputBorderColor = styles.inputBorderColor;
  if (styles.inputFocusBorderColor) {
    config.inputFocusBorderColor = styles.inputFocusBorderColor;
  } else if (styles.buttonBgColor) {
    config.inputFocusBorderColor = styles.buttonBgColor;
  } else if (branding?.colors?.primary) {
    config.inputFocusBorderColor = branding.colors.primary;
  }
  if (styles.inputPlaceholderColor) config.inputPlaceholderColor = styles.inputPlaceholderColor;

  if (styles.inputBorderRadius) {
    const radius = styles.inputBorderRadius.toLowerCase();
    if (radius === '0' || radius === '0px' || radius === 'none') config.borderRadius = 'none';
    else if (radius.includes('999') || radius.includes('full')) config.borderRadius = 'full';
    else {
      const px = parseInt(radius);
      if (px <= 4) config.borderRadius = 'sm';
      else if (px >= 12) config.borderRadius = 'lg';
      else config.borderRadius = 'md';
    }
  }

  if (styles.inputBorderWidth) {
    const width = parseInt(styles.inputBorderWidth);
    if (width === 0) config.borderWidth = '0';
    else if (width >= 2) config.borderWidth = '2';
    else config.borderWidth = '1';
  }

  if (styles.inputPadding) {
    const paddingPx = parseInt(styles.inputPadding);
    if (paddingPx <= 8) config.inputPadding = 'sm';
    else if (paddingPx >= 14) config.inputPadding = 'lg';
    else config.inputPadding = 'md';
  }

  // ========== LABEL STYLING ==========
  if (styles.labelColor) config.labelColor = styles.labelColor;
  if (styles.labelFontWeight) {
    const weight = parseInt(styles.labelFontWeight);
    if (weight >= 600) config.labelWeight = 'semibold';
    else if (weight >= 500) config.labelWeight = 'medium';
    else config.labelWeight = 'normal';
  }

  // ========== ERROR COLOR ==========
  if (styles.errorColor) config.errorColor = styles.errorColor;
  config.successColor = '#22c55e';

  // ========== FORM CONTAINER STYLING ==========
  if (styles.containerBgColor) {
    config.formBgColor = styles.containerBgColor;
  }
  if (styles.containerPadding) {
    // Just use default form container settings
  }
  config.contentAreaBgColor = '#f5f5f5';

  // ========== TITLE STYLING ==========
  config.titleFontSize = 'xl';
  config.titleFontWeight = 'semibold';
  config.titleColor = styles.labelColor || config.labelColor;
  config.titleAlignment = 'center';
  config.bodyFontSize = 'sm';
  config.bodyColor = styles.inputPlaceholderColor || '#6b7280';

  // ========== FORWARD BUTTON STYLING ==========
  if (styles.buttonBgColor) {
    config.buttonBgColor = styles.buttonBgColor;
    config.buttonHoverBgColor = getSmartHoverColor(styles.buttonBgColor);
  } else if (branding?.colors?.primary) {
    config.buttonBgColor = branding.colors.primary;
    config.buttonHoverBgColor = getSmartHoverColor(branding.colors.primary);
  }
  if (styles.buttonTextColor) config.buttonTextColor = styles.buttonTextColor;
  config.buttonHoverTextColor = styles.buttonTextColor || '#ffffff';

  if (styles.buttonBorderRadius) {
    const radiusNum = parseInt(styles.buttonBorderRadius);
    if (radiusNum === 0) config.buttonBorderRadius = 'none';
    else if (radiusNum <= 4) config.buttonBorderRadius = 'sm';
    else if (radiusNum <= 8) config.buttonBorderRadius = 'md';
    else if (radiusNum <= 16) config.buttonBorderRadius = 'lg';
    else config.buttonBorderRadius = 'full';
  }

  if (styles.buttonFontWeight) {
    const weight = parseInt(styles.buttonFontWeight) || 0;
    if (weight >= 700) config.buttonFontWeight = 'bold';
    else if (weight >= 600) config.buttonFontWeight = 'semibold';
    else if (weight >= 500) config.buttonFontWeight = 'medium';
    else config.buttonFontWeight = 'normal';
  }

  // ========== REVERSE BUTTON STYLING ==========
  config.reverseButtonBgColor = 'transparent';
  config.reverseButtonTextColor = styles.labelColor || styles.buttonBgColor || '#6b7280';
  config.reverseButtonHoverBgColor = '#f3f4f6';
  config.reverseButtonHoverTextColor = styles.buttonBgColor || '#374151';
  config.reverseButtonBorderColor = styles.inputBorderColor || '#e5e7eb';
  config.reverseButtonBorderWidth = '1';
  config.reverseButtonBorderRadius = config.buttonBorderRadius;
  config.reverseButtonPadding = config.buttonPadding;
  config.reverseButtonFontWeight = 'medium';
  config.reverseButtonShadow = 'none';

  return config;
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

      // Use comprehensive style mapping
      let capturedConfig: FormStyleConfig;
      
      if (response.data.styles) {
        capturedConfig = formElementStylesToFullConfig(response.data.styles as FormElementStyles);
      } else {
        capturedConfig = { ...DEFAULT_FORM_STYLE, source: 'captured' };
      }
      
      // Add captured form HTML/CSS/JS
      capturedConfig.capturedFormHtml = response.data.formHtml;
      capturedConfig.capturedFormCss = response.data.formCss;
      capturedConfig.capturedFormJs = response.data.formJs;
      capturedConfig.capturedFormId = captureFormId;
      capturedConfig.capturedSourceUrl = captureUrl;
      capturedConfig.capturedPatterns = response.data.patterns;

      // Override with pattern-detected values if available
      if (response.data.patterns) {
        const p = response.data.patterns;
        if (p.detectedInputBgColor) capturedConfig.inputBgColor = p.detectedInputBgColor;
        if (p.detectedInputBorderColor) capturedConfig.inputBorderColor = p.detectedInputBorderColor;
        if (p.detectedLabelColor) capturedConfig.labelColor = p.detectedLabelColor;
        if (p.detectedErrorColor) capturedConfig.errorColor = p.detectedErrorColor;
        if (p.detectedFontFamily) capturedConfig.fontFamily = p.detectedFontFamily;
        if (p.labelStyle) capturedConfig.labelStyle = p.labelStyle;
        if (p.detectedButtonBgColor) {
          capturedConfig.buttonBgColor = p.detectedButtonBgColor;
          capturedConfig.buttonHoverBgColor = getSmartHoverColor(p.detectedButtonBgColor);
          // Smart default: reverse button text color matches button bg
          capturedConfig.reverseButtonTextColor = p.detectedButtonBgColor;
          capturedConfig.reverseButtonHoverTextColor = p.detectedButtonBgColor;
        }
        if (p.detectedButtonTextColor) capturedConfig.buttonTextColor = p.detectedButtonTextColor;
        if (p.detectedButtonHoverBgColor) capturedConfig.buttonHoverBgColor = p.detectedButtonHoverBgColor;
        if (p.detectedButtonBorderRadius) {
          const radiusNum = parseInt(p.detectedButtonBorderRadius);
          if (radiusNum === 0) capturedConfig.buttonBorderRadius = 'none';
          else if (radiusNum <= 4) capturedConfig.buttonBorderRadius = 'sm';
          else if (radiusNum <= 8) capturedConfig.buttonBorderRadius = 'md';
          else if (radiusNum <= 16) capturedConfig.buttonBorderRadius = 'lg';
          else capturedConfig.buttonBorderRadius = 'full';
          // Match reverse button
          capturedConfig.reverseButtonBorderRadius = capturedConfig.buttonBorderRadius;
        }
        if (p.detectedButtonFontWeight) {
          const weight = parseInt(p.detectedButtonFontWeight) || 0;
          if (weight >= 700) capturedConfig.buttonFontWeight = 'bold';
          else if (weight >= 600) capturedConfig.buttonFontWeight = 'semibold';
          else if (weight >= 500) capturedConfig.buttonFontWeight = 'medium';
          else capturedConfig.buttonFontWeight = 'normal';
        }
      }

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
              </div>
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
