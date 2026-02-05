 import { useState, useCallback } from 'react';
 import { Paintbrush, Globe, LayoutTemplate, Palette, Check, Loader2, AlertCircle, CheckCircle, Eye, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FormStyleConfig,
  FormStyleSource,
  FormStyleTemplate,
  FORM_STYLE_TEMPLATES,
  DEFAULT_FORM_STYLE,
} from '@/types/formStyle';
import { DemoEnvironment } from '@/types/demo';
import { ScrapedBranding, scrapingApi, FormElementStyles } from '@/lib/api/scraping';
import { useToast } from '@/hooks/use-toast';

interface FormStyleCardProps {
  demo: DemoEnvironment;
  formStyle: FormStyleConfig;
  onUpdateStyle: (style: FormStyleConfig) => void;
  scrapedBranding?: ScrapedBranding | null;
}

// Helper to convert extracted form styles to FormStyleConfig
function formElementStylesToConfig(styles: FormElementStyles): Partial<FormStyleConfig> {
  const config: Partial<FormStyleConfig> = {
    source: 'mirrored',
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
    else if (radius.includes('999') || radius.includes('9999') || radius.includes('50%') || radius.includes('full')) config.borderRadius = 'full';
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
    const padding = styles.inputPadding;
    const values = padding.split(/\s+/).map(v => parseInt(v));
    const avgPadding = values.reduce((a, b) => a + b, 0) / values.length;
    if (avgPadding <= 8) config.inputPadding = 'sm';
    else if (avgPadding >= 16) config.inputPadding = 'lg';
    else config.inputPadding = 'md';
  }

  if (styles.errorColor) config.errorColor = styles.errorColor;

  return config;
}

type SelectorValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'not-found';

export function FormStyleCard({ demo, formStyle, onUpdateStyle, scrapedBranding }: FormStyleCardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FormStyleSource>(formStyle.source);
  const [isScraping, setIsScraping] = useState(false);
  const [extractedStyles, setExtractedStyles] = useState<FormElementStyles | null>(null);
  const [selectorStatus, setSelectorStatus] = useState<SelectorValidationStatus>('idle');
  const [selectorMessage, setSelectorMessage] = useState<string>('');
 const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    setSelectorStatus('validating');
    setSelectorMessage('');
    
    try {
      const response = await scrapingApi.scrapeFormStyles(
        formStyle.formStyleUrl,
        formStyle.formContainerSelector || undefined
      );
      
      if (!response.success || !response.data) {
        setSelectorStatus('invalid');
        setSelectorMessage(response.error || 'Failed to scrape form styling');
        throw new Error(response.error || 'Failed to scrape form styling');
      }

      // Check if selector was found
      if (formStyle.formContainerSelector) {
        if (response.data.selectorUsed === formStyle.formContainerSelector) {
          setSelectorStatus('valid');
          setSelectorMessage(`Found container: "${formStyle.formContainerSelector}"`);
        } else if (response.data.selectorUsed) {
          setSelectorStatus('valid');
          setSelectorMessage(`Using fallback selector: "${response.data.selectorUsed}"`);
        } else {
          setSelectorStatus('not-found');
          setSelectorMessage('Selector not found, using page-level form styles');
        }
      } else {
        setSelectorStatus('valid');
        setSelectorMessage('Extracted page-level form styles');
      }

      setExtractedStyles(response.data.styles);

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
      if (selectorStatus !== 'invalid' && selectorStatus !== 'not-found') {
        setSelectorStatus('invalid');
        setSelectorMessage(error instanceof Error ? error.message : 'Could not extract form styling');
      }
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

    const mirroredStyle: Partial<FormStyleConfig> = {
      source: 'mirrored',
      inputBgColor: '#ffffff',
      inputBorderColor: '#e2e8f0',
      borderRadius: 'md',
      borderWidth: '1',
      fontSize: 'base',
    };

    if (scrapedBranding?.branding?.colors) {
      if (scrapedBranding.branding.colors.primary) {
        mirroredStyle.inputFocusBorderColor = scrapedBranding.branding.colors.primary;
      }
      if (scrapedBranding.branding.colors.textPrimary) {
        mirroredStyle.inputTextColor = scrapedBranding.branding.colors.textPrimary;
        mirroredStyle.labelColor = scrapedBranding.branding.colors.textPrimary;
      }
    }

    if (scrapedBranding?.branding?.fonts && scrapedBranding.branding.fonts.length > 0) {
      mirroredStyle.fontFamily = scrapedBranding.branding.fonts.map(f => f.family).join(', ') + ', sans-serif';
    }

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
   setHasUnsavedChanges(true);
  };
 
 const handleSaveCustomStyles = useCallback(() => {
   // The styles are already being applied via onUpdateStyle
   // This just provides user feedback
   setHasUnsavedChanges(false);
   toast({
     title: 'Custom Styles Saved',
     description: 'Your color and typography settings have been applied.',
   });
 }, [toast]);

  const hasMirroredData = !!demo.customerSiteUrl || !!scrapedBranding?.branding || !!demo.scrapedCss || !!demo.buttonColor || !!extractedStyles;
 
   // Generate border radius style value
   const getBorderRadius = (radius: string) => {
     switch (radius) {
       case 'none': return '0px';
       case 'sm': return '4px';
       case 'lg': return '12px';
       case 'full': return '9999px';
       default: return '8px';
     }
   };
 
   // Generate padding style value
   const getPadding = (padding: string) => {
     switch (padding) {
       case 'sm': return '8px 12px';
       case 'lg': return '14px 18px';
       default: return '10px 14px';
     }
   };
 
   // Generate font size value
   const getFontSize = (size: string) => {
     switch (size) {
       case 'sm': return '14px';
       case 'lg': return '18px';
       default: return '16px';
     }
   };
 
   // Generate label weight value
   const getLabelWeight = (weight: string) => {
     switch (weight) {
       case 'semibold': return 600;
       case 'medium': return 500;
       default: return 400;
     }
   };

  const getSelectorStatusIcon = () => {
    switch (selectorStatus) {
      case 'validating':
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
      case 'not-found':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
   <div className="space-y-6">
     {/* Live Form Preview - Always visible at top */}
     <Card className="glass-card border-2 border-primary/20">
       <CardHeader className="pb-3">
         <CardTitle className="flex items-center gap-2 text-base">
           <Eye className="w-5 h-5" />
           Live Form Preview
         </CardTitle>
         <p className="text-sm text-muted-foreground">
           This shows how your form will look with the current styling applied
         </p>
       </CardHeader>
       <CardContent>
         <div className="p-6 rounded-lg border bg-white">
           <div className="max-w-md mx-auto space-y-5">
             <h3 
               style={{
                 color: formStyle.labelColor,
                 fontFamily: formStyle.fontFamily,
                 fontSize: '20px',
                 fontWeight: 600,
                 textAlign: 'center',
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
 
             {/* Last Name */}
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
                 Last Name <span style={{ color: formStyle.errorColor }}>*</span>
               </label>
               <input
                 type="text"
                 placeholder="Doe"
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
 
             {/* Date of Birth */}
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
                 Date of Birth
               </label>
               <input
                 type="text"
                 placeholder="MM/DD/YYYY"
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
 
             {/* Submit Button */}
             <button
               style={{
                 width: '100%',
                 padding: '14px 24px',
                 backgroundColor: demo.buttonColor || formStyle.inputFocusBorderColor,
                 color: '#ffffff',
                 border: 'none',
                 borderRadius: getBorderRadius(formStyle.borderRadius),
                 fontFamily: formStyle.fontFamily,
                 fontWeight: 600,
                 fontSize: getFontSize(formStyle.fontSize),
                 cursor: 'pointer',
                 marginTop: '8px',
               }}
             >
               Continue
             </button>
           </div>
         </div>
 
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
               <div className="w-4 h-4 rounded border" style={{ backgroundColor: formStyle.labelColor }} />
               <span className="text-muted-foreground">Label</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded border" style={{ backgroundColor: demo.buttonColor || formStyle.inputFocusBorderColor }} />
               <span className="text-muted-foreground">Button</span>
             </div>
             {formStyle.fontFamily && (
               <div className="flex items-center gap-2">
                 <span className="font-medium" style={{ fontFamily: formStyle.fontFamily }}>Aa</span>
                 <span className="text-muted-foreground truncate max-w-20">{formStyle.fontFamily.split(',')[0]}</span>
               </div>
             )}
             <Badge variant="outline" className="text-xs">
               {formStyle.source === 'mirrored' ? 'Mirrored' : formStyle.source === 'template' ? 'Template' : 'Custom'}
             </Badge>
           </div>
         </div>
       </CardContent>
     </Card>
 
     {/* Style Configuration Card */}
     <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5" />
          Form Styling
        </CardTitle>
        <CardDescription>
          Configure the visual appearance of form inputs and labels
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
                  onChange={(e) => {
                    onUpdateStyle({ ...formStyle, formStyleUrl: e.target.value });
                    setSelectorStatus('idle');
                    setSelectorMessage('');
                  }}
                />
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
                Enter a URL to a form page on the customer's site
              </p>
            </div>

            {/* Container Selector Input */}
            <div className="space-y-2">
              <Label htmlFor="form-container-selector">Form Container Selector (Optional)</Label>
              <div className="relative">
                <Input
                  id="form-container-selector"
                  placeholder="e.g. #signup-form, .application-form, form[name='apply']"
                  value={formStyle.formContainerSelector || ''}
                  onChange={(e) => {
                    onUpdateStyle({ ...formStyle, formContainerSelector: e.target.value });
                    setSelectorStatus('idle');
                    setSelectorMessage('');
                  }}
                  className={selectorStatus === 'valid' ? 'border-green-500 pr-10' : selectorStatus === 'invalid' || selectorStatus === 'not-found' ? 'border-amber-500 pr-10' : ''}
                />
                {selectorStatus !== 'idle' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getSelectorStatusIcon()}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                CSS selector to target a specific form. Leave empty to extract all form styles from the page.
              </p>
            </div>

            {/* Fetch Styles Button */}
            <Button
              onClick={handleScrapeFormUrl}
              disabled={!formStyle.formStyleUrl || isScraping}
              className="w-full"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching Styles...
                </>
              ) : (
                <>
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Fetch Styles
                </>
              )}
            </Button>

            {/* Selector Validation Feedback */}
            {selectorStatus !== 'idle' && selectorMessage && (
              <Alert 
                variant={selectorStatus === 'valid' ? 'default' : 'destructive'} 
                className={
                  selectorStatus === 'valid' 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : selectorStatus === 'not-found' 
                      ? 'border-amber-500/50 bg-amber-500/10' 
                      : ''
                }
              >
                {getSelectorStatusIcon()}
                <AlertDescription className="ml-2">
                  {selectorMessage}
                </AlertDescription>
              </Alert>
            )}

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
                      <Badge variant="default" className="bg-primary">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Input Field</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: formStyle.inputBgColor,
                            color: formStyle.inputTextColor,
                            border: `${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}`,
                            borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                            fontFamily: formStyle.fontFamily,
                          }}
                        >
                          Sample text
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Focus State</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: formStyle.inputBgColor,
                            color: formStyle.inputTextColor,
                            border: `2px solid ${formStyle.inputFocusBorderColor}`,
                            borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                            boxShadow: `0 0 0 3px ${formStyle.inputFocusBorderColor}20`,
                            fontFamily: formStyle.fontFamily,
                          }}
                        >
                          Focused
                        </div>
                      </div>
                      
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

                {/* Extracted form styles preview */}
                {extractedStyles && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Extracted Form Styles
                      </h4>
                      <Badge variant="default" className="bg-primary">Ready to Apply</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Input Field</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: extractedStyles.inputBgColor,
                            color: extractedStyles.inputTextColor,
                            border: `${extractedStyles.inputBorderWidth} solid ${extractedStyles.inputBorderColor}`,
                            borderRadius: extractedStyles.inputBorderRadius,
                            fontFamily: extractedStyles.inputFontFamily,
                          }}
                        >
                          Sample text
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Focus State</span>
                        <div
                          className="h-10 rounded flex items-center px-3 text-sm"
                          style={{
                            backgroundColor: extractedStyles.inputBgColor,
                            color: extractedStyles.inputTextColor,
                            border: `2px solid ${extractedStyles.inputFocusBorderColor}`,
                            borderRadius: extractedStyles.inputBorderRadius,
                            boxShadow: extractedStyles.inputFocusBoxShadow,
                            fontFamily: extractedStyles.inputFontFamily,
                          }}
                        >
                          Focused
                        </div>
                      </div>
                      
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
                    
                    <Button onClick={applyMirroredStyle} className="w-full gradient-primary">
                      <Check className="w-4 h-4 mr-2" />
                      Apply Extracted Styles
                    </Button>
                  </div>
                )}

                {/* Apply Mirrored Style button when no extracted styles */}
                {!extractedStyles && formStyle.source !== 'mirrored' && hasMirroredData && (
                  <Button onClick={applyMirroredStyle} variant="outline" className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    Apply Site Branding as Form Style
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-6 text-center rounded-lg border-2 border-dashed border-border">
                <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Enter a form URL above and click "Fetch Styles" to extract form styling
                </p>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="template" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FORM_STYLE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 ${
                    formStyle.source === 'template' && formStyle.templateId === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    {formStyle.source === 'template' && formStyle.templateId === template.id && (
                      <Badge variant="default" className="bg-primary">Active</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: template.preview.primaryColor }}
                      title="Primary color"
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: template.preview.bgColor }}
                      title="Background color"
                    />
                    <div
                      className="flex-1 h-8 rounded border flex items-center px-2 text-xs"
                      style={{
                        backgroundColor: template.style.inputBgColor,
                        color: template.style.inputTextColor,
                        borderColor: template.style.inputBorderColor,
                        fontFamily: template.style.fontFamily,
                      }}
                    >
                      Input
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Custom Tab */}
          <TabsContent value="custom" className="space-y-6">
           {/* Info Banner */}
           <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
             <p className="text-sm text-primary">
               <strong>Custom styling mode:</strong> Changes here will override any mirrored or template styles. 
               The current values below reflect your active form styling.
             </p>
           </div>
           
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
             <div className="flex items-center justify-between">
               <h4 className="font-semibold text-sm">Colors</h4>
               <p className="text-xs text-muted-foreground">Click swatches to change colors</p>
             </div>
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
 
           {/* Save Button */}
           <div className="pt-4 border-t border-border">
             <Button 
               onClick={handleSaveCustomStyles} 
               className="w-full gradient-primary"
               disabled={!hasUnsavedChanges}
             >
               <Save className="w-4 h-4 mr-2" />
               {hasUnsavedChanges ? 'Save Custom Styles' : 'Styles Saved'}
             </Button>
           </div>

            {/* Live Preview */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Preview</h4>
              <div className="p-6 rounded-lg border bg-white">
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-2">
                    <label
                      style={{
                        color: formStyle.labelColor,
                        fontWeight: formStyle.labelWeight === 'semibold' ? 600 : formStyle.labelWeight === 'medium' ? 500 : 400,
                        fontFamily: formStyle.fontFamily,
                        fontSize: formStyle.fontSize === 'sm' ? '14px' : formStyle.fontSize === 'lg' ? '18px' : '16px',
                      }}
                    >
                      Email Address <span style={{ color: formStyle.errorColor }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      style={{
                        width: '100%',
                        padding: formStyle.inputPadding === 'sm' ? '8px 12px' : formStyle.inputPadding === 'lg' ? '14px 18px' : '10px 14px',
                        backgroundColor: formStyle.inputBgColor,
                        color: formStyle.inputTextColor,
                        border: `${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}`,
                        borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                        fontFamily: formStyle.fontFamily,
                        fontSize: formStyle.fontSize === 'sm' ? '14px' : formStyle.fontSize === 'lg' ? '18px' : '16px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      backgroundColor: demo.buttonColor || formStyle.inputFocusBorderColor,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: formStyle.borderRadius === 'none' ? '0px' : formStyle.borderRadius === 'sm' ? '4px' : formStyle.borderRadius === 'lg' ? '12px' : formStyle.borderRadius === 'full' ? '9999px' : '8px',
                      fontFamily: formStyle.fontFamily,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
   </div>
   );
 }
