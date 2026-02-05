 import { useState } from "react";
 import { Globe, Loader2, ExternalLink, X, Eye, Paintbrush, Check } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent } from "@/components/ui/card";
 import { scrapingApi, ScrapedBranding, FormElementStyles } from "@/lib/api/scraping";
 import { useToast } from "@/hooks/use-toast";
 import { DemoEnvironment } from "@/types/demo";
 import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
 
 interface HtmlCaptureTabProps {
   demo: DemoEnvironment;
   url: string;
   onUrlChange: (url: string) => void;
   onApply: (updates: Partial<DemoEnvironment>) => void;
   isConfigured: boolean;
 }
 
 // Helper to generate preview HTML
 function generateHtmlPreviewHtml(
   scrapedData: ScrapedBranding,
   formStyles: FormElementStyles | undefined,
   buttonColor: string
 ): string {
   const fontFamily = formStyles?.inputFontFamily || 'system-ui, sans-serif';
   const labelColor = formStyles?.labelColor || '#333333';
   const inputBgColor = formStyles?.inputBgColor || '#ffffff';
   const inputTextColor = formStyles?.inputTextColor || '#1f2937';
   const inputBorderColor = formStyles?.inputBorderColor || '#d1d5db';
   const inputBorderRadius = formStyles?.inputBorderRadius || '8px';
   const inputBorderWidth = formStyles?.inputBorderWidth || '1px';
   
   const fieldsHtml = `
     <div style="margin-bottom: 16px;">
       <label style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor}; font-family: ${fontFamily};">
         First Name<span style="color: #ef4444; margin-left: 4px;">*</span>
       </label>
       <input type="text" placeholder="John" style="
         width: 100%; padding: 10px 14px; border: ${inputBorderWidth} solid ${inputBorderColor};
         border-radius: ${inputBorderRadius}; background: ${inputBgColor}; color: ${inputTextColor};
         font-family: ${fontFamily}; box-sizing: border-box;
       " />
     </div>
     <div style="margin-bottom: 16px;">
       <label style="display: block; margin-bottom: 6px; font-weight: 500; color: ${labelColor}; font-family: ${fontFamily};">
         Email<span style="color: #ef4444; margin-left: 4px;">*</span>
       </label>
       <input type="email" placeholder="john@example.com" style="
         width: 100%; padding: 10px 14px; border: ${inputBorderWidth} solid ${inputBorderColor};
         border-radius: ${inputBorderRadius}; background: ${inputBgColor}; color: ${inputTextColor};
         font-family: ${fontFamily}; box-sizing: border-box;
       " />
     </div>
   `;
 
   return `
     <!DOCTYPE html>
     <html>
       <head>
         <meta charset="utf-8">
         <style>
           body { margin: 0; padding: 0; font-family: ${fontFamily}; }
           * { box-sizing: border-box; }
         </style>
         ${scrapedData.cssContent ? `<style>${scrapedData.cssContent}</style>` : ''}
       </head>
       <body>
         ${scrapedData.headerHtml || ''}
         <div style="padding: 40px 20px; background: #f5f5f5; min-height: 200px;">
           <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e5e7eb;">
             <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: ${labelColor}; font-family: ${fontFamily}; text-align: center;">Application Form</h2>
             ${fieldsHtml}
             <button style="width: 100%; padding: 12px 24px; background: ${buttonColor}; color: white; border: none; border-radius: ${inputBorderRadius}; font-size: 16px; font-weight: 500; cursor: pointer;">Continue</button>
           </div>
         </div>
         ${scrapedData.footerHtml || ''}
       </body>
     </html>
   `;
 }
 
 // Convert FormElementStyles to FormStyleConfig
 function formElementStylesToConfig(styles: FormElementStyles): FormStyleConfig {
   const config: FormStyleConfig = {
     ...DEFAULT_FORM_STYLE,
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
     if (radius === '0' || radius === '0px') config.borderRadius = 'none';
     else if (radius.includes('999')) config.borderRadius = 'full';
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
 
   if (styles.errorColor) config.errorColor = styles.errorColor;
 
   return config;
 }
 
 export function HtmlCaptureTab({ demo, url, onUrlChange, onApply, isConfigured }: HtmlCaptureTabProps) {
   const { toast } = useToast();
   const [isLoading, setIsLoading] = useState(false);
   const [scrapedData, setScrapedData] = useState<ScrapedBranding | null>(null);
 
   const handleFetch = async () => {
     if (!url.trim()) {
       toast({ title: "URL Required", description: "Please enter a website URL", variant: "destructive" });
       return;
     }
 
     setIsLoading(true);
     try {
       const response = await scrapingApi.scrapeSiteBranding(url);
       if (response.success && response.data) {
         setScrapedData(response.data);
         toast({ title: "Site Fetched", description: "HTML and CSS extracted successfully" });
       } else {
         toast({ title: "Fetch Failed", description: response.error || "Could not extract content", variant: "destructive" });
       }
     } catch (error) {
       console.error("Error fetching:", error);
       toast({ title: "Error", description: "Failed to fetch site. Check Firecrawl connector.", variant: "destructive" });
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleApply = () => {
     if (!scrapedData) return;
 
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
      // Store in dedicated HTML capture fields (won't overwrite screenshot capture)
      mirrorHtmlHeaderHtml: scrapedData.headerHtml,
      mirrorHtmlFooterHtml: scrapedData.footerHtml,
      mirrorHtmlCss: scrapedData.cssContent,
       ...(formStyleConfig && { formStyle: formStyleConfig }),
     };
 
     onApply(updates);
     toast({ title: "HTML Capture Applied", description: "Header, footer, and CSS have been saved" });
   };
 
   return (
     <div className="space-y-4">
       <Card>
         <CardContent className="pt-4 space-y-4">
           <p className="text-sm text-muted-foreground">
             Extracts the actual HTML header and footer elements along with CSS styles. 
             Elements are interactive but links are disabled for security.
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
                 <><Globe className="w-4 h-4 mr-2" />Fetch HTML/CSS</>
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
 
       {/* Scraped Data Preview */}
       {scrapedData && (
         <Card>
           <CardContent className="pt-4 space-y-4">
             <div className="flex items-center justify-between">
               <Label className="text-base font-semibold flex items-center gap-2">
                 <Eye className="w-4 h-4" />
                 Preview Extracted Content
               </Label>
               <Button onClick={handleApply} size="sm" className="gradient-primary">
                 <Check className="w-4 h-4 mr-2" />
                 Apply HTML Capture
               </Button>
             </div>
             
             <div className="border rounded-lg overflow-hidden bg-background">
               <iframe
                 srcDoc={generateHtmlPreviewHtml(scrapedData, scrapedData.formStyles, scrapedData.colors.buttonColor)}
                 className="w-full h-[400px] border-0"
                 title="HTML capture preview"
                 sandbox="allow-same-origin"
               />
             </div>
 
             {/* Colors Preview */}
             <div className="space-y-2">
               <Label>Extracted Colors</Label>
               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1">
                   <div className="h-10 rounded-lg border" style={{ backgroundColor: scrapedData.colors.headerBgColor }} />
                   <p className="text-xs text-muted-foreground text-center">Header BG</p>
                 </div>
                 <div className="space-y-1">
                   <div className="h-10 rounded-lg border flex items-center justify-center text-sm font-bold"
                     style={{ backgroundColor: scrapedData.colors.headerBgColor, color: scrapedData.colors.headerTextColor }}>
                     Aa
                   </div>
                   <p className="text-xs text-muted-foreground text-center">Text</p>
                 </div>
                 <div className="space-y-1">
                   <div className="h-10 rounded-lg border" style={{ backgroundColor: scrapedData.colors.buttonColor }} />
                   <p className="text-xs text-muted-foreground text-center">Button</p>
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
 
             {/* HTML/CSS Code Preview */}
             {scrapedData.headerHtml && (
               <div className="space-y-2">
                 <Label>Header HTML ({scrapedData.headerHtml.length} chars)</Label>
                 <div className="bg-muted/50 rounded-lg p-2 max-h-24 overflow-y-auto">
                   <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                     {scrapedData.headerHtml.substring(0, 300)}...
                   </pre>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
       )}
 
       {/* Current Applied State */}
       {isConfigured && !scrapedData && (
         <Card className="border-green-500/30 bg-green-500/5">
           <CardContent className="pt-4">
             <div className="flex items-center gap-2 text-green-600">
               <Check className="w-4 h-4" />
               <span className="font-medium">HTML capture is configured</span>
             </div>
             <p className="text-sm text-muted-foreground mt-1">
               Header and footer HTML from {demo.customerSiteUrl} is applied.
             </p>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }