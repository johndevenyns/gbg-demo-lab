import { useState, useMemo } from "react";
import { Globe, Loader2, Check, X, ExternalLink, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { scrapingApi, ScrapedBranding, FormElementStyles } from "@/lib/api/scraping";
import { useToast } from "@/hooks/use-toast";
import { DemoEnvironment } from "@/types/demo";
import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SiteMirrorCardProps {
  demo: DemoEnvironment;
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

// Generate form preview HTML for the iframe
function generateFormPreviewHtml(demo: DemoEnvironment): string {
  const style = demo.formStyle || DEFAULT_FORM_STYLE;
  const buttonColor = demo.buttonColor || '#3B82F6';
  
  // Map style config values to CSS
  const borderRadiusMap: Record<string, string> = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  };
  
  const paddingMap: Record<string, string> = {
    sm: '8px 12px',
    md: '10px 14px',
    lg: '14px 18px',
  };
  
  const fontSizeMap: Record<string, string> = {
    sm: '14px',
    base: '16px',
    lg: '18px',
  };
  
  const labelWeightMap: Record<string, number> = {
    normal: 400,
    medium: 500,
    semibold: 600,
  };

  // Get actual style values
  const inputBgColor = style.inputBgColor || '#ffffff';
  const inputTextColor = style.inputTextColor || '#1f2937';
  const inputBorderColor = style.inputBorderColor || '#d1d5db';
  const inputFocusBorderColor = style.inputFocusBorderColor || buttonColor;
  const labelColor = style.labelColor || '#333333';
  const labelWeight = labelWeightMap[style.labelWeight || 'medium'];
  const borderRadius = borderRadiusMap[style.borderRadius || 'md'];
  const borderWidth = style.borderWidth || '1';
  const padding = paddingMap[style.inputPadding || 'md'];
  const fontSize = fontSizeMap[style.fontSize || 'base'];
  const fontFamily = style.fontFamily || 'system-ui, sans-serif';
  const errorColor = style.errorColor || '#ef4444';
  
  // Get the first form step's fields (or show placeholder if none)
  const formSteps = demo.formSteps?.filter(s => s.stepType === 'form') || [];
  const firstFormStep = formSteps[0];
  
  // Build field HTML with proper styling
  let fieldsHtml = '';
  if (firstFormStep?.fields && firstFormStep.fields.length > 0) {
    firstFormStep.fields.forEach(field => {
      fieldsHtml += `
        <div style="margin-bottom: 16px;">
          <label style="
            display: block;
            margin-bottom: 6px;
            font-weight: ${labelWeight};
            color: ${labelColor};
            font-size: ${fontSize};
            font-family: ${fontFamily};
          ">
            ${field.label}${field.required ? `<span style="color: ${errorColor}; margin-left: 4px;">*</span>` : ''}
          </label>
          <input 
            type="${field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}"
            placeholder="${field.placeholder || ''}"
            style="
              width: 100%;
              padding: ${padding};
              border: ${borderWidth}px solid ${inputBorderColor};
              border-radius: ${borderRadius};
              font-size: ${fontSize};
              font-family: ${fontFamily};
              background: ${inputBgColor};
              color: ${inputTextColor};
              outline: none;
              box-sizing: border-box;
            "
            onfocus="this.style.borderColor='${inputFocusBorderColor}'; this.style.boxShadow='0 0 0 3px ${inputFocusBorderColor}20';"
            onblur="this.style.borderColor='${inputBorderColor}'; this.style.boxShadow='none';"
          />
        </div>
      `;
    });
  } else {
    // Placeholder fields with proper styling
    const placeholderFields = [
      { label: 'First Name', placeholder: 'John', required: true },
      { label: 'Last Name', placeholder: 'Smith', required: true },
      { label: 'Email', placeholder: 'john@example.com', required: true },
    ];
    
    placeholderFields.forEach(field => {
      fieldsHtml += `
        <div style="margin-bottom: 16px;">
          <label style="
            display: block;
            margin-bottom: 6px;
            font-weight: ${labelWeight};
            color: ${labelColor};
            font-size: ${fontSize};
            font-family: ${fontFamily};
          ">
            ${field.label}${field.required ? `<span style="color: ${errorColor}; margin-left: 4px;">*</span>` : ''}
          </label>
          <input 
            type="text"
            placeholder="${field.placeholder}"
            style="
              width: 100%;
              padding: ${padding};
              border: ${borderWidth}px solid ${inputBorderColor};
              border-radius: ${borderRadius};
              font-size: ${fontSize};
              font-family: ${fontFamily};
              background: ${inputBgColor};
              color: ${inputTextColor};
              outline: none;
              box-sizing: border-box;
            "
            onfocus="this.style.borderColor='${inputFocusBorderColor}'; this.style.boxShadow='0 0 0 3px ${inputFocusBorderColor}20';"
            onblur="this.style.borderColor='${inputBorderColor}'; this.style.boxShadow='none';"
          />
        </div>
      `;
    });
  }

  const stepTitle = firstFormStep?.title || 'Application Form';
  const totalSteps = formSteps.length || 1;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 0; font-family: ${fontFamily}; }
          * { box-sizing: border-box; }
        </style>
        ${demo.scrapedCss ? `<style>${demo.scrapedCss}</style>` : ''}
      </head>
      <body>
        ${demo.scrapedHeaderHtml || ''}
        <div style="padding: 40px 20px; background: #f5f5f5; min-height: 300px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: ${labelColor}; font-family: ${fontFamily};">${stepTitle}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-family: ${fontFamily};">Step 1 of ${totalSteps}</p>
            </div>
            ${fieldsHtml}
            <button style="
              width: 100%;
              padding: 12px 24px;
              background: ${buttonColor};
              color: white;
              border: none;
              border-radius: ${borderRadius};
              font-size: 16px;
              font-weight: 500;
              font-family: ${fontFamily};
              cursor: pointer;
              margin-top: 8px;
            ">
              Continue
            </button>
          </div>
        </div>
        ${demo.scrapedFooterHtml || ''}
      </body>
    </html>
  `;
}

export function SiteMirrorCard({ demo, onApplyBranding }: SiteMirrorCardProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState(demo.customerSiteUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedBranding | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleMirror = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to mirror",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setScrapedData(null);

    try {
      const response = await scrapingApi.scrapeSiteBranding(url);

      if (response.success && response.data) {
        setScrapedData(response.data);
        setShowPreview(true);
      } else {
        toast({
          title: "Scraping Failed",
          description: response.error || "Could not extract branding from the site",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error scraping site:", error);
      toast({
        title: "Error",
        description: "Failed to scrape site. Make sure the Firecrawl connector is enabled.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!scrapedData) return;

    // Build form style config from extracted form styles
    let formStyleConfig: FormStyleConfig | undefined;
    if (scrapedData.formStyles) {
      formStyleConfig = formElementStylesToConfig(scrapedData.formStyles);
    }

    const updates: Partial<DemoEnvironment> = {
      customerSiteUrl: url,
      logoUrl: scrapedData.logoUrl || demo.logoUrl,
      headerBgColor: scrapedData.colors.headerBgColor,
      headerTextColor: scrapedData.colors.headerTextColor,
      buttonColor: scrapedData.colors.buttonColor,
      scrapedHeaderHtml: scrapedData.headerHtml,
      scrapedFooterHtml: scrapedData.footerHtml,
      scrapedCss: scrapedData.cssContent,
      // Apply form styles if extracted
      ...(formStyleConfig && { formStyle: formStyleConfig }),
    };

    // Pass true to indicate this should auto-save
    onApplyBranding(updates, true);

    setShowPreview(false);
    toast({
      title: "Branding Applied & Saving...",
      description: formStyleConfig 
        ? "Site branding, CSS, and form styling are being saved" 
        : "The scraped branding, CSS, and layout are being saved",
    });
  };

  const handleClearMirror = () => {
    // Clear scraped content but keep the URL
    const updates: Partial<DemoEnvironment> = {
      scrapedHeaderHtml: '',
      scrapedFooterHtml: '',
      scrapedCss: '',
      // Reset form style to template if it was mirrored
      ...(demo.formStyle?.source === 'mirrored' && { formStyle: { ...DEFAULT_FORM_STYLE, source: 'template' } }),
    };

    onApplyBranding(updates, true);
    setScrapedData(null);
    setShowPreview(false);
    
    toast({
      title: "Mirror Cleared",
      description: "Scraped branding has been cleared. You can re-mirror the site or use default styling.",
    });
  };

  // Convert FormElementStyles to FormStyleConfig
  function formElementStylesToConfig(styles: FormElementStyles): FormStyleConfig {
    const config: FormStyleConfig = {
      ...DEFAULT_FORM_STYLE,
      source: 'mirrored',
    };

    // Map input colors
    if (styles.inputBgColor) config.inputBgColor = styles.inputBgColor;
    if (styles.inputTextColor) config.inputTextColor = styles.inputTextColor;
    if (styles.inputBorderColor) config.inputBorderColor = styles.inputBorderColor;
    if (styles.inputFocusBorderColor) config.inputFocusBorderColor = styles.inputFocusBorderColor;
    if (styles.inputPlaceholderColor) config.inputPlaceholderColor = styles.inputPlaceholderColor;

    // Map label styles
    if (styles.labelColor) config.labelColor = styles.labelColor;
    if (styles.labelFontWeight) {
      const weight = parseInt(styles.labelFontWeight);
      if (weight >= 600) config.labelWeight = 'semibold';
      else if (weight >= 500) config.labelWeight = 'medium';
      else config.labelWeight = 'normal';
    }

    // Map font family
    if (styles.inputFontFamily || styles.labelFontFamily) {
      config.fontFamily = styles.inputFontFamily || styles.labelFontFamily || DEFAULT_FORM_STYLE.fontFamily;
    }

    // Map font size
    if (styles.inputFontSize) {
      const size = parseInt(styles.inputFontSize);
      if (size <= 14) config.fontSize = 'sm';
      else if (size >= 18) config.fontSize = 'lg';
      else config.fontSize = 'base';
    }

    // Map border radius
    if (styles.inputBorderRadius) {
      const radius = styles.inputBorderRadius.toLowerCase();
      if (radius === '0' || radius === '0px' || radius === 'none') config.borderRadius = 'none';
      else if (radius.includes('999') || radius.includes('9999') || radius.includes('50%') || radius.includes('full')) config.borderRadius = 'full';
      else {
        const px = parseInt(radius);
        if (px <= 4) config.borderRadius = 'sm';
        else if (px >= 12) config.borderRadius = 'lg';
        else config.borderRadius = 'md';
      }
    }

    // Map border width
    if (styles.inputBorderWidth) {
      const width = parseInt(styles.inputBorderWidth);
      if (width === 0) config.borderWidth = '0';
      else if (width >= 2) config.borderWidth = '2';
      else config.borderWidth = '1';
    }

    // Map padding
    if (styles.inputPadding) {
      const padding = styles.inputPadding;
      const values = padding.split(/\s+/).map(v => parseInt(v));
      const avgPadding = values.reduce((a, b) => a + b, 0) / values.length;
      if (avgPadding <= 8) config.inputPadding = 'sm';
      else if (avgPadding >= 16) config.inputPadding = 'lg';
      else config.inputPadding = 'md';
    }

    // Map error color
    if (styles.errorColor) config.errorColor = styles.errorColor;

    return config;
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Site Mirror
          </CardTitle>
          <CardDescription>
            Scrape header, footer, and branding from a customer's website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Customer Website URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleMirror}
              disabled={isLoading || !url.trim()}
              className="gradient-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mirroring...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Mirror Site
                </>
              )}
            </Button>
            
            {demo.customerSiteUrl && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(demo.customerSiteUrl, '_blank')}
                  title="Open original site"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleClearMirror}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Mirror
                </Button>
              </>
            )}
          </div>

          {demo.scrapedHeaderHtml && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  ✓ Header and footer already mirrored from{" "}
                  <a 
                    href={demo.customerSiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {demo.customerSiteUrl}
                  </a>
                </p>
              </div>

              {/* Preview Mirrored Branding */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Preview Mirrored Branding</Label>
                <div className="border rounded-lg overflow-hidden bg-white">
                  {/* Render scraped header with CSS in iframe for isolation */}
                  <iframe
                    srcDoc={generateFormPreviewHtml(demo)}
                    className="w-full h-[500px] border-0"
                    title="Mirrored branding preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Scraped Branding</DialogTitle>
            <DialogDescription>
              Review the extracted branding from {url}
            </DialogDescription>
          </DialogHeader>

          {scrapedData && (
            <div className="space-y-6">
              {/* Screenshot Preview */}
              {scrapedData.screenshot && (
                <div className="space-y-2">
                  <Label>Site Screenshot</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`data:image/png;base64,${scrapedData.screenshot}`}
                      alt="Site screenshot"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Colors Preview */}
              <div className="space-y-2">
                <Label>Extracted Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div
                      className="h-12 rounded-lg border"
                      style={{ backgroundColor: scrapedData.colors.headerBgColor }}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Header BG: {scrapedData.colors.headerBgColor}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div
                      className="h-12 rounded-lg border flex items-center justify-center text-lg font-bold"
                      style={{ 
                        backgroundColor: scrapedData.colors.headerBgColor,
                        color: scrapedData.colors.headerTextColor 
                      }}
                    >
                      Aa
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Text: {scrapedData.colors.headerTextColor}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div
                      className="h-12 rounded-lg border"
                      style={{ backgroundColor: scrapedData.colors.buttonColor }}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Button: {scrapedData.colors.buttonColor}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Styles Preview */}
              {scrapedData.formStyles && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Paintbrush className="w-4 h-4" />
                    Extracted Form Styling
                  </Label>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {/* Input preview */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Input Field</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: scrapedData.formStyles.inputBgColor,
                            color: scrapedData.formStyles.inputTextColor,
                            border: `${scrapedData.formStyles.inputBorderWidth} solid ${scrapedData.formStyles.inputBorderColor}`,
                            borderRadius: scrapedData.formStyles.inputBorderRadius,
                            fontFamily: scrapedData.formStyles.inputFontFamily,
                          }}
                        >
                          Sample text
                        </div>
                      </div>
                      
                      {/* Focus state preview */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Focus State</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: scrapedData.formStyles.inputBgColor,
                            color: scrapedData.formStyles.inputTextColor,
                            border: `2px solid ${scrapedData.formStyles.inputFocusBorderColor}`,
                            borderRadius: scrapedData.formStyles.inputBorderRadius,
                            boxShadow: scrapedData.formStyles.inputFocusBoxShadow,
                            fontFamily: scrapedData.formStyles.inputFontFamily,
                          }}
                        >
                          Focused
                        </div>
                      </div>
                      
                      {/* Button preview */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Button</span>
                        <div
                          className="h-10 rounded flex items-center justify-center px-4 text-sm"
                          style={{
                            backgroundColor: scrapedData.formStyles.buttonBgColor,
                            color: scrapedData.formStyles.buttonTextColor,
                            borderRadius: scrapedData.formStyles.buttonBorderRadius,
                            fontWeight: scrapedData.formStyles.buttonFontWeight,
                          }}
                        >
                          Submit
                        </div>
                      </div>
                    </div>
                    
                    {/* Color swatches */}
                    <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: scrapedData.formStyles.inputBorderColor }}
                        />
                        <span className="text-xs text-muted-foreground">Border</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: scrapedData.formStyles.inputFocusBorderColor }}
                        />
                        <span className="text-xs text-muted-foreground">Focus</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: scrapedData.formStyles.labelColor }}
                        />
                        <span className="text-xs text-muted-foreground">Label</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: scrapedData.formStyles.buttonBgColor }}
                        />
                        <span className="text-xs text-muted-foreground">Button</span>
                      </div>
                      {scrapedData.formStyles.inputFontFamily && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ fontFamily: scrapedData.formStyles.inputFontFamily }}>
                            Aa
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-24">
                            {scrapedData.formStyles.inputFontFamily.split(',')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Logo Preview */}
              {scrapedData.logoUrl && (
                <div className="space-y-2">
                  <Label>Detected Logo</Label>
                  <div className="p-4 bg-muted rounded-lg inline-block">
                    <img
                      src={scrapedData.logoUrl}
                      alt="Logo"
                      className="max-h-16 max-w-[200px] object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Header Preview */}
              {scrapedData.headerHtml && (
                <div className="space-y-2">
                  <Label>Extracted Header HTML</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {scrapedData.headerHtml.substring(0, 500)}
                      {scrapedData.headerHtml.length > 500 && "..."}
                    </pre>
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              {scrapedData.footerHtml && (
                <div className="space-y-2">
                  <Label>Extracted Footer HTML</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {scrapedData.footerHtml.substring(0, 500)}
                      {scrapedData.footerHtml.length > 500 && "..."}
                    </pre>
                  </div>
                </div>
              )}

              {/* CSS Preview */}
              {scrapedData.cssContent && (
                <div className="space-y-2">
                  <Label>Extracted CSS ({scrapedData.cssContent.length} chars)</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {scrapedData.cssContent.substring(0, 500)}
                      {scrapedData.cssContent.length > 500 && "..."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApply} className="gradient-primary">
              <Check className="w-4 h-4 mr-2" />
              Apply Branding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
