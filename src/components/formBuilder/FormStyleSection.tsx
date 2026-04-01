import { useState, useMemo, CSSProperties } from 'react';
import { Paintbrush, Globe, LayoutTemplate, Palette, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FormStyleConfig,
  FormStyleSource,
  FormStyleTemplate,
  FORM_STYLE_TEMPLATES,
  DEFAULT_FORM_STYLE,
  scrapedBrandingToFormStyle,
} from '@/types/formStyle';
import { DemoEnvironment } from '@/types/demo';
import { ScrapedBranding, scrapingApi, FormElementStyles } from '@/lib/api/scraping';
import { useToast } from '@/hooks/use-toast';
import { getReadableTextColor } from '@/lib/formStyleUtils';

interface FormStyleSectionProps {
  demo: DemoEnvironment;
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  scrapedBranding?: ScrapedBranding | null;
  embedded?: boolean; // When true, renders without Card wrapper
}

// Helper to convert extracted form styles to FormStyleConfig
function formElementStylesToConfig(styles: FormElementStyles): Partial<FormStyleConfig> {
  const config: Partial<FormStyleConfig> = {
    source: 'mirrored',
  };

  // Map input colors
  config.inputBgColor = styles.inputBgColor || DEFAULT_FORM_STYLE.inputBgColor;
  config.inputTextColor = getReadableTextColor(styles.inputTextColor || DEFAULT_FORM_STYLE.inputTextColor, config.inputBgColor);
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

export function FormStyleSection({ demo, formStyle, onUpdateStyle, scrapedBranding, embedded = false }: FormStyleSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FormStyleSource>(formStyle.source);
  const [isScraping, setIsScraping] = useState(false);
  const [extractedStyles, setExtractedStyles] = useState<FormElementStyles | null>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value as FormStyleSource);
  };

  const handleScrapeFormUrl = async () => {
    if (!formStyle.formStyleUrl) {
      toast({
        title: 'No URL provided',
        description: 'Please enter a customer form URL first',
        variant: 'destructive',
      });
      return;
    }

    setIsScraping(true);
    try {
      // Use the new form-specific scraping endpoint
      const response = await scrapingApi.scrapeFormStyles(
        formStyle.formStyleUrl,
        formStyle.formContainerSelector || undefined
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to scrape form styling');
      }

      // Store the raw extracted styles for display
      setExtractedStyles(response.data.styles);

      // Convert to FormStyleConfig
      const mirroredStyle = formElementStylesToConfig(response.data.styles);

      onUpdateStyle({
        ...DEFAULT_FORM_STYLE,
        ...mirroredStyle,
        formStyleUrl: formStyle.formStyleUrl,
        formContainerSelector: formStyle.formContainerSelector,
        source: 'mirrored',
      });

      toast({
        title: 'Form styling extracted',
        description: `Applied ${Object.keys(mirroredStyle).length} style properties from the customer form`,
      });
    } catch (error) {
      toast({
        title: 'Scraping failed',
        description: error instanceof Error ? error.message : 'Could not extract form styling',
        variant: 'destructive',
      });
    } finally {
      setIsScraping(false);
    }
  };

  const applyMirroredStyle = () => {
    // If we have extracted form styles, use those
    if (extractedStyles) {
      const mirroredStyle = formElementStylesToConfig(extractedStyles);
      onUpdateStyle({
        ...DEFAULT_FORM_STYLE,
        ...mirroredStyle,
        formStyleUrl: formStyle.formStyleUrl,
        formContainerSelector: formStyle.formContainerSelector,
        source: 'mirrored',
      });

      toast({
        title: 'Extracted Styles Applied',
        description: 'Form styling updated to match the customer form exactly',
      });
      return;
    }

    // Fallback: Use scraped branding data or demo's stored colors
    const mirroredStyle: Partial<FormStyleConfig> = {
      source: 'mirrored',
      inputBgColor: '#ffffff',
      inputBorderColor: '#e2e8f0',
      borderRadius: 'md',
      borderWidth: '1',
      fontSize: 'base',
    };

    // Apply colors from scraped branding
    if (scrapedBranding?.branding?.colors) {
      if (scrapedBranding.branding.colors.primary) {
        mirroredStyle.inputFocusBorderColor = scrapedBranding.branding.colors.primary;
      }
      if (scrapedBranding.branding.colors.textPrimary) {
        mirroredStyle.inputTextColor = scrapedBranding.branding.colors.textPrimary;
        mirroredStyle.labelColor = scrapedBranding.branding.colors.textPrimary;
      }
    }

    // Apply fonts from scraped branding
    if (scrapedBranding?.branding?.fonts && scrapedBranding.branding.fonts.length > 0) {
      mirroredStyle.fontFamily = scrapedBranding.branding.fonts.map(f => f.family).join(', ') + ', sans-serif';
    }

    // Fall back to demo's stored colors if no branding data
    if (demo.buttonColor) {
      mirroredStyle.inputFocusBorderColor = mirroredStyle.inputFocusBorderColor || demo.buttonColor;
    }
    if (demo.headerTextColor && demo.headerTextColor !== '#ffffff') {
      mirroredStyle.labelColor = mirroredStyle.labelColor || demo.headerTextColor;
      mirroredStyle.inputTextColor = mirroredStyle.inputTextColor || demo.headerTextColor;
    }

    onUpdateStyle({
      ...DEFAULT_FORM_STYLE,
      ...mirroredStyle,
    });

    toast({
      title: 'Mirrored Style Applied',
      description: 'Form styling updated to match the mirrored site',
    });
  };

  const applyTemplate = (template: FormStyleTemplate) => {
    onUpdateStyle({
      ...template.style,
      source: 'template',
      templateId: template.id,
    });
  };

  const updateCustomStyle = (updates: Partial<FormStyleConfig>) => {
    onUpdateStyle({
      ...formStyle,
      ...updates,
      source: 'custom',
    });
  };

  // Show mirrored data if we have either scraped branding, extracted form styles, or stored demo colors
  const hasMirroredData = !!demo.customerSiteUrl || !!scrapedBranding?.branding || !!demo.scrapedCss || !!demo.buttonColor || !!extractedStyles;

  const content = (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="mirrored" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Mirrored
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Custom
            </TabsTrigger>
          </TabsList>

          {/* Mirrored Tab */}
          <TabsContent value="mirrored" className="space-y-4">
            {/* Form Style URL Input */}
            <div className="space-y-2">
              <Label htmlFor="form-style-url">Customer Form URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="form-style-url"
                  placeholder="https://customer.com/apply or /signup"
                  value={formStyle.formStyleUrl || ''}
                  onChange={(e) => onUpdateStyle({ ...formStyle, formStyleUrl: e.target.value })}
                />
                <Button
                  variant="outline"
                  onClick={handleScrapeFormUrl}
                  disabled={!formStyle.formStyleUrl || isScraping}
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    'Fetch Styles'
                  )}
                </Button>
                {formStyle.formStyleUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={formStyle.formStyleUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a URL to a form page on the customer's site, then click "Fetch Styles" to extract their exact form styling
              </p>
            </div>

            {/* Container Selector Input */}
            <div className="space-y-2">
              <Label htmlFor="form-container-selector">Form Container Selector (Optional)</Label>
              <Input
                id="form-container-selector"
                placeholder="e.g. #signup-form, .application-form, form[name='apply']"
                value={formStyle.formContainerSelector || ''}
                onChange={(e) => onUpdateStyle({ ...formStyle, formContainerSelector: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                CSS selector to target a specific form. The scraper will extract styles from this container and all its children.
              </p>
            </div>



            {hasMirroredData || formStyle.source === 'mirrored' ? (
              <div className="space-y-4">
                {/* Show currently applied mirrored style */}
                {formStyle.source === 'mirrored' && !extractedStyles && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Currently Applied Mirrored Style
                      </h4>
                      <Badge variant="default" className="bg-success">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Input preview */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Input Field</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: formStyle.inputBgColor,
                            color: getReadableTextColor(formStyle.inputTextColor, formStyle.inputBgColor),
                            border: `${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}`,
                            borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                            fontFamily: formStyle.fontFamily,
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
                            backgroundColor: formStyle.inputBgColor,
                            color: getReadableTextColor(formStyle.inputTextColor, formStyle.inputBgColor),
                            border: `2px solid ${formStyle.inputFocusBorderColor}`,
                            borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                            boxShadow: `0 0 0 3px ${formStyle.inputFocusBorderColor}20`,
                            fontFamily: formStyle.fontFamily,
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
                            backgroundColor: demo.buttonColor || formStyle.inputFocusBorderColor,
                            color: '#ffffff',
                            borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                            fontWeight: 500,
                          }}
                        >
                          Submit
                        </div>
                      </div>
                    </div>
                    
                    {/* Color swatches */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: formStyle.inputBorderColor }}
                        />
                        <span className="text-xs text-muted-foreground">Border</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: formStyle.inputFocusBorderColor }}
                        />
                        <span className="text-xs text-muted-foreground">Focus</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: formStyle.labelColor }}
                        />
                        <span className="text-xs text-muted-foreground">Label</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: demo.buttonColor }}
                        />
                        <span className="text-xs text-muted-foreground">Button</span>
                      </div>
                      {formStyle.fontFamily && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ fontFamily: formStyle.fontFamily }}>
                            Aa
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-24">
                            {formStyle.fontFamily.split(',')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Extracted styles preview (from manual Fetch Styles) */}
                {extractedStyles && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="text-sm font-semibold mb-3 text-primary">Newly Extracted Form Styles</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Input preview */}
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Input Field</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: extractedStyles.inputBgColor,
                            color: getReadableTextColor(extractedStyles.inputTextColor || DEFAULT_FORM_STYLE.inputTextColor, extractedStyles.inputBgColor || DEFAULT_FORM_STYLE.inputBgColor),
                            border: `${extractedStyles.inputBorderWidth} solid ${extractedStyles.inputBorderColor}`,
                            borderRadius: extractedStyles.inputBorderRadius,
                            fontFamily: extractedStyles.inputFontFamily,
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
                            backgroundColor: extractedStyles.inputBgColor,
                            color: getReadableTextColor(extractedStyles.inputTextColor || DEFAULT_FORM_STYLE.inputTextColor, extractedStyles.inputBgColor || DEFAULT_FORM_STYLE.inputBgColor),
                            border: `2px solid ${extractedStyles.inputFocusBorderColor}`,
                            borderRadius: extractedStyles.inputBorderRadius,
                            boxShadow: extractedStyles.inputFocusBoxShadow,
                            fontFamily: extractedStyles.inputFontFamily,
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
                            backgroundColor: extractedStyles.buttonBgColor,
                            color: extractedStyles.buttonTextColor,
                            borderRadius: extractedStyles.buttonBorderRadius,
                            fontWeight: extractedStyles.buttonFontWeight,
                          }}
                        >
                          Submit
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={applyMirroredStyle} className="gradient-primary mt-4">
                      Apply Extracted Styles
                    </Button>
                  </div>
                )}

                {/* Fallback for sites without form style applied yet */}
                {formStyle.source !== 'mirrored' && !extractedStyles && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      {`Apply styling from mirrored site${demo.customerSiteUrl ? `: ${demo.customerSiteUrl}` : ''}`}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      {demo.buttonColor && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: demo.buttonColor }}
                          />
                          <span className="text-xs text-muted-foreground">Button/Focus</span>
                        </div>
                      )}
                      {demo.headerBgColor && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: demo.headerBgColor }}
                          />
                          <span className="text-xs text-muted-foreground">Header BG</span>
                        </div>
                      )}
                      {demo.headerTextColor && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: demo.headerTextColor }}
                          />
                          <span className="text-xs text-muted-foreground">Text</span>
                        </div>
                      )}
                    </div>
                    
                    <Button onClick={applyMirroredStyle} className="gradient-primary">
                      Apply Mirrored Style
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-muted/30 border border-dashed border-border text-center">
                <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Enter a form URL above and click "Fetch Styles" to extract the exact form styling.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Or use the Site Mirror feature to scrape a customer's main website for general branding.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="template" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {FORM_STYLE_TEMPLATES.map((template) => {
                const isSelected = formStyle.source === 'template' && formStyle.templateId === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`
                      p-4 rounded-lg border text-left transition-all
                      ${isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Color preview */}
                      <div className="flex flex-col gap-1">
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: template.preview.bgColor }}
                        />
                        <div
                          className="w-8 h-3 rounded"
                          style={{ backgroundColor: template.preview.primaryColor }}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                        {isSelected && (
                          <Badge variant="default" className="mt-2 bg-success text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Applied
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Custom Tab */}
          <TabsContent value="custom" className="space-y-6">
            {/* Typography */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Typography</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={formStyle.fontFamily.split(',')[0].trim()}
                    onValueChange={(v) => updateCustomStyle({ fontFamily: `${v}, system-ui, sans-serif` })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Nunito">Nunito</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select
                    value={formStyle.fontSize}
                    onValueChange={(v) => updateCustomStyle({ fontSize: v as 'sm' | 'base' | 'lg' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="base">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Borders */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Borders</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Border Radius</Label>
                  <Select
                    value={formStyle.borderRadius}
                    onValueChange={(v) => updateCustomStyle({ borderRadius: v as FormStyleConfig['borderRadius'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="full">Pill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Border Width</Label>
                  <Select
                    value={formStyle.borderWidth}
                    onValueChange={(v) => updateCustomStyle({ borderWidth: v as '0' | '1' | '2' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="1">Thin (1px)</SelectItem>
                      <SelectItem value="2">Medium (2px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Colors</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Input Background</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formStyle.inputBgColor}
                      onChange={(e) => updateCustomStyle({ inputBgColor: e.target.value })}
                      className="color-picker-swatch"
                    />
                    <Input
                      value={formStyle.inputBgColor}
                      onChange={(e) => updateCustomStyle({ inputBgColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Input Text</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formStyle.inputTextColor}
                      onChange={(e) => updateCustomStyle({ inputTextColor: e.target.value })}
                      className="color-picker-swatch"
                    />
                    <Input
                      value={formStyle.inputTextColor}
                      onChange={(e) => updateCustomStyle({ inputTextColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Input Border</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formStyle.inputBorderColor}
                      onChange={(e) => updateCustomStyle({ inputBorderColor: e.target.value })}
                      className="color-picker-swatch"
                    />
                    <Input
                      value={formStyle.inputBorderColor}
                      onChange={(e) => updateCustomStyle({ inputBorderColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Focus Border</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formStyle.inputFocusBorderColor}
                      onChange={(e) => updateCustomStyle({ inputFocusBorderColor: e.target.value })}
                      className="color-picker-swatch"
                    />
                    <Input
                      value={formStyle.inputFocusBorderColor}
                      onChange={(e) => updateCustomStyle({ inputFocusBorderColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Label Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formStyle.labelColor}
                      onChange={(e) => updateCustomStyle({ labelColor: e.target.value })}
                      className="color-picker-swatch"
                    />
                    <Input
                      value={formStyle.labelColor}
                      onChange={(e) => updateCustomStyle({ labelColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Error Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formStyle.errorColor}
                      onChange={(e) => updateCustomStyle({ errorColor: e.target.value })}
                      className="color-picker-swatch"
                    />
                    <Input
                      value={formStyle.errorColor}
                      onChange={(e) => updateCustomStyle({ errorColor: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Spacing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Input Padding</Label>
                  <Select
                    value={formStyle.inputPadding || 'md'}
                    onValueChange={(v) => updateCustomStyle({ inputPadding: v as 'sm' | 'md' | 'lg' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Compact</SelectItem>
                      <SelectItem value="md">Normal</SelectItem>
                      <SelectItem value="lg">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Field Spacing</Label>
                  <Select
                    value={formStyle.fieldSpacing || 'normal'}
                    onValueChange={(v) => updateCustomStyle({ fieldSpacing: v as 'compact' | 'normal' | 'relaxed' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="relaxed">Relaxed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {formStyle.source === 'custom' && (
              <Badge variant="default" className="bg-success">
                <Check className="w-3 h-3 mr-1" />
                Custom style applied
              </Badge>
            )}
          </TabsContent>
        </Tabs>

        {/* Live Preview */}
        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">Live Preview</h4>
          <FormStylePreview 
            style={formStyle} 
            buttonColor={demo.buttonColor} 
            scrapedBranding={scrapedBranding}
          />
        </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5" />
          Form Styling
        </CardTitle>
        <CardDescription>
          Customize the appearance of form fields, fonts, and colors
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

// Live preview component showing how the form will look
function FormStylePreview({ 
  style, 
  buttonColor,
  scrapedBranding 
}: { 
  style: FormStyleConfig; 
  buttonColor?: string;
  scrapedBranding?: ScrapedBranding | null;
}) {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Use scraped branding as fallback when style source is default or mirrored
  const effectiveStyle = useMemo(() => {
    if (style.source === 'default' && scrapedBranding?.branding) {
      // Merge scraped branding into default style
      const merged = { ...style };
      if (scrapedBranding.branding.colors?.textPrimary) {
        merged.labelColor = scrapedBranding.branding.colors.textPrimary;
        merged.inputTextColor = scrapedBranding.branding.colors.textPrimary;
      }
      if (scrapedBranding.branding.colors?.primary) {
        merged.inputFocusBorderColor = scrapedBranding.branding.colors.primary;
      }
      if (scrapedBranding.branding.fonts?.[0]?.family) {
        merged.fontFamily = scrapedBranding.branding.fonts.map(f => f.family).join(', ') + ', sans-serif';
      }
      // Keep white background for inputs
      merged.inputBgColor = '#ffffff';
      return merged;
    }
    return style;
  }, [style, scrapedBranding]);

  // Use effectiveStyle for all rendering
  const s = effectiveStyle;

  const borderRadiusMap = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  };

  const paddingMap = {
    sm: '8px 12px',
    md: '10px 14px',
    lg: '14px 18px',
  };

  const fontSizeMap = {
    sm: '14px',
    base: '16px',
    lg: '18px',
  };

  const labelWeightMap = {
    normal: 400,
    medium: 500,
    semibold: 600,
  };

  const fieldSpacingMap = {
    compact: '12px',
    normal: '16px',
    relaxed: '24px',
  };

  const getInputStyle = (fieldId: string): CSSProperties => ({
    fontFamily: s.fontFamily,
    fontSize: fontSizeMap[s.fontSize],
    backgroundColor: s.inputBgColor,
    color: s.inputTextColor,
    border: `${s.borderWidth}px solid ${focusedField === fieldId ? s.inputFocusBorderColor : s.inputBorderColor}`,
    borderRadius: borderRadiusMap[s.borderRadius],
    padding: paddingMap[s.inputPadding || 'md'],
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === fieldId ? `0 0 0 3px ${s.inputFocusBorderColor}20` : 'none',
  });

  const labelStyle: CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: fontSizeMap[s.fontSize],
    color: s.labelColor,
    fontWeight: labelWeightMap[s.labelWeight || 'medium'],
    marginBottom: '6px',
    display: 'block',
  };

  const buttonStyle: CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: fontSizeMap[s.fontSize],
    backgroundColor: buttonColor || '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: borderRadiusMap[s.borderRadius],
    padding: paddingMap[s.inputPadding || 'md'],
    width: '100%',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'opacity 0.2s',
  };

  const selectStyle: CSSProperties = {
    ...getInputStyle('select'),
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
  };

  const spacing = fieldSpacingMap[s.fieldSpacing || 'normal'];

  return (
    <div className="p-5 rounded-lg border border-border" style={{ backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
        {/* Text Input */}
        <div>
          <label style={labelStyle}>Full Name <span style={{ color: s.errorColor }}>*</span></label>
          <input
            type="text"
            placeholder="John Doe"
            style={getInputStyle('name')}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        {/* Email Input */}
        <div>
          <label style={labelStyle}>Email Address</label>
          <input
            type="email"
            placeholder="email@example.com"
            style={getInputStyle('email')}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        {/* Two Column Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input
              type="text"
              placeholder="MM/DD/YYYY"
              style={getInputStyle('dob')}
              onFocus={() => setFocusedField('dob')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              style={getInputStyle('phone')}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        </div>

        {/* Select Dropdown */}
        <div>
          <label style={labelStyle}>Country</label>
          <select
            style={selectStyle}
            onFocus={() => setFocusedField('select')}
            onBlur={() => setFocusedField(null)}
          >
            <option value="">Select a country...</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="ca">Canada</option>
          </select>
        </div>

        {/* Error State Example */}
        <div>
          <label style={labelStyle}>SSN (with error)</label>
          <input
            type="text"
            placeholder="XXX-XX-XXXX"
            defaultValue="123"
            style={{
              ...getInputStyle('ssn'),
              borderColor: s.errorColor,
            }}
          />
          <p style={{ color: s.errorColor, fontSize: '12px', marginTop: '4px' }}>
            Please enter a valid SSN format
          </p>
        </div>

        {/* Success Message */}
        <div className="flex items-center gap-2">
          <span style={{ color: s.successColor, fontSize: '13px' }}>✓ All fields validated successfully</span>
        </div>

        {/* Submit Button */}
        <button
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
