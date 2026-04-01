import { useState, useRef, useCallback } from "react";
import { Globe, Loader2, ExternalLink, X, Eye, Paintbrush, Check, Ban, Code, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { scrapingApi, ScrapedBranding, FormElementStyles } from "@/lib/api/scraping";
 import { useToast } from "@/hooks/use-toast";
 import { DemoEnvironment } from "@/types/demo";
 import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
 import { generateFormHtml, generatePreviewDocument, formElementStylesToConfig, getReadableTextColor } from "@/lib/formStyleUtils";
 
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
   formStyle: FormStyleConfig,
   buttonColor: string
 ): string {
   const formHtml = generateFormHtml(formStyle, buttonColor);
 
   return `
     <!DOCTYPE html>
     <html>
       <head>
         <meta charset="utf-8">
         <style>
           body { margin: 0; padding: 0; font-family: ${formStyle.fontFamily}; }
           * { box-sizing: border-box; }
         </style>
         ${scrapedData.cssContent ? `<style>${scrapedData.cssContent}</style>` : ''}
       </head>
       <body>
         ${scrapedData.headerHtml || ''}
         <div style="padding: 40px 20px; background: #f5f5f5; min-height: 200px;">
           ${formHtml}
         </div>
         ${scrapedData.footerHtml || ''}
       </body>
     </html>
   `;
 }
 
 // Convert FormElementStyles to FormStyleConfig
 // formElementStylesToConfig is now imported from @/lib/formStyleUtils
 
export function HtmlCaptureTab({ demo, url, onUrlChange, onApply, isConfigured }: HtmlCaptureTabProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [scrapedData, setScrapedData] = useState<ScrapedBranding | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Editable HTML/CSS state (for fresh fetch)
    const [editedHeaderHtml, setEditedHeaderHtml] = useState<string>('');
    const [editedFooterHtml, setEditedFooterHtml] = useState<string>('');
    const [editedCss, setEditedCss] = useState<string>('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [hasEdits, setHasEdits] = useState(false);

    // Editable HTML/CSS state (for saved/applied content)
    const [savedHeaderHtml, setSavedHeaderHtml] = useState<string>(demo.mirrorHtmlHeaderHtml || '');
    const [savedFooterHtml, setSavedFooterHtml] = useState<string>(demo.mirrorHtmlFooterHtml || '');
    const [savedCss, setSavedCss] = useState<string>(demo.mirrorHtmlCss || '');
    const [savedEditorOpen, setSavedEditorOpen] = useState(false);
    const [hasSavedEdits, setHasSavedEdits] = useState(false);

    const handleSavedHeaderEdit = useCallback((val: string) => { setSavedHeaderHtml(val); setHasSavedEdits(true); }, []);
    const handleSavedFooterEdit = useCallback((val: string) => { setSavedFooterHtml(val); setHasSavedEdits(true); }, []);
    const handleSavedCssEdit = useCallback((val: string) => { setSavedCss(val); setHasSavedEdits(true); }, []);

    const resetSavedEdits = useCallback(() => {
      setSavedHeaderHtml(demo.mirrorHtmlHeaderHtml || '');
      setSavedFooterHtml(demo.mirrorHtmlFooterHtml || '');
      setSavedCss(demo.mirrorHtmlCss || '');
      setHasSavedEdits(false);
    }, [demo.mirrorHtmlHeaderHtml, demo.mirrorHtmlFooterHtml, demo.mirrorHtmlCss]);

    const handleSaveEdits = useCallback(() => {
      onApply({
        mirrorHtmlHeaderHtml: savedHeaderHtml,
        mirrorHtmlFooterHtml: savedFooterHtml,
        mirrorHtmlCss: savedCss,
      });
      setHasSavedEdits(false);
      toast({ title: "Changes Saved", description: "Header, footer, and CSS updates have been saved." });
    }, [savedHeaderHtml, savedFooterHtml, savedCss, onApply, toast]);
    // Track edits
    const handleHeaderEdit = useCallback((val: string) => {
      setEditedHeaderHtml(val);
      setHasEdits(true);
    }, []);
    const handleFooterEdit = useCallback((val: string) => {
      setEditedFooterHtml(val);
      setHasEdits(true);
    }, []);
    const handleCssEdit = useCallback((val: string) => {
      setEditedCss(val);
      setHasEdits(true);
    }, []);

    const resetEdits = useCallback(() => {
      if (!scrapedData) return;
      setEditedHeaderHtml(scrapedData.headerHtml || '');
      setEditedFooterHtml(scrapedData.footerHtml || '');
      setEditedCss(scrapedData.cssContent || '');
      setHasEdits(false);
    }, [scrapedData]);

    // Build a preview using the edited values
    const getPreviewHtml = useCallback(() => {
      if (!scrapedData) return '';
      const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
      const buttonColor = scrapedData.colors.buttonColor;
      const formHtml = generateFormHtml(formStyle, buttonColor);
      return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{margin:0;padding:0;font-family:${formStyle.fontFamily};}*{box-sizing:border-box;}</style>
        ${editedCss ? `<style>${editedCss}</style>` : ''}
        </head><body>
        ${editedHeaderHtml || ''}
        <div style="padding:40px 20px;background:#f5f5f5;min-height:200px;">${formHtml}</div>
        ${editedFooterHtml || ''}
        </body></html>`;
    }, [scrapedData, editedHeaderHtml, editedFooterHtml, editedCss, demo.formStyle]);

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
          const d = response.data;
          const hasHeader = !!(d.headerHtml && d.headerHtml.trim().length > 0);
          const hasFooter = !!(d.footerHtml && d.footerHtml.trim().length > 0);
          const hasCss = !!(d.cssContent && d.cssContent.trim().length > 0);

          if (!hasHeader && !hasFooter && !hasCss) {
            // Got a response but nothing useful was extracted
            setScrapedData(null);
            toast({
              title: "No Content Extracted",
              description: "The site was reached but no header, footer, or CSS could be extracted. The site may use JavaScript rendering, block automated access, or lack semantic HTML elements.",
              variant: "destructive",
            });
          } else {
            setScrapedData(d);
            // Populate editors
            setEditedHeaderHtml(d.headerHtml || '');
            setEditedFooterHtml(d.footerHtml || '');
            setEditedCss(d.cssContent || '');
            setHasEdits(false);
            const parts: string[] = [];
            if (hasHeader) parts.push("header");
            if (hasFooter) parts.push("footer");
            if (hasCss) parts.push("CSS");
            const missing: string[] = [];
            if (!hasHeader) missing.push("header");
            if (!hasFooter) missing.push("footer");

            if (missing.length > 0) {
              toast({
                title: "Partial Extraction",
                description: `Extracted ${parts.join(", ")} but could not find: ${missing.join(", ")}. The site may lack semantic <header>/<footer> tags.`,
              });
            } else {
              toast({ title: "Site Fetched", description: `Header, footer, and CSS extracted successfully (${(d.cssContent?.length || 0).toLocaleString()} chars of CSS)` });
            }
          }
        } else {
          const errMsg = response.error || "Could not extract content";
          const isBlocked = errMsg.toLowerCase().includes('403') || errMsg.toLowerCase().includes('blocked') || errMsg.toLowerCase().includes('forbidden');
          const isTimeout = errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('timed out');
          let description = errMsg;
          if (isBlocked) {
            description = `The site blocked the fetch request (403 Forbidden). Try the Screenshot method instead, or check if the URL is correct.`;
          } else if (isTimeout) {
            description = `The request timed out. The site may be slow or blocking automated access. Try again or use the Screenshot method.`;
          }
          toast({ title: "Fetch Failed", description, variant: "destructive" });
        }
      } catch (error: any) {
        if (controller.signal.aborted) return;
        console.error("Error fetching:", error);
        const msg = error?.message || '';
        const isCors = msg.includes('CORS') || msg.includes('NetworkError') || msg.includes('Failed to fetch');
        toast({
          title: "Connection Error",
          description: isCors
            ? "Could not reach the site — the connection may have been blocked by the site's security settings. Try the Screenshot method instead."
            : `Failed to fetch site: ${msg || 'Unknown error'}. Ensure the Firecrawl connector is configured.`,
          variant: "destructive",
        });
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
 
    const isFormStyleDefault = !demo.formStyle || demo.formStyle.source === 'default' || demo.formStyle.source === 'template';

    const handleApplySiteLayout = () => {
      if (!scrapedData) return;

       const updates: Partial<DemoEnvironment> = {
         customerSiteUrl: url,
        mirrorHtmlHeaderHtml: editedHeaderHtml,
        mirrorHtmlFooterHtml: editedFooterHtml,
        mirrorHtmlCss: editedCss,
       };

       // Auto-apply form styling if form hasn't been customized and we have extracted styles
       if (isFormStyleDefault && scrapedData.formStyles) {
         const formStyle = formElementStylesToConfig(scrapedData.formStyles);
         updates.formStyle = formStyle;
         updates.buttonColor = scrapedData.colors.buttonColor;
         onApply(updates);
         toast({ title: "Site Layout & Form Styling Applied", description: "Header, footer, CSS, and form styling have been saved. Form styling was auto-applied since it hadn't been customized." });
       } else {
         onApply(updates);
         toast({ title: "Site Layout Applied", description: hasEdits ? "Edited header, footer, and CSS have been saved" : "Header, footer, and CSS have been saved" });
       }
    };

    const handleApplyFormStyling = () => {
      if (!scrapedData?.formStyles) return;

      const formStyle = formElementStylesToConfig(scrapedData.formStyles);
      const updates: Partial<DemoEnvironment> = {
        formStyle,
        buttonColor: scrapedData.colors.buttonColor,
      };

      onApply(updates);
      toast({ title: "Form Styling Applied", description: "Form input styles, colors, and button styling from the captured site have been applied" });
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
 
       {/* Scraped Data Preview */}
       {scrapedData && (
         <Card>
           <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview Extracted Content
                </Label>
                <div className="flex items-center gap-2">
                  {scrapedData.formStyles && (
                    <Button onClick={handleApplyFormStyling} size="sm" variant="outline">
                      <Paintbrush className="w-4 h-4 mr-2" />
                      Apply Form Styling
                    </Button>
                  )}
                  <Button onClick={handleApplySiteLayout} size="sm" className="gradient-primary">
                    <Check className="w-4 h-4 mr-2" />
                    Apply Site Layout
                  </Button>
                </div>
               </div>

              {isFormStyleDefault && scrapedData.formStyles && (
                <p className="text-xs text-muted-foreground">💡 Form styling hasn't been customized — applying site layout will also apply the extracted form styling automatically.</p>
              )}
              {hasEdits && (
                <p className="text-xs text-amber-600 font-medium">⚠ You have unsaved edits — the preview reflects your changes.</p>
              )}

              <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
               <iframe
                  srcDoc={getPreviewHtml()}
                  className="w-full h-[400px] border-0"
                  title="HTML fetch preview"
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
 
             {/* HTML/CSS Editor */}
             <Collapsible open={editorOpen} onOpenChange={setEditorOpen}>
               <div className="flex items-center justify-between">
                 <CollapsibleTrigger asChild>
                   <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto font-semibold text-sm">
                     {editorOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                     <Code className="w-4 h-4" />
                     Edit HTML / CSS
                   </Button>
                 </CollapsibleTrigger>
                 {hasEdits && (
                   <Button variant="ghost" size="sm" onClick={resetEdits} className="text-xs gap-1">
                     <RotateCcw className="w-3 h-3" />
                     Reset
                   </Button>
                 )}
               </div>
               <CollapsibleContent className="space-y-3 pt-3">
                 <p className="text-xs text-muted-foreground">
                   Edit the extracted HTML and CSS below. Changes update the preview in real-time. Use this to remove unwanted elements (hero sections, spacers) or fix layout issues.
                 </p>
                 <div className="space-y-1">
                   <Label className="text-xs">Header HTML ({editedHeaderHtml.length.toLocaleString()} chars)</Label>
                   <Textarea
                     value={editedHeaderHtml}
                     onChange={(e) => handleHeaderEdit(e.target.value)}
                     className="font-mono text-xs min-h-[120px] max-h-[300px]"
                     placeholder="No header HTML extracted"
                   />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">Footer HTML ({editedFooterHtml.length.toLocaleString()} chars)</Label>
                   <Textarea
                     value={editedFooterHtml}
                     onChange={(e) => handleFooterEdit(e.target.value)}
                     className="font-mono text-xs min-h-[120px] max-h-[300px]"
                     placeholder="No footer HTML extracted"
                   />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs">CSS ({editedCss.length.toLocaleString()} chars)</Label>
                   <Textarea
                     value={editedCss}
                     onChange={(e) => handleCssEdit(e.target.value)}
                     className="font-mono text-xs min-h-[120px] max-h-[300px]"
                     placeholder="No CSS extracted"
                   />
                 </div>
               </CollapsibleContent>
             </Collapsible>
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
                   <span className="font-medium">Currently Applied HTML Fetch</span>
                 </div>
                 <span className="text-xs text-muted-foreground">
                   From: {demo.customerSiteUrl}
                 </span>
               </div>
  
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Eye className="w-4 h-4" />
                   Saved HTML Preview
                </Label>
                <div className="border rounded-lg overflow-hidden bg-background">
                  <iframe
                    srcDoc={(() => {
                      const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
                     return generatePreviewDocument({
                       formStyle,
                       buttonColor: demo.buttonColor || '#3b82f6',
                       headerHtml: (hasSavedEdits ? savedHeaderHtml : demo.mirrorHtmlHeaderHtml) || '<div style="padding: 20px; background: #f0f0f0; text-align: center; color: #666;">No header fetched</div>',
                       footerHtml: (hasSavedEdits ? savedFooterHtml : demo.mirrorHtmlFooterHtml) || '<div style="padding: 20px; background: #f0f0f0; text-align: center; color: #666;">No footer fetched</div>',
                       cssContent: (hasSavedEdits ? savedCss : demo.mirrorHtmlCss) || undefined,
                     });
                     })()}
                     className="w-full h-[350px] border-0"
                     title="Saved HTML fetch preview"
                     sandbox="allow-same-origin"
                  />
                </div>
              </div>

              {hasSavedEdits && (
                <p className="text-xs text-amber-600 font-medium">⚠ You have unsaved edits — the preview reflects your changes.</p>
              )}
  
              {/* Content Stats */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Header:</span>
                  <span>{(hasSavedEdits ? savedHeaderHtml : demo.mirrorHtmlHeaderHtml) ? `${(hasSavedEdits ? savedHeaderHtml : demo.mirrorHtmlHeaderHtml)!.length} chars` : 'None'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Footer:</span>
                  <span>{(hasSavedEdits ? savedFooterHtml : demo.mirrorHtmlFooterHtml) ? `${(hasSavedEdits ? savedFooterHtml : demo.mirrorHtmlFooterHtml)!.length} chars` : 'None'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">CSS:</span>
                  <span>{(hasSavedEdits ? savedCss : demo.mirrorHtmlCss) ? `${(hasSavedEdits ? savedCss : demo.mirrorHtmlCss)!.length} chars` : 'None'}</span>
                </div>
              </div>

              {/* HTML/CSS Editor for saved content */}
              <Collapsible open={savedEditorOpen} onOpenChange={setSavedEditorOpen}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto font-semibold text-sm">
                      {savedEditorOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Code className="w-4 h-4" />
                      Edit HTML / CSS
                    </Button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    {hasSavedEdits && (
                      <>
                        <Button variant="ghost" size="sm" onClick={resetSavedEdits} className="text-xs gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </Button>
                        <Button size="sm" onClick={handleSaveEdits} className="gradient-primary text-xs gap-1">
                          <Check className="w-3 h-3" />
                          Save Changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <CollapsibleContent className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Edit the saved HTML and CSS below. Changes update the preview in real-time. Click "Save Changes" to persist.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Header HTML ({savedHeaderHtml.length.toLocaleString()} chars)</Label>
                    <Textarea
                      value={savedHeaderHtml}
                      onChange={(e) => handleSavedHeaderEdit(e.target.value)}
                      className="font-mono text-xs min-h-[120px] max-h-[300px]"
                      placeholder="No header HTML"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Footer HTML ({savedFooterHtml.length.toLocaleString()} chars)</Label>
                    <Textarea
                      value={savedFooterHtml}
                      onChange={(e) => handleSavedFooterEdit(e.target.value)}
                      className="font-mono text-xs min-h-[120px] max-h-[300px]"
                      placeholder="No footer HTML"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CSS ({savedCss.length.toLocaleString()} chars)</Label>
                    <Textarea
                      value={savedCss}
                      onChange={(e) => handleSavedCssEdit(e.target.value)}
                      className="font-mono text-xs min-h-[120px] max-h-[300px]"
                      placeholder="No CSS"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }