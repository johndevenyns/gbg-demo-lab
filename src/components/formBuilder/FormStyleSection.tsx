import { useState } from 'react';
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
import { ScrapedBranding, scrapingApi } from '@/lib/api/scraping';
import { useToast } from '@/hooks/use-toast';

interface FormStyleSectionProps {
  demo: DemoEnvironment;
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  scrapedBranding?: ScrapedBranding | null;
}

export function FormStyleSection({ demo, formStyle, onUpdateStyle, scrapedBranding }: FormStyleSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FormStyleSource>(formStyle.source);
  const [isScraping, setIsScraping] = useState(false);

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
      const response = await scrapingApi.scrapeSiteBranding(formStyle.formStyleUrl);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to scrape form styling');
      }

      const mirroredStyle = scrapedBrandingToFormStyle({
        colors: response.data.branding?.colors,
        fonts: response.data.branding?.fonts,
        buttonColor: response.data.colors?.buttonColor,
      });

      onUpdateStyle({
        ...DEFAULT_FORM_STYLE,
        ...mirroredStyle,
        formStyleUrl: formStyle.formStyleUrl,
        source: 'mirrored',
      });

      toast({
        title: 'Form styling extracted',
        description: 'Applied styling from the customer form page',
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
    if (!scrapedBranding?.branding) return;

    const mirroredStyle = scrapedBrandingToFormStyle({
      colors: scrapedBranding.branding.colors,
      fonts: scrapedBranding.branding.fonts,
      buttonColor: scrapedBranding.colors?.buttonColor,
    });

    onUpdateStyle({
      ...DEFAULT_FORM_STYLE,
      ...mirroredStyle,
      source: 'mirrored',
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

  const hasMirroredData = !!demo.customerSiteUrl && (!!scrapedBranding?.branding || !!demo.scrapedCss);

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
                Enter a URL to a form page on the customer's site, then click "Fetch Styles" to extract their form styling
              </p>
            </div>

            {hasMirroredData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Apply styling extracted from <strong>{demo.customerSiteUrl}</strong>
                  </p>
                  <div className="flex items-center gap-4 mb-4">
                    {scrapedBranding?.branding?.colors?.primary && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: scrapedBranding.branding.colors.primary }}
                        />
                        <span className="text-xs text-muted-foreground">Primary</span>
                      </div>
                    )}
                    {scrapedBranding?.branding?.fonts?.[0] && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ fontFamily: scrapedBranding.branding.fonts[0].family }}>
                          Aa
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {scrapedBranding.branding.fonts[0].family}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button onClick={applyMirroredStyle} className="gradient-primary">
                    Apply Mirrored Style
                  </Button>
                </div>
                {formStyle.source === 'mirrored' && (
                  <Badge variant="default" className="bg-success">
                    <Check className="w-3 h-3 mr-1" />
                    Mirrored style applied
                  </Badge>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-muted/30 border border-dashed border-border text-center">
                <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No mirrored site data available.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the Site Mirror feature to scrape a customer's website first.
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
          <FormStylePreview style={formStyle} buttonColor={demo.buttonColor} />
        </div>
      </CardContent>
    </Card>
  );
}

// Live preview component showing how the form will look
function FormStylePreview({ style, buttonColor }: { style: FormStyleConfig; buttonColor?: string }) {
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const getInputStyle = (fieldId: string): React.CSSProperties => ({
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    backgroundColor: style.inputBgColor,
    color: style.inputTextColor,
    border: `${style.borderWidth}px solid ${focusedField === fieldId ? style.inputFocusBorderColor : style.inputBorderColor}`,
    borderRadius: borderRadiusMap[style.borderRadius],
    padding: paddingMap[style.inputPadding || 'md'],
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === fieldId ? `0 0 0 3px ${style.inputFocusBorderColor}20` : 'none',
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    color: style.labelColor,
    fontWeight: labelWeightMap[style.labelWeight || 'medium'],
    marginBottom: '6px',
    display: 'block',
  };

  const buttonStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    backgroundColor: buttonColor || '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: borderRadiusMap[style.borderRadius],
    padding: paddingMap[style.inputPadding || 'md'],
    width: '100%',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'opacity 0.2s',
  };

  const selectStyle: React.CSSProperties = {
    ...getInputStyle('select'),
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
  };

  const spacing = fieldSpacingMap[style.fieldSpacing || 'normal'];

  return (
    <div className="p-5 rounded-lg border border-border bg-muted/30">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
        {/* Text Input */}
        <div>
          <label style={labelStyle}>Full Name <span style={{ color: style.errorColor }}>*</span></label>
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
              borderColor: style.errorColor,
            }}
          />
          <p style={{ color: style.errorColor, fontSize: '12px', marginTop: '4px' }}>
            Please enter a valid SSN format
          </p>
        </div>

        {/* Success Message */}
        <div className="flex items-center gap-2">
          <span style={{ color: style.successColor, fontSize: '13px' }}>✓ All fields validated successfully</span>
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
