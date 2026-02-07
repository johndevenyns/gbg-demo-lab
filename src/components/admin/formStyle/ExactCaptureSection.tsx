import { useState } from 'react';
import { Globe, Loader2, Paintbrush, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { scrapingApi, FormElementStyles, CapturedFormData } from '@/lib/api/scraping';

interface ExactCaptureSectionProps {
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  isActive: boolean;
}

// Helper to convert extracted form styles to FormStyleConfig
function formElementStylesToConfig(styles: FormElementStyles): Partial<FormStyleConfig> {
  const config: Partial<FormStyleConfig> = {
    source: 'captured',
  };

  if (styles.inputBgColor) config.inputBgColor = styles.inputBgColor;
  if (styles.inputTextColor) config.inputTextColor = styles.inputTextColor;
  if (styles.inputBorderColor) config.inputBorderColor = styles.inputBorderColor;
  if (styles.inputFocusBorderColor) config.inputFocusBorderColor = styles.inputFocusBorderColor;
  if (styles.inputPlaceholderColor) config.inputPlaceholderColor = styles.inputPlaceholderColor;

  if (styles.labelColor) config.labelColor = styles.labelColor;
  if (styles.labelFontWeight) {
    const weight = parseInt(styles.labelFontWeight);
    if (weight >= 600) config.labelWeight = 'semibold';
    else if (weight >= 500) config.labelWeight = 'medium';
    else config.labelWeight = 'normal';
  }

  if (styles.inputFontFamily || styles.labelFontFamily) {
    config.fontFamily = styles.inputFontFamily || styles.labelFontFamily || DEFAULT_FORM_STYLE.fontFamily;
  }

  if (styles.inputFontSize) {
    const size = parseInt(styles.inputFontSize);
    if (size <= 14) config.fontSize = 'sm';
    else if (size >= 18) config.fontSize = 'lg';
    else config.fontSize = 'base';
  }

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

  if (styles.errorColor) config.errorColor = styles.errorColor;

  return config;
}

export function ExactCaptureSection({
  formStyle,
  onUpdateStyle,
  isActive,
}: ExactCaptureSectionProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureFormId, setCaptureFormId] = useState(formStyle.capturedFormId || '');
  const [captureUrl, setCaptureUrl] = useState(formStyle.capturedSourceUrl || formStyle.formStyleUrl || '');
  const [captureTrigger, setCaptureTrigger] = useState<string>('');
  const [capturedData, setCapturedData] = useState<CapturedFormData | null>(null);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [captureMessage, setCaptureMessage] = useState<string>('');
  const [availableFormIds, setAvailableFormIds] = useState<string[]>([]);

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
      setCaptureStatus('success');

      const patternInfo = response.data.patterns
        ? `Label: ${response.data.patterns.labelStyle}, Layout: ${response.data.patterns.fieldLayout}`
        : '';
      setCaptureMessage(`Form captured! (${response.data.formHtml.length} chars HTML, ${response.data.formCss.length} chars CSS) ${patternInfo}`);

      const capturedConfig: Partial<FormStyleConfig> = {
        source: 'captured',
        capturedFormHtml: response.data.formHtml,
        capturedFormCss: response.data.formCss,
        capturedFormJs: response.data.formJs,
        capturedFormId: captureFormId,
        capturedSourceUrl: captureUrl,
        capturedPatterns: response.data.patterns,
      };

      if (response.data.styles) {
        const styleConfig = formElementStylesToConfig(response.data.styles as FormElementStyles);
        Object.assign(capturedConfig, styleConfig);
      }

      if (response.data.patterns) {
        const p = response.data.patterns;
        if (p.detectedInputBgColor) capturedConfig.inputBgColor = p.detectedInputBgColor;
        if (p.detectedInputBorderColor) capturedConfig.inputBorderColor = p.detectedInputBorderColor;
        if (p.detectedLabelColor) capturedConfig.labelColor = p.detectedLabelColor;
        if (p.detectedErrorColor) capturedConfig.errorColor = p.detectedErrorColor;
        if (p.detectedFontFamily) capturedConfig.fontFamily = p.detectedFontFamily;
        if (p.labelStyle) capturedConfig.labelStyle = p.labelStyle;
        if (p.detectedButtonBgColor) capturedConfig.buttonBgColor = p.detectedButtonBgColor;
        if (p.detectedButtonTextColor) capturedConfig.buttonTextColor = p.detectedButtonTextColor;
        if (p.detectedButtonHoverBgColor) capturedConfig.buttonHoverBgColor = p.detectedButtonHoverBgColor;
        if (p.detectedButtonBorderRadius) {
          const radiusNum = parseInt(p.detectedButtonBorderRadius);
          if (radiusNum === 0) capturedConfig.buttonBorderRadius = 'none';
          else if (radiusNum <= 4) capturedConfig.buttonBorderRadius = 'sm';
          else if (radiusNum <= 8) capturedConfig.buttonBorderRadius = 'md';
          else if (radiusNum <= 16) capturedConfig.buttonBorderRadius = 'lg';
          else capturedConfig.buttonBorderRadius = 'full';
        }
        if (p.detectedButtonFontWeight) {
          const weight = parseInt(p.detectedButtonFontWeight) || 0;
          if (weight >= 700) capturedConfig.buttonFontWeight = 'bold';
          else if (weight >= 600) capturedConfig.buttonFontWeight = 'semibold';
          else if (weight >= 500) capturedConfig.buttonFontWeight = 'medium';
          else capturedConfig.buttonFontWeight = 'normal';
        }
      }

      onUpdateStyle({
        ...DEFAULT_FORM_STYLE,
        ...capturedConfig,
      });

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
      </CardContent>
    </Card>
  );
}
