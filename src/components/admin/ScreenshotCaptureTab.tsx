import { useState, useMemo, useRef } from "react";
import { Camera, Loader2, ExternalLink, Eye, Check, Monitor, Tablet, Smartphone, Paintbrush, RefreshCw, Crop, Ban } from "lucide-react";
import { ScreenshotUploadSection } from "./ScreenshotUploadSection";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent } from "@/components/ui/card";
 import { scrapingApi, ScrapedBranding, FormElementStyles } from "@/lib/api/scraping";
 import { ScreenshotCropEditor } from "./ScreenshotCropEditor";
 import { useToast } from "@/hooks/use-toast";
 import { DemoEnvironment } from "@/types/demo";
 import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
 import { generateFormHtml, generatePreviewDocument, formElementStylesToConfig, getReadableTextColor } from "@/lib/formStyleUtils";
 
 type ViewportSize = 'desktop' | 'tablet' | 'mobile';
 
 interface CropSettings {
   headerHeight: number;
   headerOffsetY: number;
   footerHeight: number;
   footerOffsetY: number;
  naturalHeight?: number;
  naturalWidth?: number;
 }
 
 const DEFAULT_CROP_SETTINGS: CropSettings = {
   headerHeight: 180,
   headerOffsetY: 0,
   footerHeight: 180,
   footerOffsetY: 0,
 };
 
 // Crop settings per viewport
 interface ViewportCropSettings {
   desktop: CropSettings;
   tablet: CropSettings;
   mobile: CropSettings;
 }
 
 const DEFAULT_VIEWPORT_CROP_SETTINGS: ViewportCropSettings = {
   desktop: { ...DEFAULT_CROP_SETTINGS },
   tablet: { ...DEFAULT_CROP_SETTINGS },
   mobile: { ...DEFAULT_CROP_SETTINGS },
 };
 
 function getScreenshotSrc(screenshot: string): string {
   const s = screenshot.trim();
   if (!s) return '';
   if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
   return `data:image/png;base64,${s}`;
 }
 
// Map AI-extracted border radius string to config enum
function mapBorderRadius(radius: string | undefined): 'none' | 'sm' | 'md' | 'lg' | 'full' {
  if (!radius) return 'md';
  const lower = radius.toLowerCase();
  if (lower.includes('none') || lower === '0' || lower === '0px') return 'none';
  if (lower.includes('sm') || lower.includes('small') || lower === '4px') return 'sm';
  if (lower.includes('lg') || lower.includes('large') || lower === '12px') return 'lg';
  if (lower.includes('full') || lower.includes('pill') || lower === '9999px') return 'full';
  return 'md';
}

// Map AI-extracted font size to config enum
function mapFontSize(size: string | undefined): 'sm' | 'base' | 'lg' {
  if (!size) return 'base';
  const lower = size.toLowerCase();
  if (lower.includes('sm') || lower.includes('small') || lower === '14px') return 'sm';
  if (lower.includes('lg') || lower.includes('large') || lower === '18px') return 'lg';
  return 'base';
}

// Map AI-extracted label weight to config enum
function mapLabelWeight(weight: string | undefined): 'normal' | 'medium' | 'semibold' {
  if (!weight) return 'medium';
  const lower = weight.toLowerCase();
  if (lower.includes('normal') || lower === '400') return 'normal';
  if (lower.includes('semibold') || lower.includes('semi-bold') || lower === '600') return 'semibold';
  return 'medium';
}

// Map AI-extracted border width to config value
function mapBorderWidth(width: string | undefined): '0' | '1' | '2' {
  if (!width) return '1';
  if (width.includes('2')) return '2';
  if (width.includes('0') && !width.includes('10')) return '0';
  return '1';
}

 // formElementStylesToConfig is now imported from @/lib/formStyleUtils
 
 // Generate preview HTML with screenshot crops
 function generateScreenshotPreviewHtml(
   screenshotSrc: string,
   formStyle: FormStyleConfig,
   buttonColor: string,
   cropSettings: CropSettings
 ): string {
  const naturalHeight = cropSettings.naturalHeight || 1000;
  
  // Calculate percentages for responsive cropping
  // The header shows headerHeight worth of content starting at headerOffsetY
  const headerOffsetPercent = (cropSettings.headerOffsetY / naturalHeight) * 100;
  const headerHeightPercent = (cropSettings.headerHeight / naturalHeight) * 100;
  
  // For the header: use aspect-ratio trick to maintain proportions
  // paddingBottom as percentage creates a responsive height based on image aspect ratio
  const headerContent = `
    <div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${headerHeightPercent}%;">
      <img src="${screenshotSrc}" style="position: absolute; width: 100%; top: -${headerOffsetPercent}%; left: 0;" alt="Header" />
    </div>
  `;
  
  // For the footer: show footerHeight from the bottom, offset by footerOffsetY from bottom edge
  const footerOffsetPercent = (cropSettings.footerOffsetY / naturalHeight) * 100;
  const footerHeightPercent = (cropSettings.footerHeight / naturalHeight) * 100;
  const footerTopPercent = 100 - footerHeightPercent - footerOffsetPercent;
  
  const footerContent = `
    <div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${footerHeightPercent}%;">
      <img src="${screenshotSrc}" style="position: absolute; width: 100%; top: -${footerTopPercent}%; left: 0;" alt="Footer" />
    </div>
  `;
 
    return generatePreviewDocument({
      formStyle,
      buttonColor,
      headerHtml: headerContent,
      footerHtml: footerContent,
      // Prefer explicit content bg from form style when present
      contentBgColor: formStyle.contentAreaBgColor,
    });
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
    const [viewportCropSettings, setViewportCropSettings] = useState<ViewportCropSettings>(DEFAULT_VIEWPORT_CROP_SETTINGS);
   const [previewKey, setPreviewKey] = useState(0);
   const [showSavedCropEditor, setShowSavedCropEditor] = useState(false);
   const [savedCropSettings, setSavedCropSettings] = useState<CropSettings>(DEFAULT_CROP_SETTINGS);
   const [savedPreviewKey, setSavedPreviewKey] = useState(0);
   const abortControllerRef = useRef<AbortController | null>(null);
   
   const refreshPreview = () => {
     setPreviewKey((k) => k + 1);
   };
 
   // Get current viewport's crop settings
   const cropSettings = viewportCropSettings[selectedViewport];
   
   // Update current viewport's crop settings
   const setCropSettings = (settings: CropSettings | ((prev: CropSettings) => CropSettings)) => {
     setViewportCropSettings(prev => ({
       ...prev,
       [selectedViewport]: typeof settings === 'function' ? settings(prev[selectedViewport]) : settings,
     }));
   };
 
  // Extract the screenshot source from saved HTML if available
  const savedScreenshotSrc = useMemo(() => {
    if (!demo.mirrorScreenshotHeaderHtml) return null;
    const match = demo.mirrorScreenshotHeaderHtml.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  }, [demo.mirrorScreenshotHeaderHtml]);
 
  const handleApplySavedCrop = () => {
    if (!savedScreenshotSrc) return;
    
    const naturalHeight = savedCropSettings.naturalHeight || 1000;
    const headerOffsetPercent = (savedCropSettings.headerOffsetY / naturalHeight) * 100;
    const headerHeightPercent = (savedCropSettings.headerHeight / naturalHeight) * 100;
    const footerOffsetPercent = (savedCropSettings.footerOffsetY / naturalHeight) * 100;
    const footerHeightPercent = (savedCropSettings.footerHeight / naturalHeight) * 100;
    const footerTopPercent = 100 - footerHeightPercent - footerOffsetPercent;
    
    const updates: Partial<DemoEnvironment> = {
      mirrorScreenshotHeaderHtml: `<div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${headerHeightPercent}%;"><img src="${savedScreenshotSrc}" style="position: absolute; width: 100%; top: -${headerOffsetPercent}%; left: 0;" alt="Site header" /></div>`,
      mirrorScreenshotFooterHtml: `<div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${footerHeightPercent}%;"><img src="${savedScreenshotSrc}" style="position: absolute; width: 100%; top: -${footerTopPercent}%; left: 0;" alt="Site footer" /></div>`,
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
 
     const handleFetch = async () => {
       if (!url.trim()) {
         toast({ title: "URL Required", description: "Please enter a website URL", variant: "destructive" });
         return;
       }

       const controller = new AbortController();
       abortControllerRef.current = controller;
       setIsLoading(true);
       try {
         const response = await scrapingApi.scrapeSiteBranding(url, controller.signal);
         if (controller.signal.aborted) return;
         if (response.success && response.data) {
           setScrapedData(response.data);
           toast({ title: "Screenshots Fetched", description: "Site screenshots are ready for cropping" });
         } else {
           toast({ title: "Fetch Failed", description: response.error || "Could not fetch screenshots", variant: "destructive" });
         }
       } catch (error: any) {
         if (controller.signal.aborted) return;
         console.error("Error fetching:", error);
         toast({ title: "Error", description: "Failed to fetch screenshots. Check Firecrawl connector.", variant: "destructive" });
       } finally {
         if (!controller.signal.aborted) setIsLoading(false);
         abortControllerRef.current = null;
       }
     };

     const handleCancel = () => {
       abortControllerRef.current?.abort();
       abortControllerRef.current = null;
       setIsLoading(false);
       toast({ title: "Cancelled", description: "Fetch operation was cancelled" });
     };
 
   const handleApply = () => {
     if (!scrapedData) return;
 
     // Get all viewport screenshots
     const desktopScreenshot = scrapedData.screenshots?.desktop || scrapedData.screenshot || '';
     const tabletScreenshot = scrapedData.screenshots?.tablet || '';
     const mobileScreenshot = scrapedData.screenshots?.mobile || '';
     
     const desktopSrc = desktopScreenshot ? getScreenshotSrc(desktopScreenshot) : '';
     const tabletSrc = tabletScreenshot ? getScreenshotSrc(tabletScreenshot) : '';
     const mobileSrc = mobileScreenshot ? getScreenshotSrc(mobileScreenshot) : '';
     
     // Generate HTML for each viewport
     const generateHeaderHtml = (src: string, settings: CropSettings) => {
       if (!src) return '';
        const naturalHeight = settings.naturalHeight || 1000;
        const headerOffsetPercent = (settings.headerOffsetY / naturalHeight) * 100;
        const headerHeightPercent = (settings.headerHeight / naturalHeight) * 100;
        return `<div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${headerHeightPercent}%;"><img src="${src}" style="position: absolute; width: 100%; top: -${headerOffsetPercent}%; left: 0;" alt="Site header" /></div>`;
     };
     
     const generateFooterHtml = (src: string, settings: CropSettings) => {
       if (!src) return '';
        const naturalHeight = settings.naturalHeight || 1000;
        const footerOffsetPercent = (settings.footerOffsetY / naturalHeight) * 100;
        const footerHeightPercent = (settings.footerHeight / naturalHeight) * 100;
        const footerTopPercent = 100 - footerHeightPercent - footerOffsetPercent;
        return `<div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${footerHeightPercent}%;"><img src="${src}" style="position: absolute; width: 100%; top: -${footerTopPercent}%; left: 0;" alt="Site footer" /></div>`;
     };
 
      const updates: Partial<DemoEnvironment> = {
        customerSiteUrl: url,
        // Only write to screenshot-specific fields — don't overwrite shared branding/formStyle
        mirrorScreenshotHeaderHtml: generateHeaderHtml(desktopSrc, viewportCropSettings.desktop),
        mirrorScreenshotFooterHtml: generateFooterHtml(desktopSrc, viewportCropSettings.desktop),
        mirrorScreenshotCss: JSON.stringify({
          viewportScreenshots: {
            desktop: { src: desktopSrc, crop: viewportCropSettings.desktop },
            tablet: { src: tabletSrc, crop: viewportCropSettings.tablet },
            mobile: { src: mobileSrc, crop: viewportCropSettings.mobile },
          }
        }),
      };

       onApply(updates);
       toast({ title: "Screenshot Fetch Applied", description: "All viewport screenshots have been saved" });
    };
 
   const selectedScreenshot = getSelectedScreenshot();
 
    return (
      <div className="space-y-4">
        {/* Upload Custom Images */}
        <ScreenshotUploadSection demo={demo} onApply={onApply} />

        <Card>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Fetches full-page screenshots and lets you crop specific regions for the header and footer.
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
              <Button onClick={handleFetch} disabled={isLoading || !url.trim()}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching...</>
                ) : (
                  <><Camera className="w-4 h-4 mr-2" />Fetch Screenshots</>
                )}
              </Button>
              {isLoading && (
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  <Ban className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              {url && !isLoading && (
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
                  Apply Screenshot Fetch
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
                   disabled={!scrapedData.screenshots?.[key]}
                     className="gap-1"
                   >
                     <Icon className="w-4 h-4" />
                      {label}
                    {scrapedData.screenshots?.[key] && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-green-500" title="Screenshot fetched" />
                    )}
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
               onReset={() => setCropSettings(prev => ({ ...DEFAULT_CROP_SETTINGS }))}
               onApplyCrop={refreshPreview}
             />
 
             {/* Per-viewport crop status */}
             <div className="flex flex-wrap gap-2 text-xs">
               {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((vp) => {
                 const hasScreenshot = !!scrapedData.screenshots?.[vp];
                 const settings = viewportCropSettings[vp];
                 const isModified = settings.headerHeight !== 180 || settings.headerOffsetY !== 0 ||
                                    settings.footerHeight !== 180 || settings.footerOffsetY !== 0;
                 return (
                   <div 
                     key={vp}
                     className={`px-2 py-1 rounded border ${
                       vp === selectedViewport 
                         ? 'border-primary bg-primary/10' 
                         : 'border-border bg-muted/50'
                     } ${!hasScreenshot ? 'opacity-50' : ''}`}
                   >
                     <span className="capitalize">{vp}</span>
                     {hasScreenshot && isModified && (
                       <span className="ml-1 text-primary">✓</span>
                     )}
                   </div>
                 );
               })}
             </div>
 
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
               <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                 <iframe
                  key={previewKey}
                   srcDoc={generateScreenshotPreviewHtml(
                     getScreenshotSrc(selectedScreenshot),
                    demo.formStyle || DEFAULT_FORM_STYLE,
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
                            color: getReadableTextColor(scrapedData.formStyles.inputTextColor, scrapedData.formStyles.inputBgColor),
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
                            color: getReadableTextColor(scrapedData.formStyles.inputTextColor, scrapedData.formStyles.inputBgColor),
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
                  <span className="font-medium">Currently Applied Screenshot Fetch</span>
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
               <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
                 <iframe
                   key={savedPreviewKey}
                   srcDoc={(() => {
                     const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
                    return generatePreviewDocument({
                      formStyle,
                      buttonColor: demo.buttonColor || '#3b82f6',
                      headerHtml: demo.mirrorScreenshotHeaderHtml || '<div style="padding: 20px; background: #f0f0f0; text-align: center; color: #666;">No header screenshot fetched</div>',
                      footerHtml: demo.mirrorScreenshotFooterHtml || '<div style="padding: 20px; background: #f0f0f0; text-align: center; color: #666;">No footer screenshot fetched</div>',
                    });
                    })()}
                    className="w-full h-[350px] border-0"
                    title="Saved screenshot fetch preview"
                   sandbox="allow-same-origin"
                 />
               </div>
             </div>
 
             {/* Content Stats */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Header:</span>
                  <span>{demo.mirrorScreenshotHeaderHtml ? 'Fetched' : 'None'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Footer:</span>
                  <span>{demo.mirrorScreenshotFooterHtml ? 'Fetched' : 'None'}</span>
                </div>
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }