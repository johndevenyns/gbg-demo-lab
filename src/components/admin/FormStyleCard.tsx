import { useState, useCallback } from 'react';
import { Paintbrush, Eye, Save, Palette, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  FormStyleConfig,
  DEFAULT_FORM_STYLE,
} from '@/types/formStyle';
import { DemoEnvironment } from '@/types/demo';
import { ScrapedBranding } from '@/lib/api/scraping';
import { useToast } from '@/hooks/use-toast';
import { getBorderRadius, getPadding, getFontSize, getLabelWeight, getFormBorderRadius, getFormShadow, getTitleFontSize, getTitleFontWeight, getButtonPadding, getButtonBorderRadius, getButtonFontWeight, getButtonShadow } from '@/lib/formStyleUtils';
import CapturedFormRenderer from '@/components/preview/CapturedFormRenderer';

// Import new section components
import {
  FormStyleMethodSelector,
  FormStyleMethod,
  sourceToMethod,
  AIScreenshotSection,
  ExactCaptureSection,
  TemplatesSection,
} from './formStyle';

interface FormStyleCardProps {
  demo: DemoEnvironment;
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  onUpdateButtonColor?: (color: string) => void;
  scrapedBranding?: ScrapedBranding | null;
}

export function FormStyleCard({ demo, formStyle, onUpdateStyle, onUpdateButtonColor }: FormStyleCardProps) {
  const { toast } = useToast();
  
  // Determine active method from current formStyle source
  const [activeMethod, setActiveMethod] = useState<FormStyleMethod>(sourceToMethod(formStyle.source));
  const [customizeExpanded, setCustomizeExpanded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Determine which methods are configured
  const configuredMethods = {
    'ai-screenshot': formStyle.source === 'mirrored' && formStyle.capturedPatterns != null && !formStyle.capturedFormHtml,
    captured: formStyle.source === 'captured' && formStyle.capturedFormHtml != null,
    template: formStyle.source === 'template' && formStyle.templateId != null,
    custom: formStyle.source === 'custom',
  };

  const handleMethodChange = (method: FormStyleMethod) => {
    setActiveMethod(method);
    // When changing method, update the source to match (if not custom which needs manual editing)
    if (method === 'template' && !configuredMethods.template) {
      // Don't auto-apply, let user pick a template
    } else if (method === 'custom') {
      onUpdateStyle({ ...formStyle, source: 'custom' });
    }
    // For ai-screenshot and captured, the source is set when the action is taken
  };

  const updateCustomStyle = (updates: Partial<FormStyleConfig>) => {
    onUpdateStyle({
      ...formStyle,
      ...updates,
      source: 'custom',
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveCustomStyles = useCallback(() => {
    setHasUnsavedChanges(false);
    toast({
      title: 'Custom Styles Saved',
      description: 'Your color and typography settings have been applied.',
    });
  }, [toast]);

  return (
    <div className="space-y-6">
      {/* Live Form Preview - Always visible at top */}
      <Card className="glass-card border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="w-5 h-5" />
            Live Form Preview
            {formStyle.source === 'captured' && (
              <Badge variant="default" className="ml-2">Captured Form</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {formStyle.source === 'captured'
              ? 'Showing the exact captured form HTML/CSS/JS from the customer site'
              : 'This shows how your form will look with the current styling applied'
            }
          </p>
        </CardHeader>
        <CardContent>
          {/* Show captured form in iframe if source is 'captured' */}
          {formStyle.source === 'captured' && formStyle.capturedFormHtml ? (
            <CapturedFormRenderer
              formStyle={formStyle}
              minHeight={400}
              className="rounded-lg border"
            />
          ) : (
            /* Default mock form preview */
            <div
              className="p-6 rounded-lg border"
              style={{ backgroundColor: formStyle.contentAreaBgColor || '#f5f5f5' }}
            >
              <div
                className="max-w-md mx-auto space-y-5 p-6"
                style={{
                  backgroundColor: formStyle.formBgColor || '#ffffff',
                  borderRadius: getFormBorderRadius(formStyle.formBorderRadius),
                  boxShadow: getFormShadow(formStyle.formShadow),
                  border: `${formStyle.formBorderWidth || '1'}px solid ${formStyle.formBorderColor || '#e5e7eb'}`,
                }}
              >
                <h3
                  style={{
                    color: formStyle.titleColor || formStyle.labelColor,
                    fontFamily: formStyle.fontFamily,
                    fontSize: getTitleFontSize(formStyle.titleFontSize),
                    fontWeight: getTitleFontWeight(formStyle.titleFontWeight),
                    textAlign: formStyle.titleAlignment || 'center',
                    marginBottom: '24px',
                  }}
                >
                  Application Form
                </h3>

                {/* First Name */}
                <div className="space-y-2">
                  <label
                    style={{
                      display: 'block',
                      color: formStyle.labelColor,
                      fontWeight: getLabelWeight(formStyle.labelWeight),
                      fontFamily: formStyle.fontFamily,
                      fontSize: getFontSize(formStyle.fontSize),
                      marginBottom: '6px',
                    }}
                  >
                    First Name <span style={{ color: formStyle.errorColor }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    style={{
                      width: '100%',
                      padding: getPadding(formStyle.inputPadding),
                      backgroundColor: formStyle.inputBgColor,
                      color: formStyle.inputTextColor,
                      border: `${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}`,
                      borderRadius: getBorderRadius(formStyle.borderRadius),
                      fontFamily: formStyle.fontFamily,
                      fontSize: getFontSize(formStyle.fontSize),
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Email - show focus state */}
                <div className="space-y-2">
                  <label
                    style={{
                      display: 'block',
                      color: formStyle.labelColor,
                      fontWeight: getLabelWeight(formStyle.labelWeight),
                      fontFamily: formStyle.fontFamily,
                      fontSize: getFontSize(formStyle.fontSize),
                      marginBottom: '6px',
                    }}
                  >
                    Email Address <span style={{ color: formStyle.errorColor }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="john.doe@example.com"
                    style={{
                      width: '100%',
                      padding: getPadding(formStyle.inputPadding),
                      backgroundColor: formStyle.inputBgColor,
                      color: formStyle.inputTextColor,
                      border: `2px solid ${formStyle.inputFocusBorderColor}`,
                      borderRadius: getBorderRadius(formStyle.borderRadius),
                      fontFamily: formStyle.fontFamily,
                      fontSize: getFontSize(formStyle.fontSize),
                      outline: 'none',
                      boxShadow: `0 0 0 3px ${formStyle.inputFocusBorderColor}20`,
                    }}
                  />
                  <span style={{ fontSize: '12px', color: formStyle.inputFocusBorderColor }}>
                    ↑ This field shows the focus state styling
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  style={{
                    width: '100%',
                    padding: getButtonPadding(formStyle.buttonPadding),
                    backgroundColor: formStyle.buttonBgColor || demo.buttonColor || formStyle.inputFocusBorderColor,
                    color: formStyle.buttonTextColor || '#ffffff',
                    border: 'none',
                    borderRadius: getButtonBorderRadius(formStyle.buttonBorderRadius),
                    fontFamily: formStyle.fontFamily,
                    fontWeight: getButtonFontWeight(formStyle.buttonFontWeight),
                    fontSize: getFontSize(formStyle.fontSize),
                    cursor: 'pointer',
                    marginTop: '8px',
                    boxShadow: getButtonShadow(formStyle.buttonShadow),
                    transition: 'all 0.2s ease',
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Style Summary */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: formStyle.inputBgColor }} />
                <span className="text-muted-foreground">Input BG</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: formStyle.inputBorderColor }} />
                <span className="text-muted-foreground">Border</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: formStyle.inputFocusBorderColor }} />
                <span className="text-muted-foreground">Focus</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: formStyle.buttonBgColor || demo.buttonColor || formStyle.inputFocusBorderColor }} />
                <span className="text-muted-foreground">Button</span>
              </div>
              {formStyle.fontFamily && (
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ fontFamily: formStyle.fontFamily }}>Aa</span>
                  <span className="text-muted-foreground truncate max-w-20">{formStyle.fontFamily.split(',')[0]}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {formStyle.source === 'captured' ? 'Captured' : formStyle.source === 'mirrored' ? 'AI Analyzed' : formStyle.source === 'template' ? 'Template' : 'Custom'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method Selector */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5" />
            Form Styling
          </CardTitle>
          <CardDescription>
            Choose a styling method and configure how your form should look
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Method Selector */}
          <FormStyleMethodSelector
            activeMethod={activeMethod}
            onMethodChange={handleMethodChange}
            configuredMethods={configuredMethods}
          />

          <div className="border-t pt-6 space-y-4">
            {/* AI Screenshot Section */}
            <AIScreenshotSection
              formStyle={formStyle}
              onUpdateStyle={onUpdateStyle}
              onUpdateButtonColor={onUpdateButtonColor}
              isActive={activeMethod === 'ai-screenshot'}
            />

            {/* Exact Capture Section */}
            <ExactCaptureSection
              formStyle={formStyle}
              onUpdateStyle={onUpdateStyle}
              isActive={activeMethod === 'captured'}
            />

            {/* Templates Section */}
            <TemplatesSection
              formStyle={formStyle}
              onUpdateStyle={onUpdateStyle}
              isActive={activeMethod === 'template'}
            />

            {/* Customize Section - Collapsible */}
            <Collapsible open={customizeExpanded || activeMethod === 'custom'} onOpenChange={setCustomizeExpanded}>
              <Card className={activeMethod === 'custom' ? 'border-2 border-primary/30 bg-primary/5' : 'border-border'}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className={activeMethod === 'custom' ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-muted-foreground'} />
                        Manual Customization
                        {activeMethod === 'custom' && <Badge variant="default" className="ml-2">Active</Badge>}
                        {configuredMethods.custom && activeMethod !== 'custom' && (
                          <Badge variant="secondary" className="ml-2">Configured</Badge>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${customizeExpanded || activeMethod === 'custom' ? 'rotate-180' : ''}`} />
                    </CardTitle>
                    <CardDescription>
                      Fine-tune colors, typography, borders, and spacing manually
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    {/* Detected Values Summary (if from extraction) */}
                    {formStyle.capturedPatterns && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">Values Detected from Extraction</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The fields below show values captured from the source. Edit any field to customize.
                        </p>
                      </div>
                    )}

                    {/* Typography */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Typography</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="font-family" className="text-xs">Font Family</Label>
                          <Input
                            id="font-family"
                            value={formStyle.fontFamily}
                            onChange={(e) => updateCustomStyle({ fontFamily: e.target.value })}
                            placeholder="Inter, system-ui, sans-serif"
                            className="text-sm"
                          />
                          {formStyle.capturedPatterns?.detectedFontFamily && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedFontFamily}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="font-size" className="text-xs">Base Font Size</Label>
                          <Select
                            value={formStyle.fontSize}
                            onValueChange={(value) => updateCustomStyle({ fontSize: value as 'sm' | 'base' | 'lg' })}
                          >
                            <SelectTrigger id="font-size">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sm">Small (14px)</SelectItem>
                              <SelectItem value="base">Base (16px)</SelectItem>
                              <SelectItem value="lg">Large (18px)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedFontSize && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedFontSize}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Input Padding</Label>
                          <Select
                            value={formStyle.inputPadding || 'md'}
                            onValueChange={(value) => updateCustomStyle({ inputPadding: value as 'sm' | 'md' | 'lg' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sm">Compact (8px 12px)</SelectItem>
                              <SelectItem value="md">Medium (12px 16px)</SelectItem>
                              <SelectItem value="lg">Spacious (16px 20px)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedInputPadding && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedInputPadding}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Label Styling */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Label Styling</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Label Style</Label>
                          <Select
                            value={formStyle.labelStyle || 'above'}
                            onValueChange={(value) => updateCustomStyle({ labelStyle: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above Input</SelectItem>
                              <SelectItem value="floating">Floating</SelectItem>
                              <SelectItem value="inline">Inline/Left</SelectItem>
                              <SelectItem value="placeholder-only">Placeholder Only</SelectItem>
                              <SelectItem value="hidden">Hidden</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.labelStyle && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.labelStyle}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Label Weight</Label>
                          <Select
                            value={formStyle.labelWeight || 'medium'}
                            onValueChange={(value) => updateCustomStyle({ labelWeight: value as 'normal' | 'medium' | 'semibold' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal (400)</SelectItem>
                              <SelectItem value="medium">Medium (500)</SelectItem>
                              <SelectItem value="semibold">Semibold (600)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedLabelFontWeight && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedLabelFontWeight}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Label Color</Label>
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
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedLabelColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedLabelColor}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Field Spacing</Label>
                          <Select
                            value={formStyle.fieldSpacing || 'normal'}
                            onValueChange={(value) => updateCustomStyle({ fieldSpacing: value as 'compact' | 'normal' | 'relaxed' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compact">Compact (12px)</SelectItem>
                              <SelectItem value="normal">Normal (20px)</SelectItem>
                              <SelectItem value="relaxed">Relaxed (28px)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedFieldSpacing && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedFieldSpacing}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Input Borders */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Input Borders</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Border Radius</Label>
                          <Select
                            value={formStyle.borderRadius}
                            onValueChange={(value) => updateCustomStyle({ borderRadius: value as 'none' | 'sm' | 'md' | 'lg' | 'full' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (0px)</SelectItem>
                              <SelectItem value="sm">Small (4px)</SelectItem>
                              <SelectItem value="md">Medium (8px)</SelectItem>
                              <SelectItem value="lg">Large (12px)</SelectItem>
                              <SelectItem value="full">Full (rounded)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedBorderRadius && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedBorderRadius}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Border Width</Label>
                          <Select
                            value={formStyle.borderWidth}
                            onValueChange={(value) => updateCustomStyle({ borderWidth: value as '0' | '1' | '2' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None</SelectItem>
                              <SelectItem value="1">1px</SelectItem>
                              <SelectItem value="2">2px</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedBorderWidth && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedBorderWidth}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Border Color</Label>
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
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedInputBorderColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedInputBorderColor}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Focus Border Color</Label>
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
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedInputFocusBorderColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedInputFocusBorderColor}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Input Colors */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Input Colors</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Background</Label>
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
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedInputBgColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedInputBgColor}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Text Color</Label>
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
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Placeholder Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.inputPlaceholderColor || '#9ca3af'}
                              onChange={(e) => updateCustomStyle({ inputPlaceholderColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.inputPlaceholderColor || '#9ca3af'}
                              onChange={(e) => updateCustomStyle({ inputPlaceholderColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Error Color</Label>
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
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedErrorColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedErrorColor}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form Container */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Form Container</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Form Background</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.formBgColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ formBgColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.formBgColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ formBgColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Content Area BG</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.contentAreaBgColor || '#f5f5f5'}
                              onChange={(e) => updateCustomStyle({ contentAreaBgColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.contentAreaBgColor || '#f5f5f5'}
                              onChange={(e) => updateCustomStyle({ contentAreaBgColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Form Border Radius</Label>
                          <Select
                            value={formStyle.formBorderRadius || 'lg'}
                            onValueChange={(value) => updateCustomStyle({ formBorderRadius: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="sm">Small</SelectItem>
                              <SelectItem value="md">Medium</SelectItem>
                              <SelectItem value="lg">Large</SelectItem>
                              <SelectItem value="xl">Extra Large</SelectItem>
                              <SelectItem value="2xl">2X Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Form Shadow</Label>
                          <Select
                            value={formStyle.formShadow || 'lg'}
                            onValueChange={(value) => updateCustomStyle({ formShadow: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="sm">Small</SelectItem>
                              <SelectItem value="md">Medium</SelectItem>
                              <SelectItem value="lg">Large</SelectItem>
                              <SelectItem value="xl">Extra Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Form Border Width</Label>
                          <Select
                            value={formStyle.formBorderWidth || '1'}
                            onValueChange={(value) => updateCustomStyle({ formBorderWidth: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None</SelectItem>
                              <SelectItem value="1">1px</SelectItem>
                              <SelectItem value="2">2px</SelectItem>
                              <SelectItem value="3">3px</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Form Border Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.formBorderColor || '#e5e7eb'}
                              onChange={(e) => updateCustomStyle({ formBorderColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.formBorderColor || '#e5e7eb'}
                              onChange={(e) => updateCustomStyle({ formBorderColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Title & Body Text */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Title & Body Text</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Title Size</Label>
                          <Select
                            value={formStyle.titleFontSize || 'xl'}
                            onValueChange={(value) => updateCustomStyle({ titleFontSize: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sm">Small</SelectItem>
                              <SelectItem value="base">Base</SelectItem>
                              <SelectItem value="lg">Large</SelectItem>
                              <SelectItem value="xl">XL</SelectItem>
                              <SelectItem value="2xl">2XL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Title Weight</Label>
                          <Select
                            value={formStyle.titleFontWeight || 'semibold'}
                            onValueChange={(value) => updateCustomStyle({ titleFontWeight: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="semibold">Semibold</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Title Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.titleColor || formStyle.labelColor}
                              onChange={(e) => updateCustomStyle({ titleColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.titleColor || formStyle.labelColor}
                              onChange={(e) => updateCustomStyle({ titleColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Title Alignment</Label>
                          <Select
                            value={formStyle.titleAlignment || 'center'}
                            onValueChange={(value) => updateCustomStyle({ titleAlignment: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Body Text Size</Label>
                          <Select
                            value={formStyle.bodyFontSize || 'sm'}
                            onValueChange={(value) => updateCustomStyle({ bodyFontSize: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="xs">Extra Small</SelectItem>
                              <SelectItem value="sm">Small</SelectItem>
                              <SelectItem value="base">Base</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Body Text Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.bodyColor || '#6b7280'}
                              onChange={(e) => updateCustomStyle({ bodyColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.bodyColor || '#6b7280'}
                              onChange={(e) => updateCustomStyle({ bodyColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Button Styling */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Button Styling</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Background</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.buttonBgColor || demo.buttonColor || '#6366f1'}
                              onChange={(e) => updateCustomStyle({ buttonBgColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.buttonBgColor || demo.buttonColor || '#6366f1'}
                              onChange={(e) => updateCustomStyle({ buttonBgColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedButtonBgColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedButtonBgColor}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Text Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.buttonTextColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ buttonTextColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.buttonTextColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ buttonTextColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedButtonTextColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedButtonTextColor}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Hover Background</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.buttonHoverBgColor || formStyle.buttonBgColor || demo.buttonColor || '#4f46e5'}
                              onChange={(e) => updateCustomStyle({ buttonHoverBgColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.buttonHoverBgColor || ''}
                              onChange={(e) => updateCustomStyle({ buttonHoverBgColor: e.target.value })}
                              placeholder="Auto"
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                          {formStyle.capturedPatterns?.detectedButtonHoverBgColor && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedButtonHoverBgColor}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Hover Text Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.buttonHoverTextColor || formStyle.buttonTextColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ buttonHoverTextColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.buttonHoverTextColor || ''}
                              onChange={(e) => updateCustomStyle({ buttonHoverTextColor: e.target.value })}
                              placeholder="Auto"
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Border Radius</Label>
                          <Select
                            value={formStyle.buttonBorderRadius || 'md'}
                            onValueChange={(value) => updateCustomStyle({ buttonBorderRadius: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="sm">Small</SelectItem>
                              <SelectItem value="md">Medium</SelectItem>
                              <SelectItem value="lg">Large</SelectItem>
                              <SelectItem value="full">Full</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedButtonBorderRadius && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedButtonBorderRadius}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Padding</Label>
                          <Select
                            value={formStyle.buttonPadding || 'md'}
                            onValueChange={(value) => updateCustomStyle({ buttonPadding: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sm">Compact</SelectItem>
                              <SelectItem value="md">Medium</SelectItem>
                              <SelectItem value="lg">Large</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedButtonPadding && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedButtonPadding}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Font Weight</Label>
                          <Select
                            value={formStyle.buttonFontWeight || 'semibold'}
                            onValueChange={(value) => updateCustomStyle({ buttonFontWeight: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="semibold">Semibold</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                          {formStyle.capturedPatterns?.detectedButtonFontWeight && (
                            <span className="text-xs text-muted-foreground">Detected: {formStyle.capturedPatterns.detectedButtonFontWeight}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Shadow</Label>
                          <Select
                            value={formStyle.buttonShadow || 'none'}
                            onValueChange={(value) => updateCustomStyle({ buttonShadow: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="sm">Small</SelectItem>
                              <SelectItem value="md">Medium</SelectItem>
                              <SelectItem value="lg">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Status Colors */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm border-b pb-2">Status Colors</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Success Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formStyle.successColor}
                              onChange={(e) => updateCustomStyle({ successColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.successColor}
                              onChange={(e) => updateCustomStyle({ successColor: e.target.value })}
                              className="font-mono text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <Button
                      onClick={handleSaveCustomStyles}
                      className="w-full gradient-primary"
                      disabled={!hasUnsavedChanges}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {hasUnsavedChanges ? 'Save Custom Styles' : 'Styles Saved'}
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
