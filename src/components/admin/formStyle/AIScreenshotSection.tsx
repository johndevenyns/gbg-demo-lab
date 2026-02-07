import { useState, useCallback } from 'react';
import { Upload, Loader2, Camera, Sparkles, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FormStyleConfig, DEFAULT_FORM_STYLE, CapturedFormPatterns } from '@/types/formStyle';
import { formAnalysisApi } from '@/lib/api/scraping';

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex color
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
  // Convert back to hex
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface AIScreenshotSectionProps {
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  onUpdateButtonColor?: (color: string) => void;
  isActive: boolean;
}

export function AIScreenshotSection({
  formStyle,
  onUpdateStyle,
  onUpdateButtonColor,
  isActive,
}: AIScreenshotSectionProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleScreenshotUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisComplete(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setUploadedScreenshot(dataUrl);

        const response = await formAnalysisApi.analyzeFormScreenshot(base64, file.type);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to analyze screenshot');
        }

        const { styles, content } = response.data;

        // Build the new style config with ALL settings, using smart defaults for missing values
        const newStyle: FormStyleConfig = {
          ...DEFAULT_FORM_STYLE,
          source: 'mirrored', // AI screenshot analysis creates a 'mirrored' source
        };

        // ========== TYPOGRAPHY ==========
        if (styles.fontFamily) {
          newStyle.fontFamily = styles.fontFamily;
        }

        // Map font size
        if (styles.fontSize) {
          const fontSizePx = parseInt(styles.fontSize);
          if (fontSizePx <= 14) newStyle.fontSize = 'sm';
          else if (fontSizePx >= 18) newStyle.fontSize = 'lg';
          else newStyle.fontSize = 'base';
        }

        // ========== INPUT STYLING ==========
        if (styles.inputBgColor) newStyle.inputBgColor = styles.inputBgColor;
        if (styles.inputTextColor) newStyle.inputTextColor = styles.inputTextColor;
        if (styles.inputBorderColor) newStyle.inputBorderColor = styles.inputBorderColor;
        if (styles.inputFocusBorderColor) {
          newStyle.inputFocusBorderColor = styles.inputFocusBorderColor;
        } else if (styles.buttonBgColor) {
          // Smart default: use button color as focus color
          newStyle.inputFocusBorderColor = styles.buttonBgColor;
        }
        if (styles.inputPlaceholderColor) newStyle.inputPlaceholderColor = styles.inputPlaceholderColor;

        // Map border radius
        if (styles.inputBorderRadius) {
          const radiusPx = parseInt(styles.inputBorderRadius);
          if (radiusPx >= 20) newStyle.borderRadius = 'full';
          else if (radiusPx >= 10) newStyle.borderRadius = 'lg';
          else if (radiusPx >= 6) newStyle.borderRadius = 'md';
          else if (radiusPx >= 2) newStyle.borderRadius = 'sm';
          else newStyle.borderRadius = 'none';
        }

        // Map border width
        if (styles.inputBorderWidth) {
          const widthPx = parseInt(styles.inputBorderWidth);
          if (widthPx >= 2) newStyle.borderWidth = '2';
          else if (widthPx >= 1) newStyle.borderWidth = '1';
          else newStyle.borderWidth = '0';
        }

        // Map input padding
        if (styles.inputPadding) {
          const paddingPx = parseInt(styles.inputPadding);
          if (paddingPx <= 8) newStyle.inputPadding = 'sm';
          else if (paddingPx >= 14) newStyle.inputPadding = 'lg';
          else newStyle.inputPadding = 'md';
        }

        // ========== LABEL STYLING ==========
        if (styles.labelColor) newStyle.labelColor = styles.labelColor;
        if (styles.labelFontWeight) {
          const weight = parseInt(styles.labelFontWeight) || 400;
          if (weight >= 600) newStyle.labelWeight = 'semibold';
          else if (weight >= 500) newStyle.labelWeight = 'medium';
          else newStyle.labelWeight = 'normal';
        }
        if (styles.labelPosition) {
          newStyle.labelStyle = styles.labelPosition;
        }

        // ========== ERROR/STATUS COLORS ==========
        if (styles.errorColor) newStyle.errorColor = styles.errorColor;
        // Smart default for success color based on detected colors
        if (!styles.errorColor) {
          newStyle.errorColor = '#ef4444'; // Default red
        }
        newStyle.successColor = '#22c55e'; // Default green

        // ========== FORM CONTAINER STYLING ==========
        if (styles.containerBgColor) {
          newStyle.formBgColor = styles.containerBgColor;
        }
        if (styles.containerBorderRadius) {
          const radiusPx = parseInt(styles.containerBorderRadius);
          if (radiusPx >= 24) newStyle.formBorderRadius = '2xl';
          else if (radiusPx >= 16) newStyle.formBorderRadius = 'xl';
          else if (radiusPx >= 12) newStyle.formBorderRadius = 'lg';
          else if (radiusPx >= 8) newStyle.formBorderRadius = 'md';
          else if (radiusPx >= 4) newStyle.formBorderRadius = 'sm';
          else newStyle.formBorderRadius = 'none';
        }
        if (styles.containerShadow) {
          const shadow = styles.containerShadow.toLowerCase();
          if (shadow === 'none' || shadow === '0') newStyle.formShadow = 'none';
          else if (shadow.includes('20px') || shadow.includes('25px')) newStyle.formShadow = 'xl';
          else if (shadow.includes('10px') || shadow.includes('15px')) newStyle.formShadow = 'lg';
          else if (shadow.includes('4px') || shadow.includes('6px')) newStyle.formShadow = 'md';
          else newStyle.formShadow = 'sm';
        }

        // Smart default: slightly lighter/neutral background for content area
        if (styles.containerBgColor) {
          newStyle.contentAreaBgColor = '#f5f5f5';
        }

        // ========== TITLE STYLING (from detected font properties) ==========
        // Use same font family for title
        if (styles.fontFamily) {
          // Title typically uses the same font
        }
        // Smart defaults for title based on form style
        newStyle.titleFontSize = 'xl';
        newStyle.titleFontWeight = 'semibold';
        newStyle.titleColor = styles.labelColor || newStyle.labelColor;
        newStyle.titleAlignment = 'center';

        // Body text defaults
        newStyle.bodyFontSize = 'sm';
        newStyle.bodyColor = styles.inputPlaceholderColor || '#6b7280';

        // ========== FORWARD BUTTON STYLING (Next, Submit, Continue) ==========
        if (styles.buttonBgColor) newStyle.buttonBgColor = styles.buttonBgColor;
        if (styles.buttonTextColor) newStyle.buttonTextColor = styles.buttonTextColor;
        
        // Smart default: hover is slightly darker version
        if (styles.buttonBgColor) {
          newStyle.buttonHoverBgColor = adjustColorBrightness(styles.buttonBgColor, -15);
        }
        newStyle.buttonHoverTextColor = styles.buttonTextColor || '#ffffff';

        if (styles.buttonBorderRadius) {
          const radiusNum = parseInt(styles.buttonBorderRadius);
          if (radiusNum >= 20) newStyle.buttonBorderRadius = 'full';
          else if (radiusNum >= 10) newStyle.buttonBorderRadius = 'lg';
          else if (radiusNum >= 6) newStyle.buttonBorderRadius = 'md';
          else if (radiusNum >= 2) newStyle.buttonBorderRadius = 'sm';
          else newStyle.buttonBorderRadius = 'none';
        }

        if (styles.buttonPadding) {
          const paddingParts = styles.buttonPadding.split(/\s+/);
          const vertPadding = parseInt(paddingParts[0]);
          if (vertPadding <= 10) newStyle.buttonPadding = 'sm';
          else if (vertPadding >= 16) newStyle.buttonPadding = 'lg';
          else newStyle.buttonPadding = 'md';
        }

        if (styles.buttonFontWeight) {
          const btnWeight = parseInt(styles.buttonFontWeight) || 400;
          if (btnWeight >= 700) newStyle.buttonFontWeight = 'bold';
          else if (btnWeight >= 600) newStyle.buttonFontWeight = 'semibold';
          else if (btnWeight >= 500) newStyle.buttonFontWeight = 'medium';
          else newStyle.buttonFontWeight = 'normal';
        }

        if (styles.buttonShadow) {
          const shadow = styles.buttonShadow.toLowerCase();
          if (shadow === 'none' || shadow === '0') newStyle.buttonShadow = 'none';
          else if (shadow.includes('10px') || shadow.includes('15px')) newStyle.buttonShadow = 'lg';
          else if (shadow.includes('4px') || shadow.includes('6px')) newStyle.buttonShadow = 'md';
          else newStyle.buttonShadow = 'sm';
        }

        // ========== REVERSE BUTTON STYLING (Back, Previous) ==========
        // Smart defaults: outline style that complements the forward button
        newStyle.reverseButtonBgColor = 'transparent';
        newStyle.reverseButtonTextColor = styles.labelColor || styles.buttonBgColor || '#6b7280';
        newStyle.reverseButtonHoverBgColor = '#f3f4f6';
        newStyle.reverseButtonHoverTextColor = styles.buttonBgColor || '#374151';
        newStyle.reverseButtonBorderColor = styles.inputBorderColor || '#e5e7eb';
        newStyle.reverseButtonBorderWidth = '1';
        // Match the forward button's border radius
        newStyle.reverseButtonBorderRadius = newStyle.buttonBorderRadius;
        newStyle.reverseButtonPadding = newStyle.buttonPadding;
        newStyle.reverseButtonFontWeight = 'medium';
        newStyle.reverseButtonShadow = 'none';

        // ========== FIELD SPACING ==========
        if (styles.fieldSpacing) {
          const spacingPx = parseInt(styles.fieldSpacing);
          if (spacingPx <= 12) newStyle.fieldSpacing = 'compact';
          else if (spacingPx >= 24) newStyle.fieldSpacing = 'relaxed';
          else newStyle.fieldSpacing = 'normal';
        }

        // ========== STORE CAPTURED PATTERNS FOR REFERENCE ==========
        const capturedPatterns: CapturedFormPatterns = {
          labelStyle: styles.labelPosition || 'above',
          labelsVisible: styles.labelPosition !== 'hidden' && styles.labelPosition !== 'placeholder-only',
          usesPlaceholders: content?.placeholders && content.placeholders.length > 0,
          placeholderAsLabel: styles.labelPosition === 'placeholder-only',
          fieldLayout: content?.layoutPattern === 'single-column' ? 'stacked' :
                       content?.layoutPattern === 'inline' ? 'inline' : 'grid',
          fieldsPerRow: content?.fieldsPerRow || 1,
          hasHelperText: content?.helperTextExamples && content.helperTextExamples.length > 0,
          hasRequiredIndicator: content?.labels?.some((l: { labelText: string }) => l.labelText.includes('*')) || false,
          inputStyle: 'bordered',
          focusStyle: 'border-color',
          detectedFontFamily: styles.fontFamily,
          detectedFontSize: styles.fontSize,
          detectedLabelFontSize: styles.labelFontSize,
          detectedLabelFontWeight: styles.labelFontWeight,
          detectedLabelColor: styles.labelColor,
          detectedInputBgColor: styles.inputBgColor,
          detectedInputBorderColor: styles.inputBorderColor,
          detectedInputFocusBorderColor: styles.inputFocusBorderColor,
          detectedButtonBgColor: styles.buttonBgColor,
          detectedButtonTextColor: styles.buttonTextColor,
          detectedButtonHoverBgColor: styles.buttonBgColor ? adjustColorBrightness(styles.buttonBgColor, -15) : undefined,
          detectedButtonBorderRadius: styles.buttonBorderRadius,
          detectedButtonPadding: styles.buttonPadding,
          detectedButtonFontWeight: styles.buttonFontWeight,
          detectedErrorColor: styles.errorColor,
          detectedFieldSpacing: styles.fieldSpacing,
        };

        newStyle.capturedPatterns = capturedPatterns;

        onUpdateStyle(newStyle);

        // Update button color if extracted
        if (styles.buttonBgColor && onUpdateButtonColor) {
          onUpdateButtonColor(styles.buttonBgColor);
        }

        // Build summary
        const extractedItems: string[] = [];
        if (styles.fontFamily) extractedItems.push(`Font: ${styles.fontFamily.split(',')[0]}`);
        if (styles.labelPosition) extractedItems.push(`Labels: ${styles.labelPosition}`);
        if (content?.placeholders?.length) extractedItems.push(`${content.placeholders.length} placeholders`);
        if (content?.labels?.length) extractedItems.push(`${content.labels.length} labels`);

        toast({
          title: 'Screenshot Analyzed',
          description: extractedItems.length > 0
            ? extractedItems.slice(0, 4).join(' • ')
            : `Extracted ${Object.keys(styles).length} style properties`,
        });

        setAnalysisComplete(true);
        setIsAnalyzing(false);
      };

      reader.onerror = () => {
        throw new Error('Failed to read image file');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Screenshot analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Could not analyze the screenshot',
        variant: 'destructive',
      });
      setIsAnalyzing(false);
    }

    event.target.value = '';
  }, [onUpdateStyle, onUpdateButtonColor, toast]);

  // Check if we have AI-analyzed styles (mirrored source with capturedPatterns but no capturedFormHtml)
  const hasAIStyles = formStyle.source === 'mirrored' && formStyle.capturedPatterns && !formStyle.capturedFormHtml;

  return (
    <Card className={isActive ? 'border-2 border-primary/30 bg-primary/5' : 'border-border'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className={isActive ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-muted-foreground'} />
          AI Screenshot Analysis
          {isActive && <Badge variant="default" className="ml-2">Active</Badge>}
          {hasAIStyles && !isActive && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Upload a screenshot of a form to extract colors, fonts, spacing, and layout patterns using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="relative border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          {uploadedScreenshot ? (
            <div className="space-y-3">
              <img
                src={uploadedScreenshot}
                alt="Uploaded form screenshot"
                className="max-h-40 mx-auto rounded-md border"
              />
              <p className="text-sm text-muted-foreground">
                {isAnalyzing ? 'Analyzing...' : analysisComplete ? 'Analysis complete!' : 'Screenshot uploaded'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop a form screenshot here or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                AI will detect colors, fonts, borders, spacing, and label positions
              </p>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshotUpload}
            disabled={isAnalyzing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <Button
          variant={isActive ? 'default' : 'outline'}
          className="w-full"
          disabled={isAnalyzing}
          onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept="image/*"]')?.click()}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Upload Form Screenshot
            </>
          )}
        </Button>

        {/* Show extracted patterns summary */}
        {hasAIStyles && formStyle.capturedPatterns && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">
                AI Analysis Complete
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {formStyle.capturedPatterns.detectedFontFamily && (
                <Badge variant="outline">Font: {formStyle.capturedPatterns.detectedFontFamily.split(',')[0]}</Badge>
              )}
              <Badge variant="outline">Labels: {formStyle.capturedPatterns.labelStyle}</Badge>
              <Badge variant="outline">Layout: {formStyle.capturedPatterns.fieldLayout}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
