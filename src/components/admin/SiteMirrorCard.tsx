import { useState, useCallback } from "react";
import { Globe, X, Eye, Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SiteMirrorTabs, CaptureTab, CaptureMode } from "./SiteMirrorTabs";
import { HtmlCaptureTab } from "./HtmlCaptureTab";
import { ScreenshotCaptureTab } from "./ScreenshotCaptureTab";
import { EmbedFormSection } from "./EmbedFormSection";
import { HeaderElementPicker } from "./HeaderElementPicker";
import { HeaderHotspotPicker } from "./HeaderHotspotPicker";
import { ContentLayoutEditor } from "./ContentLayoutEditor";
import { ScrapedBranding } from "@/lib/api/scraping";
import { useToast } from "@/hooks/use-toast";
import { DemoEnvironment } from "@/types/demo";
import { DemoUseCaseLink } from "@/types/useCase";
import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
import { generatePreviewDocument } from "@/lib/formStyleUtils";
import { enhanceHeaderPreviewIframe } from "@/lib/iframeContrast";
import { cn } from "@/lib/utils";

type PreviewViewport = 'desktop' | 'tablet' | 'phone';

const viewportConfig: Record<PreviewViewport, { width: string; iframeWidth: number | null; label: string; icon: React.ElementType }> = {
  desktop: { width: '100%', iframeWidth: 1280, label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', iframeWidth: null, label: 'Tablet', icon: Tablet },
  phone: { width: '390px', iframeWidth: null, label: 'Phone', icon: Smartphone },
};

export type { CaptureMode } from "./SiteMirrorTabs";
 
interface SiteMirrorCardProps {
  demo: DemoEnvironment;
  useCaseLinks: DemoUseCaseLink[];
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
  formStyleContent?: React.ReactNode;
}
 
 export function SiteMirrorCard({ demo, useCaseLinks, onApplyBranding, formStyleContent }: SiteMirrorCardProps) {
   const { toast } = useToast();
    const [url, setUrl] = useState(demo.customerSiteUrl || "");
    const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
    
   // Track which method is active for the demo (persisted) AND which tab user is viewing
   const [activeMethod, setActiveMethod] = useState<CaptureMode>(demo.mirrorActiveMethod || 'html');
   const [currentTab, setCurrentTab] = useState<CaptureTab>('html');
   
   // Determine if each method is configured based on content type
  const htmlConfigured = Boolean(demo.mirrorHtmlHeaderHtml && demo.mirrorHtmlHeaderHtml.trim().length > 0);
  const screenshotConfigured = Boolean(demo.mirrorScreenshotHeaderHtml && demo.mirrorScreenshotHeaderHtml.trim().length > 0);
   const formStylingConfigured = Boolean(demo.formStyle && demo.formStyle.source !== 'template');

  const handleActiveMethodChange = (method: CaptureMode) => {
    setActiveMethod(method);
    // Persist the active method to the database
    onApplyBranding({ mirrorActiveMethod: method }, true);
  };
 
   const handleClearMirror = () => {
     const updates: Partial<DemoEnvironment> = {
       scrapedHeaderHtml: '',
       scrapedFooterHtml: '',
       scrapedCss: '',
      mirrorHtmlHeaderHtml: '',
      mirrorHtmlFooterHtml: '',
      mirrorHtmlCss: '',
      mirrorScreenshotHeaderHtml: '',
      mirrorScreenshotFooterHtml: '',
      mirrorScreenshotCss: '',
       ...(demo.formStyle?.source === 'mirrored' && { formStyle: { ...DEFAULT_FORM_STYLE, source: 'template' } }),
     };
     onApplyBranding(updates, true);
     toast({ title: "Mirror Cleared", description: "Scraped branding has been cleared." });
   };
 
   const handleApplyBranding = (updates: Partial<DemoEnvironment>) => {
     onApplyBranding(updates, true);
   };

   // Unified fetch: when HTML capture completes, also populate screenshot + branding data
   const handleUnifiedFetchComplete = useCallback((data: ScrapedBranding) => {
     const updates: Partial<DemoEnvironment> = {
       customerSiteUrl: url,
     };

     // Populate screenshot data if we got screenshots
     if (data.screenshot || data.screenshots?.desktop) {
       const desktopScreenshot = data.screenshots?.desktop || data.screenshot;
       if (desktopScreenshot) {
         // Build screenshot-based header/footer HTML (image-based)
         const screenshotSrc = desktopScreenshot.startsWith('data:') || desktopScreenshot.startsWith('http')
           ? desktopScreenshot
           : `data:image/png;base64,${desktopScreenshot}`;
         updates.mirrorScreenshotHeaderHtml = `<div style="width:100%;overflow:hidden;"><img src="${screenshotSrc}" style="width:100%;height:auto;display:block;object-fit:cover;object-position:top;max-height:200px;" alt="Site header" /></div>`;
         updates.mirrorScreenshotCss = '';
       }
     }

     // Populate branding colors
     if (data.colors) {
       updates.headerBgColor = data.colors.headerBgColor;
       updates.headerTextColor = data.colors.headerTextColor;
       updates.buttonColor = data.colors.buttonColor;
     }

     // Logo
     if (data.logoUrl) {
       updates.logoUrl = data.logoUrl;
     }

     onApplyBranding(updates, true);
     toast({
       title: "Unified Fetch Complete",
       description: "HTML capture, screenshot, and branding data have all been populated.",
     });
   }, [url, onApplyBranding, toast]);

   // Generate live site preview content
   const getSitePreviewContent = () => {
     const hasHtmlContent = htmlConfigured;
     const hasScreenshotContent = screenshotConfigured;
     const hasAnyContent = hasHtmlContent || hasScreenshotContent;

     // Determine which content to show based on active method
     const showingMethod = activeMethod;
     const headerHtml = showingMethod === 'html' ? demo.mirrorHtmlHeaderHtml : demo.mirrorScreenshotHeaderHtml;
     const footerHtml = showingMethod === 'html' ? demo.mirrorHtmlFooterHtml : demo.mirrorScreenshotFooterHtml;
     const cssContent = showingMethod === 'html' ? demo.mirrorHtmlCss : demo.mirrorScreenshotCss;
     const hasContentForMethod = showingMethod === 'html' ? hasHtmlContent : hasScreenshotContent;

      const vpConfig = viewportConfig[previewViewport];

      return (
        <Card className="glass-card border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-5 h-5" />
                  Live Site Preview
                  {hasAnyContent && (
                    <Badge variant="default" className="ml-2">
                      {showingMethod === 'html' ? 'HTML/CSS' : 'Screenshot'}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {hasContentForMethod
                    ? `Showing the ${showingMethod === 'html' ? 'HTML/CSS fetched' : 'screenshot-based'} header and footer surrounding a sample form`
                    : 'Configure a fetch method below to see a preview of your site branding'
                  }
                </p>
              </div>
              {/* Viewport Size Selector */}
              {hasContentForMethod && (
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
                  {(Object.entries(viewportConfig) as [PreviewViewport, typeof vpConfig][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <Button
                        key={key}
                        variant={previewViewport === key ? "default" : "ghost"}
                        size="sm"
                        className={cn("h-8 px-2.5 gap-1.5", previewViewport === key && "shadow-sm")}
                        onClick={() => setPreviewViewport(key)}
                        title={cfg.label}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs hidden sm:inline">{cfg.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasContentForMethod ? (
              <ScrollArea className="w-full rounded-lg border bg-muted/30">
                <div
                  className={cn(
                    "p-4",
                    previewViewport === 'desktop' ? "min-w-[1280px]" : "flex justify-center"
                  )}
                >
                  <div
                    className="overflow-hidden rounded-lg border bg-background shadow-sm"
                    style={{ width: previewViewport === 'desktop' ? '1280px' : vpConfig.width }}
                  >
                    {headerHtml && (
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1">
                              <style>
                                html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
                                * { box-sizing: border-box; }
                                a { pointer-events: none; }
                              </style>
                              ${cssContent ? `<style>${cssContent}</style>` : ''}
                            </head>
                            <body>
                              ${headerHtml}
                            </body>
                          </html>
                        `}
                        className="block w-full border-0"
                        style={{ height: '120px' }}
                        title="Live site header preview"
                        sandbox="allow-same-origin"
                        onLoad={(e) => {
                          enhanceHeaderPreviewIframe(e.currentTarget, 80);
                        }}
                      />
                    )}

                    <iframe
                      srcDoc={generatePreviewDocument({
                        formStyle: demo.formStyle || DEFAULT_FORM_STYLE,
                        buttonColor: demo.buttonColor || '#3b82f6',
                        headerHtml: '',
                        footerHtml: '',
                        contentBgColor: demo.formStyle?.contentAreaBgColor,
                      })}
                      className="block w-full border-0"
                      style={{ height: '720px' }}
                      title="Live form preview"
                      sandbox="allow-same-origin"
                      onLoad={(e) => {
                        const iframe = e.target as HTMLIFrameElement;
                        try {
                          const body = iframe.contentDocument?.body;
                          const height = body?.scrollHeight || 720;
                          iframe.style.height = `${Math.max(height, 520)}px`;
                        } catch {
                          iframe.style.height = '720px';
                        }
                      }}
                    />

                    {footerHtml && (
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1">
                              <style>
                                html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
                                * { box-sizing: border-box; }
                                a { pointer-events: none; }
                              </style>
                              ${cssContent ? `<style>${cssContent}</style>` : ''}
                            </head>
                            <body>
                              ${footerHtml}
                            </body>
                          </html>
                        `}
                        className="block w-full border-0"
                        style={{ height: '160px' }}
                        title="Live site footer preview"
                        sandbox="allow-same-origin"
                        onLoad={(e) => {
                          const iframe = e.target as HTMLIFrameElement;
                          try {
                            const body = iframe.contentDocument?.body;
                            const firstChild = body?.firstElementChild as HTMLElement | null;
                            const height = firstChild?.offsetHeight || body?.scrollHeight || 160;
                            iframe.style.height = `${Math.max(height, 100)}px`;
                          } catch {
                            iframe.style.height = '160px';
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
                {previewViewport === 'desktop' && <ScrollBar orientation="horizontal" />}
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-dashed">
                <div className="text-center text-muted-foreground">
                  <Globe className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No site branding configured</p>
                  <p className="text-xs mt-1">Use the HTML/CSS or Screenshot fetch below to capture your site's header and footer</p>
                </div>
              </div>
            )}

           {/* Method & Content Stats */}
           {hasAnyContent && (
             <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
               <div className="flex flex-wrap gap-4 text-xs">
                 <div className="flex items-center gap-2">
                   <span className="font-medium">Active Method:</span>
                   <Badge variant="outline">{showingMethod === 'html' ? 'HTML/CSS' : 'Screenshot'}</Badge>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-muted-foreground">Header:</span>
                   <span>{headerHtml ? `${headerHtml.length} chars` : 'None'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-muted-foreground">Footer:</span>
                   <span>{footerHtml ? `${footerHtml.length} chars` : 'None'}</span>
                 </div>
                 {cssContent && (
                   <div className="flex items-center gap-2">
                     <span className="text-muted-foreground">CSS:</span>
                     <span>{cssContent.length} chars</span>
                   </div>
                 )}
               </div>
             </div>
            )}
            {/* Content Area Layout Controls */}
            {hasAnyContent && (
              <div className="mt-4">
                <ContentLayoutEditor
                  demo={demo}
                  headerHtml={headerHtml}
                  footerHtml={footerHtml}
                  cssContent={cssContent || ''}
                  onApplyBranding={onApplyBranding}
                />
              </div>
            )}
            {/* Header CTA Element Picker — hotspot for screenshots, CSS picker for HTML */}
            {hasAnyContent && headerHtml && (
              <div className="mt-4">
                {activeMethod === 'screenshot' ? (
                  <HeaderHotspotPicker
                    demoId={demo.id}
                    headerHtml={headerHtml}
                    useCaseLinks={useCaseLinks}
                  />
                ) : (
                  <HeaderElementPicker
                    demoId={demo.id}
                    headerHtml={headerHtml}
                    cssContent={cssContent || undefined}
                    useCaseLinks={useCaseLinks}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    };
 
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
               <CardTitle className="flex items-center gap-2">
                   <Globe className="w-5 h-5" />
                   Appearance
                 </CardTitle>
                 <CardDescription>
                   Configure site branding and form styling
                 </CardDescription>
              </div>
              {(htmlConfigured || screenshotConfigured) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearMirror}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <SiteMirrorTabs
              activeMethod={activeMethod}
             onActiveMethodChange={handleActiveMethodChange}
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              htmlConfigured={htmlConfigured}
              screenshotConfigured={screenshotConfigured}
              sitePreviewContent={getSitePreviewContent()}
              htmlContent={
                <HtmlCaptureTab
                  demo={demo}
                  url={url}
                  onUrlChange={setUrl}
                  onApply={handleApplyBranding}
                  isConfigured={htmlConfigured}
                  onUnifiedFetchComplete={handleUnifiedFetchComplete}
                />
              }
              screenshotContent={
                <ScreenshotCaptureTab
                  demo={demo}
                  url={url}
                  onUrlChange={setUrl}
                  onApply={handleApplyBranding}
                  isConfigured={screenshotConfigured}
                />
              }
               formStylingContent={formStyleContent}
               formStylingConfigured={formStylingConfigured}
               embedFormContent={<EmbedFormSection slug={demo.slug} />}
             />
           </CardContent>
         </Card>
       </div>
     );
   }