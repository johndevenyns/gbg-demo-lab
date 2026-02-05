 import { useState, useRef, useMemo } from "react";
 import { Camera, Loader2, ExternalLink, Eye, Check, Monitor, Tablet, Smartphone, Paintbrush, RefreshCw, Crop } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent } from "@/components/ui/card";
 import { scrapingApi, ScrapedBranding, FormElementStyles } from "@/lib/api/scraping";
 import { ScreenshotCropEditor } from "./ScreenshotCropEditor";
 import { useToast } from "@/hooks/use-toast";
 import { DemoEnvironment } from "@/types/demo";
 import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
 
 // Helper functions for form style values
 function getBorderRadiusValue(radius: string = 'md'): string {
   switch (radius) {
     case 'none': return '0px';
     case 'sm': return '4px';
     case 'lg': return '12px';
     case 'full': return '9999px';
     default: return '8px';
   }
 }
 
 function getPaddingValue(padding: string = 'md'): string {
   switch (padding) {
     case 'sm': return '8px 12px';
     case 'lg': return '14px 18px';
     default: return '10px 14px';
   }
 }
 
 function getFontSizeValue(size: string = 'base'): string {
   switch (size) {
     case 'sm': return '14px';
     case 'lg': return '18px';
     default: return '16px';
   }
 }
 
 function getLabelWeightValue(weight: string = 'medium'): number {
   switch (weight) {
     case 'semibold': return 600;
     case 'medium': return 500;
     default: return 400;
   }
 }
 
 // Generate form HTML using demo's form style
 function generateStyledFormHtml(formStyle: FormStyleConfig, buttonColor: string): string {
   const borderRadius = getBorderRadiusValue(formStyle.borderRadius);
   const padding = getPaddingValue(formStyle.inputPadding);
   const fontSize = getFontSizeValue(formStyle.fontSize);
   const labelWeight = getLabelWeightValue(formStyle.labelWeight);
   
   const inputStyle = `width: 100%; padding: ${padding}; border: ${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}; border-radius: ${borderRadius}; background: ${formStyle.inputBgColor}; color: ${formStyle.inputTextColor}; font-family: ${formStyle.fontFamily}; font-size: ${fontSize}; box-sizing: border-box; outline: none;`;
   const labelStyle = `display: block; margin-bottom: 6px; font-weight: ${labelWeight}; color: ${formStyle.labelColor}; font-family: ${formStyle.fontFamily}; font-size: ${fontSize};`;
   
   return `<div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e5e7eb;"><h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: ${formStyle.labelColor}; font-family: ${formStyle.fontFamily}; text-align: center;">Application Form</h2><div style="margin-bottom: 16px;"><label style="${labelStyle}">First Name<span style="color: ${formStyle.errorColor}; margin-left: 4px;">*</span></label><input type="text" placeholder="John" style="${inputStyle}" /></div><div style="margin-bottom: 16px;"><label style="${labelStyle}">Email<span style="color: ${formStyle.errorColor}; margin-left: 4px;">*</span></label><input type="email" placeholder="john@example.com" style="${inputStyle}" /></div><button style="width: 100%; padding: 12px 24px; background: ${buttonColor}; color: white; border: none; border-radius: ${borderRadius}; font-size: ${fontSize}; font-weight: 600; cursor: pointer; font-family: ${formStyle.fontFamily};">Continue</button></div>`;
 }
 
 type ViewportSize = 'desktop' | 'tablet' | 'mobile';
 
 interface CropSettings {
   headerHeight: number;
   headerOffsetY: number;
   footerHeight: number;
   footerOffsetY: number;
 }
 
 const DEFAULT_CROP_SETTINGS: CropSettings = {
   headerHeight: 180,
   headerOffsetY: 0,
   footerHeight: 180,
   footerOffsetY: 0,
 };
 
 function getScreenshotSrc(screenshot: string): string {
   const s = screenshot.trim();
   if (!s) return '';
   if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
   return `data:image/png;base64,${s}`;
 }
 
 // Convert FormElementStyles to FormStyleConfig
 function formElementStylesToConfig(styles: FormElementStyles): FormStyleConfig {
   const config: FormStyleConfig = { ...DEFAULT_FORM_STYLE, source: 'mirrored' };
   if (styles.inputBgColor) config.inputBgColor = styles.inputBgColor;
   if (styles.inputTextColor) config.inputTextColor = styles.inputTextColor;
   if (styles.inputBorderColor) config.inputBorderColor = styles.inputBorderColor;
   if (styles.inputFocusBorderColor) config.inputFocusBorderColor = styles.inputFocusBorderColor;
   if (styles.labelColor) config.labelColor = styles.labelColor;
   if (styles.errorColor) config.errorColor = styles.errorColor;
   return config;
 }
 
 // Generate preview HTML with screenshot crops
 function generateScreenshotPreviewHtml(
   screenshotSrc: string,
   formStyles: FormElementStyles | undefined,
   buttonColor: string,
   cropSettings: CropSettings
 ): string {
   const fontFamily = formStyles?.inputFontFamily || 'system-ui, sans-serif';
   const labelColor = formStyles?.labelColor || '#333333';
   const inputBgColor = formStyles?.inputBgColor || '#ffffff';
   const inputTextColor = formStyles?.inputTextColor || '#1f2937';
   const inputBorderColor = formStyles?.inputBorderColor || '#d1d5db';
   const inputBorderRadius = formStyles?.inputBorderRadius || '8px';
   const inputBorderWidth = formStyles?.inputBorderWidth || '1px';
 
   const headerContent = `
     <div style="width: 100%; height: ${cropSettings.headerHeight}px; overflow: hidden;">
        <img src="${screenshotSrc}" style="width: 100%; display: block; object-fit: cover; object-position: center -${cropSettings.headerOffsetY}px;" alt="Header" />
     </div>
   `;
 
   const footerContent = `
     <div style="width: 100%; height: ${cropSettings.footerHeight}px; overflow: hidden;">
        <img src="${screenshotSrc}" style="width: 100%; display: block; object-fit: cover; object-position: center calc(100% + ${cropSettings.footerOffsetY}px);" alt="Footer" />
     </div>
   `;
 
   return `
     <!DOCTYPE html>
     <html>
       <head>
         <meta charset="utf-8">
         <style>body { margin: 0; font-family: ${fontFamily}; } * { box-sizing: border-box; }</style>
       </head>
       <body>
         ${headerContent}
         <div style="padding: 40px 20px; background: #f5f5f5; min-height: 200px;">
           <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e5e7eb;">
             <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: ${labelColor}; text-align: center;">Application Form</h2>
             <div style="margin-bottom: 16px;">
               <label style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor};">First Name</label>
               <input type="text" placeholder="John" style="width: 100%; padding: 10px 14px; border: ${inputBorderWidth} solid ${inputBorderColor}; border-radius: ${inputBorderRadius}; background: ${inputBgColor}; color: ${inputTextColor};" />
             </div>
             <button style="width: 100%; padding: 12px 24px; background: ${buttonColor}; color: white; border: none; border-radius: ${inputBorderRadius}; font-size: 16px; font-weight: 500; cursor: pointer;">Continue</button>
           </div>
         </div>
         ${footerContent}
       </body>
     </html>
   `;
 }
 
 interface ScreenshotCaptureTabProps {
   demo: DemoEnvironment;
   url: string;
   onUrlChange: (url: string) => void;
   onApply: (updates: Partial<DemoEnvironment>) => void;
   isConfigured: boolean;
 }
 
 export function ScreenshotCaptureTab({ demo, url, onUrlChange, onApply, isConfigured }: ScreenshotCaptureTabProps) {
   const { toast } = useToast();
   const [isLoading, setIsLoading] = useState(false);
   const [scrapedData, setScrapedData] = useState<ScrapedBranding | null>(null);
   const [selectedViewport, setSelectedViewport] = useState<ViewportSize>('desktop');
   const [cropSettings, setCropSettings] = useState<CropSettings>(DEFAULT_CROP_SETTINGS);
  const [previewKey, setPreviewKey] = useState(0);
  const [showSavedCropEditor, setShowSavedCropEditor] = useState(false);
  const [savedCropSettings, setSavedCropSettings] = useState<CropSettings>(DEFAULT_CROP_SETTINGS);
  const [savedPreviewKey, setSavedPreviewKey] = useState(0);
  
  const refreshPreview = () => {
    setPreviewKey((k) => k + 1);
  };
 
  // Extract the screenshot source from saved HTML if available
  const savedScreenshotSrc = useMemo(() => {
    if (!demo.mirrorScreenshotHeaderHtml) return null;
    const match = demo.mirrorScreenshotHeaderHtml.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  }, [demo.mirrorScreenshotHeaderHtml]);
 
  const handleApplySavedCrop = () => {
    if (!savedScreenshotSrc) return;
    
    const updates: Partial<DemoEnvironment> = {
      mirrorScreenshotHeaderHtml: `<div style="width: 100%; height: ${savedCropSettings.headerHeight}px; overflow: hidden;"><img src="${savedScreenshotSrc}" style="width: 100%; display: block; object-fit: cover; object-position: center -${savedCropSettings.headerOffsetY}px;" alt="Site header" /></div>`,
      mirrorScreenshotFooterHtml: `<div style="width: 100%; height: ${savedCropSettings.footerHeight}px; overflow: hidden;"><img src="${savedScreenshotSrc}" style="width: 100%; display: block; object-fit: cover; object-position: center calc(100% + ${savedCropSettings.footerOffsetY}px);" alt="Site footer" /></div>`,
    };
    
    onApply(updates);
    setSavedPreviewKey((k) => k + 1);
    toast({ title: "Crop Updated", description: "Header and footer crop settings have been saved" });
  };
 
   const getSelectedScreenshot = (): string | null => {
     if (!scrapedData) return null;
     if (scrapedData.screenshots) {
       return scrapedData.screenshots[selectedViewport] || scrapedData.screenshot;
     }
     return scrapedData.screenshot;
   };
 
   const handleCapture = async () => {
     if (!url.trim()) {
       toast({ title: "URL Required", description: "Please enter a website URL", variant: "destructive" });
       return;
     }
 
     setIsLoading(true);
     try {
       const response = await scrapingApi.scrapeSiteBranding(url);
       if (response.success && response.data) {
         setScrapedData(response.data);
         toast({ title: "Screenshots Captured", description: "Site screenshots are ready for cropping" });
       } else {
         toast({ title: "Capture Failed", description: response.error || "Could not capture screenshots", variant: "destructive" });
       }
     } catch (error) {
       console.error("Error capturing:", error);
       toast({ title: "Error", description: "Failed to capture screenshots. Check Firecrawl connector.", variant: "destructive" });
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleApply = () => {
     if (!scrapedData) return;
 
     const selectedScreenshotUrl = getSelectedScreenshot();
     const screenshotSrc = selectedScreenshotUrl ? getScreenshotSrc(selectedScreenshotUrl) : '';
 
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
      // Store in dedicated screenshot capture fields (won't overwrite HTML capture)
      mirrorScreenshotHeaderHtml: screenshotSrc
          ? `<div style="width: 100%; height: ${cropSettings.headerHeight}px; overflow: hidden;"><img src="${screenshotSrc}" style="width: 100%; display: block; object-fit: cover; object-position: center -${cropSettings.headerOffsetY}px;" alt="Site header" /></div>`
         : '',
      mirrorScreenshotFooterHtml: screenshotSrc
          ? `<div style="width: 100%; height: ${cropSettings.footerHeight}px; overflow: hidden;"><img src="${screenshotSrc}" style="width: 100%; display: block; object-fit: cover; object-position: center calc(100% + ${cropSettings.footerOffsetY}px);" alt="Site footer" /></div>`
         : '',
      mirrorScreenshotCss: '',
       ...(formStyleConfig && { formStyle: formStyleConfig }),
     };
 
     onApply(updates);
     toast({ title: "Screenshot Capture Applied", description: "Header and footer screenshots have been saved" });
   };
 
   const selectedScreenshot = getSelectedScreenshot();
 
   return (
     <div className="space-y-4">
       <Card>
         <CardContent className="pt-4 space-y-4">
           <p className="text-sm text-muted-foreground">
             Captures full-page screenshots and lets you crop specific regions for the header and footer.
             Purely visual—no interactive elements.
           </p>
           
           <div className="flex gap-2">
             <div className="flex-1">
               <Label>Website URL</Label>
               <Input
                 value={url}
                 onChange={(e) => onUrlChange(e.target.value)}
                 placeholder="https://example.com"
                 type="url"
               />
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             <Button onClick={handleCapture} disabled={isLoading || !url.trim()}>
               {isLoading ? (
                 <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Capturing...</>
               ) : (
                 <><Camera className="w-4 h-4 mr-2" />Capture Screenshots</>
               )}
             </Button>
             {url && (
               <Button variant="outline" size="icon" onClick={() => window.open(url, '_blank')} title="Open site">
                 <ExternalLink className="w-4 h-4" />
               </Button>
             )}
           </div>
         </CardContent>
       </Card>
 
       {/* Screenshot Preview & Crop Editor */}
       {scrapedData && selectedScreenshot && (
         <Card>
           <CardContent className="pt-4 space-y-4">
             <div className="flex items-center justify-between flex-wrap gap-2">
               <Label className="text-base font-semibold flex items-center gap-2">
                 <Eye className="w-4 h-4" />
                 Crop Header & Footer
               </Label>
               <Button onClick={handleApply} size="sm" className="gradient-primary">
                 <Check className="w-4 h-4 mr-2" />
                 Apply Screenshot Capture
               </Button>
             </div>
 
             {/* Viewport Selector */}
             <div className="flex items-center justify-between flex-wrap gap-2">
               <Label className="text-sm">Select Viewport</Label>
               <div className="flex gap-1">
                 {[
                   { key: 'desktop' as ViewportSize, icon: Monitor, label: 'Desktop' },
                   { key: 'tablet' as ViewportSize, icon: Tablet, label: 'Tablet' },
                   { key: 'mobile' as ViewportSize, icon: Smartphone, label: 'Mobile' },
                 ].map(({ key, icon: Icon, label }) => (
                   <Button
                     key={key}
                     variant={selectedViewport === key ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setSelectedViewport(key)}
                     disabled={!scrapedData.screenshots?.[key] && key !== 'desktop'}
                     className="gap-1"
                   >
                     <Icon className="w-4 h-4" />
                     {label}
                   </Button>
                 ))}
               </div>
             </div>
 
             {/* Viewport Thumbnails */}
             {scrapedData.screenshots && (
               <div className="grid grid-cols-3 gap-2">
                 {[
                   { key: 'desktop' as ViewportSize, icon: Monitor, label: 'Desktop' },
                   { key: 'tablet' as ViewportSize, icon: Tablet, label: 'Tablet' },
                   { key: 'mobile' as ViewportSize, icon: Smartphone, label: 'Mobile' },
                 ].map(({ key, icon: Icon, label }) => {
                   const screenshot = scrapedData.screenshots?.[key];
                   return (
                     <button
                       key={key}
                       onClick={() => screenshot && setSelectedViewport(key)}
                       className={`p-2 rounded-lg border transition-all ${
                         selectedViewport === key 
                           ? 'border-primary ring-2 ring-primary/20' 
                           : 'border-border hover:border-primary/50'
                       } ${!screenshot ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                       disabled={!screenshot}
                     >
                       <div className="flex items-center justify-center gap-1 mb-2 text-xs font-medium">
                         <Icon className="w-3 h-3" />
                         {label}
                       </div>
                       <div className="aspect-video bg-muted rounded overflow-hidden">
                         {screenshot ? (
                           <img src={getScreenshotSrc(screenshot)} alt={label} className="w-full h-full object-cover object-top" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">N/A</div>
                         )}
                       </div>
                     </button>
                   );
                 })}
               </div>
             )}
 
             {/* Visual Crop Editor */}
             <ScreenshotCropEditor
               screenshotSrc={getScreenshotSrc(selectedScreenshot)}
               cropSettings={cropSettings}
               onCropChange={setCropSettings}
               onReset={() => setCropSettings(DEFAULT_CROP_SETTINGS)}
               onApplyCrop={refreshPreview}
             />
 
             {/* Live Preview */}
             <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Live Preview
                </Label>
                <Button variant="outline" size="sm" onClick={refreshPreview}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Preview
                </Button>
              </div>
               <div className="border rounded-lg overflow-hidden bg-background">
                 <iframe
                  key={previewKey}
                   srcDoc={generateScreenshotPreviewHtml(
                     getScreenshotSrc(selectedScreenshot),
                     scrapedData.formStyles,
                     scrapedData.colors.buttonColor,
                     cropSettings
                   )}
                   className="w-full h-[400px] border-0"
                   title="Screenshot preview"
                   sandbox="allow-same-origin"
                 />
               </div>
             </div>
 
             {/* Form Styles Preview */}
             {scrapedData.formStyles && (
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Paintbrush className="w-4 h-4" />
                   Extracted Form Styling (will be applied)
                 </Label>
                 <div className="p-3 rounded-lg bg-muted/50 border">
                   <div className="grid grid-cols-3 gap-3">
                     <div className="space-y-1">
                       <span className="text-xs text-muted-foreground">Input</span>
                       <div className="h-8 rounded flex items-center px-2 text-xs"
                         style={{
                           backgroundColor: scrapedData.formStyles.inputBgColor,
                           color: scrapedData.formStyles.inputTextColor,
                           border: `${scrapedData.formStyles.inputBorderWidth} solid ${scrapedData.formStyles.inputBorderColor}`,
                           borderRadius: scrapedData.formStyles.inputBorderRadius,
                         }}>
                         Sample
                       </div>
                     </div>
                     <div className="space-y-1">
                       <span className="text-xs text-muted-foreground">Focus</span>
                       <div className="h-8 rounded flex items-center px-2 text-xs"
                         style={{
                           backgroundColor: scrapedData.formStyles.inputBgColor,
                           border: `2px solid ${scrapedData.formStyles.inputFocusBorderColor}`,
                           borderRadius: scrapedData.formStyles.inputBorderRadius,
                         }}>
                         Focused
                       </div>
                     </div>
                     <div className="space-y-1">
                       <span className="text-xs text-muted-foreground">Button</span>
                       <div className="h-8 rounded flex items-center justify-center px-2 text-xs"
                         style={{
                           backgroundColor: scrapedData.formStyles.buttonBgColor,
                           color: scrapedData.formStyles.buttonTextColor,
                           borderRadius: scrapedData.formStyles.buttonBorderRadius,
                         }}>
                         Submit
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
       )}
 
       {/* Current Applied State */}
       {isConfigured && !scrapedData && (
         <Card className="border-primary/30">
           <CardContent className="pt-4 space-y-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-primary">
                 <Check className="w-4 h-4" />
                 <span className="font-medium">Currently Applied Screenshot Capture</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-xs text-muted-foreground">
                   From: {demo.customerSiteUrl}
                 </span>
                 {savedScreenshotSrc && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setShowSavedCropEditor(!showSavedCropEditor)}
                   >
                     <Crop className="w-4 h-4 mr-2" />
                     {showSavedCropEditor ? 'Hide Crop Editor' : 'Adjust Crop'}
                   </Button>
                 )}
               </div>
             </div>
 
             {/* Crop Editor for Saved Screenshot */}
             {showSavedCropEditor && savedScreenshotSrc && (
               <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                 <div className="flex items-center justify-between">
                   <Label className="text-base font-semibold flex items-center gap-2">
                     <Crop className="w-4 h-4" />
                     Adjust Header & Footer Crop
                   </Label>
                   <Button onClick={handleApplySavedCrop} size="sm" className="gradient-primary">
                     <Check className="w-4 h-4 mr-2" />
                     Apply Crop Changes
                   </Button>
                 </div>
                 <ScreenshotCropEditor
                   screenshotSrc={savedScreenshotSrc}
                   cropSettings={savedCropSettings}
                   onCropChange={setSavedCropSettings}
                   onReset={() => setSavedCropSettings(DEFAULT_CROP_SETTINGS)}
                   onApplyCrop={handleApplySavedCrop}
                 />
               </div>
             )}
 
             {/* Live Preview of Saved Content */}
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <Label className="flex items-center gap-2">
                   <Eye className="w-4 h-4" />
                   Saved Screenshot Preview
                 </Label>
                 <Button variant="outline" size="sm" onClick={() => setSavedPreviewKey((k) => k + 1)}>
                   <RefreshCw className="w-4 h-4 mr-2" />
                   Refresh
                 </Button>
               </div>
               <div className="border rounded-lg overflow-hidden bg-background">
                 <iframe
                   key={savedPreviewKey}
                   srcDoc={(() => {
                     const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
                     return `
                     <!DOCTYPE html>
                     <html>
                       <head>
                         <meta charset="utf-8">
                         <style>
                           body { margin: 0; padding: 0; font-family: ${formStyle.fontFamily}; }
                           * { box-sizing: border-box; }
                           img { max-width: 100%; display: block; }
                         </style>
                       </head>
                       <body>
                         ${demo.mirrorScreenshotHeaderHtml || '<div style="padding: 20px; background: #f0f0f0; text-align: center; color: #666;">No header screenshot captured</div>'}
                         <div style="padding: 40px 20px; background: #f5f5f5; min-height: 150px;">
                           ${generateStyledFormHtml(formStyle, demo.buttonColor || '#3b82f6')}
                         </div>
                         ${demo.mirrorScreenshotFooterHtml || '<div style="padding: 20px; background: #f0f0f0; text-align: center; color: #666;">No footer screenshot captured</div>'}
                       </body>
                     </html>
                   `;
                   })()}
                   className="w-full h-[350px] border-0"
                   title="Saved screenshot capture preview"
                   sandbox="allow-same-origin"
                 />
               </div>
             </div>
 
             {/* Content Stats */}
             <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
               <div className="flex items-center gap-1">
                 <span className="font-medium">Header:</span>
                 <span>{demo.mirrorScreenshotHeaderHtml ? 'Captured' : 'None'}</span>
               </div>
               <div className="flex items-center gap-1">
                 <span className="font-medium">Footer:</span>
                 <span>{demo.mirrorScreenshotFooterHtml ? 'Captured' : 'None'}</span>
               </div>
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }