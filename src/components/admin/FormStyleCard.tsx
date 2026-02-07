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
                    {/* Typography */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Typography</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="font-family">Font Family</Label>
                          <Input
                            id="font-family"
                            value={formStyle.fontFamily}
                            onChange={(e) => updateCustomStyle({ fontFamily: e.target.value })}
                            placeholder="Inter, system-ui, sans-serif"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="font-size">Font Size</Label>
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
                        </div>
                      </div>
                    </div>

                    {/* Borders */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Borders</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="border-radius">Border Radius</Label>
                          <Select
                            value={formStyle.borderRadius}
                            onValueChange={(value) => updateCustomStyle({ borderRadius: value as 'none' | 'sm' | 'md' | 'lg' | 'full' })}
                          >
                            <SelectTrigger id="border-radius">
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="border-width">Border Width</Label>
                          <Select
                            value={formStyle.borderWidth}
                            onValueChange={(value) => updateCustomStyle({ borderWidth: value as '0' | '1' | '2' })}
                          >
                            <SelectTrigger id="border-width">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None</SelectItem>
                              <SelectItem value="1">1px</SelectItem>
                              <SelectItem value="2">2px</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Colors</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Input Background</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.inputBgColor }}
                            />
                            <input
                              type="color"
                              value={formStyle.inputBgColor}
                              onChange={(e) => updateCustomStyle({ inputBgColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.inputBgColor}
                              onChange={(e) => updateCustomStyle({ inputBgColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Input Text</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.inputTextColor }}
                            />
                            <input
                              type="color"
                              value={formStyle.inputTextColor}
                              onChange={(e) => updateCustomStyle({ inputTextColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.inputTextColor}
                              onChange={(e) => updateCustomStyle({ inputTextColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Input Border</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.inputBorderColor }}
                            />
                            <input
                              type="color"
                              value={formStyle.inputBorderColor}
                              onChange={(e) => updateCustomStyle({ inputBorderColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.inputBorderColor}
                              onChange={(e) => updateCustomStyle({ inputBorderColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Focus Border</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.inputFocusBorderColor }}
                            />
                            <input
                              type="color"
                              value={formStyle.inputFocusBorderColor}
                              onChange={(e) => updateCustomStyle({ inputFocusBorderColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.inputFocusBorderColor}
                              onChange={(e) => updateCustomStyle({ inputFocusBorderColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Label Color</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.labelColor }}
                            />
                            <input
                              type="color"
                              value={formStyle.labelColor}
                              onChange={(e) => updateCustomStyle({ labelColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.labelColor}
                              onChange={(e) => updateCustomStyle({ labelColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Error Color</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.errorColor }}
                            />
                            <input
                              type="color"
                              value={formStyle.errorColor}
                              onChange={(e) => updateCustomStyle({ errorColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.errorColor}
                              onChange={(e) => updateCustomStyle({ errorColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Button Styling */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Button Styling</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Button Background</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.buttonBgColor || demo.buttonColor || '#6366f1' }}
                            />
                            <input
                              type="color"
                              value={formStyle.buttonBgColor || demo.buttonColor || '#6366f1'}
                              onChange={(e) => updateCustomStyle({ buttonBgColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.buttonBgColor || demo.buttonColor || '#6366f1'}
                              onChange={(e) => updateCustomStyle({ buttonBgColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Button Text</Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border-2 border-border shrink-0"
                              style={{ backgroundColor: formStyle.buttonTextColor || '#ffffff' }}
                            />
                            <input
                              type="color"
                              value={formStyle.buttonTextColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ buttonTextColor: e.target.value })}
                              className="color-picker-swatch"
                            />
                            <Input
                              value={formStyle.buttonTextColor || '#ffffff'}
                              onChange={(e) => updateCustomStyle({ buttonTextColor: e.target.value })}
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Button Radius</Label>
                          <Select
                            value={formStyle.buttonBorderRadius || 'md'}
                            onValueChange={(value) => updateCustomStyle({ buttonBorderRadius: value as 'none' | 'sm' | 'md' | 'lg' | 'full' })}
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
