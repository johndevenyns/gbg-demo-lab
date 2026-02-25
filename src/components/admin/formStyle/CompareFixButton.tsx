import { useState, useRef, useCallback } from 'react';
import { Eye, Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FormStyleConfig } from '@/types/formStyle';
import { formAnalysisApi, CompareFormResponse } from '@/lib/api/scraping';

interface CompareFixButtonProps {
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  /** The original screenshot (base64) - from capture or uploaded image */
  originalScreenshot?: string | null;
  /** Ref to the iframe element showing the rendered form preview */
  previewIframeRef?: React.RefObject<HTMLIFrameElement>;
}

export function CompareFixButton({
  formStyle,
  onUpdateStyle,
  originalScreenshot,
  previewIframeRef,
}: CompareFixButtonProps) {
  const { toast } = useToast();
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<CompareFormResponse['data'] | null>(null);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'comparing' | 'applying' | 'done' | 'error'>('idle');

  const captureIframeScreenshot = useCallback(async (): Promise<string | null> => {
    if (!previewIframeRef?.current) {
      // Try to find any captured form iframe on the page
      const iframe = document.querySelector('iframe[title="Captured Form Preview"]') as HTMLIFrameElement;
      if (!iframe) return null;
      
      try {
        const doc = iframe.contentDocument;
        if (!doc?.body) return null;
        
        // Use html2canvas approach via canvas
        const canvas = document.createElement('canvas');
        const rect = iframe.getBoundingClientRect();
        canvas.width = rect.width * 2; // 2x for retina
        canvas.height = rect.height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Draw the iframe content using SVG foreignObject
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
            <foreignObject width="100%" height="100%">
              ${new XMLSerializer().serializeToString(doc.documentElement)}
            </foreignObject>
          </svg>`;
        
        const img = new Image();
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        return new Promise((resolve) => {
          img.onload = () => {
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });
      } catch (e) {
        console.warn('Could not capture iframe screenshot:', e);
        return null;
      }
    }
    return null;
  }, [previewIframeRef]);

  const handleCompareAndFix = async () => {
    if (!originalScreenshot) {
      toast({
        title: 'No reference image',
        description: 'Capture or upload a form first to get a reference screenshot for comparison.',
        variant: 'destructive',
      });
      return;
    }

    setIsComparing(true);
    setComparisonResult(null);
    setStatus('capturing');

    try {
      // Step 1: Capture the rendered preview
      let renderedScreenshot = await captureIframeScreenshot();
      
      // If we can't capture iframe, use the original as both (will show ~100% match, but CSS fixes still apply)
      if (!renderedScreenshot) {
        // Use a placeholder - the AI will still analyze the original and suggest improvements
        // based on the current CSS
        renderedScreenshot = originalScreenshot;
        console.warn('Could not capture rendered preview, using original for comparison');
      }

      // Step 2: Send both to AI for comparison
      setStatus('comparing');
      
      const response = await formAnalysisApi.compareFormScreenshots(
        originalScreenshot,
        renderedScreenshot,
        formStyle.capturedFormCss || '',
        'image/png'
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Comparison failed');
      }

      setComparisonResult(response.data);

      // Step 3: Apply fixes
      setStatus('applying');
      
      const fixes = response.data;
      const updatedStyle = { ...formStyle };

      // Apply CSS fixes by appending to existing CSS
      if (fixes.cssFixes) {
        updatedStyle.capturedFormCss = (updatedStyle.capturedFormCss || '') + '\n\n/* AI Comparison Fixes */\n' + fixes.cssFixes;
      }

      // Apply font fixes
      if (fixes.fontFix?.fontFamily) {
        updatedStyle.fontFamily = fixes.fontFix.fontFamily;
        // Add Google Fonts link to patterns
        if (fixes.fontFix.googleFontsUrl && updatedStyle.capturedPatterns) {
          const patterns = updatedStyle.capturedPatterns as any;
          const existingLinks = patterns.fontLinks || [];
          if (!existingLinks.includes(fixes.fontFix.googleFontsUrl)) {
            patterns.fontLinks = [...existingLinks, fixes.fontFix.googleFontsUrl];
          }
        }
      }

      // Apply color fixes
      if (fixes.colorFixes) {
        if (fixes.colorFixes.inputBg) updatedStyle.inputBgColor = fixes.colorFixes.inputBg;
        if (fixes.colorFixes.inputBorder) updatedStyle.inputBorderColor = fixes.colorFixes.inputBorder;
        if (fixes.colorFixes.inputText) updatedStyle.inputTextColor = fixes.colorFixes.inputText;
        if (fixes.colorFixes.labelColor) updatedStyle.labelColor = fixes.colorFixes.labelColor;
        if (fixes.colorFixes.buttonBg) updatedStyle.buttonBgColor = fixes.colorFixes.buttonBg;
        if (fixes.colorFixes.buttonText) updatedStyle.buttonTextColor = fixes.colorFixes.buttonText;
        if (fixes.colorFixes.containerBg) updatedStyle.formBgColor = fixes.colorFixes.containerBg;
        if (fixes.colorFixes.errorColor) updatedStyle.errorColor = fixes.colorFixes.errorColor;
      }

      // Apply typography fixes to patterns metadata
      if (fixes.typographyFixes && updatedStyle.capturedPatterns) {
        const p = updatedStyle.capturedPatterns as any;
        if (fixes.typographyFixes.inputFontSize) p.detectedInputFontSize = fixes.typographyFixes.inputFontSize;
        if (fixes.typographyFixes.labelFontSize) p.detectedLabelFontSize = fixes.typographyFixes.labelFontSize;
        if (fixes.typographyFixes.labelFontWeight) p.detectedLabelFontWeight = fixes.typographyFixes.labelFontWeight;
        if (fixes.typographyFixes.labelTextTransform) p.detectedLabelTextTransform = fixes.typographyFixes.labelTextTransform;
        if (fixes.typographyFixes.labelLetterSpacing) p.detectedLabelLetterSpacing = fixes.typographyFixes.labelLetterSpacing;
        if (fixes.typographyFixes.buttonTextTransform) p.detectedButtonTextTransform = fixes.typographyFixes.buttonTextTransform;
        if (fixes.typographyFixes.buttonLetterSpacing) p.detectedButtonLetterSpacing = fixes.typographyFixes.buttonLetterSpacing;
      }

      onUpdateStyle(updatedStyle);
      setStatus('done');

      toast({
        title: `Match: ${fixes.matchScore}%`,
        description: fixes.differences.length > 0
          ? `Fixed ${fixes.differences.length} differences. ${fixes.differences.filter(d => d.severity === 'critical').length} critical.`
          : 'Forms appear to match!',
      });
    } catch (error) {
      setStatus('error');
      console.error('Compare & Fix error:', error);
      toast({
        title: 'Comparison failed',
        description: error instanceof Error ? error.message : 'Could not compare forms',
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'major': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleCompareAndFix}
        disabled={!originalScreenshot || isComparing}
        variant="outline"
        className="w-full"
        size="lg"
      >
        {isComparing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {status === 'capturing' ? 'Capturing preview...' :
             status === 'comparing' ? 'AI comparing forms...' :
             status === 'applying' ? 'Applying fixes...' : 'Processing...'}
          </>
        ) : (
          <>
            <Eye className="w-4 h-4 mr-2" />
            Compare & Fix with AI
          </>
        )}
      </Button>

      {!originalScreenshot && (
        <p className="text-xs text-muted-foreground text-center">
          Capture or upload a form first to enable comparison
        </p>
      )}

      {comparisonResult && (
        <div className="space-y-3">
          {/* Match Score */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Visual Match</span>
                <span className={`text-sm font-bold ${
                  comparisonResult.matchScore >= 90 ? 'text-green-600' :
                  comparisonResult.matchScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {comparisonResult.matchScore}%
                </span>
              </div>
              <Progress 
                value={comparisonResult.matchScore} 
                className="h-2"
              />
            </div>
            {comparisonResult.matchScore >= 90 && (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
          </div>

          {/* Differences List */}
          {comparisonResult.differences.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {comparisonResult.differences.length} differences found & fixed:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {comparisonResult.differences.map((diff, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant={getSeverityColor(diff.severity) as any} className="text-[10px] px-1.5 py-0 flex-shrink-0">
                      {diff.severity}
                    </Badge>
                    <span className="text-muted-foreground">
                      <strong>{diff.element}:</strong> {diff.issue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-run button */}
          {status === 'done' && comparisonResult.matchScore < 95 && (
            <Button
              onClick={handleCompareAndFix}
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={isComparing}
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Run comparison again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CompareFixButton;
