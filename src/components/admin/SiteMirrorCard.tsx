import { useState } from "react";
import { Globe, X, Eye, Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SiteMirrorTabs, CaptureTab, CaptureMode } from "./SiteMirrorTabs";
import { HtmlCaptureTab } from "./HtmlCaptureTab";
import { ScreenshotCaptureTab } from "./ScreenshotCaptureTab";
import { EmbedFormSection } from "./EmbedFormSection";
import { HeaderElementPicker } from "./HeaderElementPicker";
import { useToast } from "@/hooks/use-toast";
import { DemoEnvironment } from "@/types/demo";
import { DemoUseCaseLink } from "@/types/useCase";
import { DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { generatePreviewDocument } from "@/lib/formStyleUtils";
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
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
  formStyleContent?: React.ReactNode;
}
 
 export function SiteMirrorCard({ demo, onApplyBranding, formStyleContent }: SiteMirrorCardProps) {
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
                    "transition-all duration-300",
                    previewViewport === 'desktop' ? "w-full" : "flex justify-center p-4"
                  )}
                  style={previewViewport !== 'desktop' ? { minWidth: vpConfig.width } : undefined}
                >
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      previewViewport !== 'desktop' && "border rounded-lg shadow-sm"
                    )}
                    style={{ 
                      ...(previewViewport !== 'desktop' ? { width: vpConfig.width } : undefined),
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {previewViewport === 'desktop' ? (
                      <div className="w-full overflow-hidden" style={{ height: '500px' }}>
                        <iframe
                          srcDoc={generatePreviewDocument({
                            formStyle: demo.formStyle || DEFAULT_FORM_STYLE,
                            buttonColor: demo.buttonColor || '#3b82f6',
                            headerHtml: headerHtml || '',
                            footerHtml: footerHtml || '',
                            cssContent: cssContent || undefined,
                          })}
                          className="border-0 origin-top-left"
                          style={{
                            width: '1280px',
                            height: '625px',
                            transform: 'scale(var(--preview-scale))',
                          }}
                          title="Live site preview"
                          sandbox="allow-same-origin"
                          ref={(el) => {
                            if (el) {
                              const container = el.parentElement;
                              if (container) {
                                const scale = container.clientWidth / 1280;
                                el.style.setProperty('--preview-scale', String(scale));
                                const observer = new ResizeObserver(() => {
                                  const s = container.clientWidth / 1280;
                                  el.style.setProperty('--preview-scale', String(s));
                                  container.style.height = `${625 * s}px`;
                                });
                                observer.observe(container);
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <iframe
                        srcDoc={generatePreviewDocument({
                          formStyle: demo.formStyle || DEFAULT_FORM_STYLE,
                          buttonColor: demo.buttonColor || '#3b82f6',
                          headerHtml: headerHtml || '',
                          footerHtml: footerHtml || '',
                          cssContent: cssContent || undefined,
                        })}
                        className="w-full h-[500px] border-0"
                        title="Live site preview"
                        sandbox="allow-same-origin"
                      />
                    )}
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
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

            {/* Header CTA Element Picker */}
            {hasAnyContent && headerHtml && (
              <div className="mt-4">
                <HeaderElementPicker
                  headerHtml={headerHtml}
                  cssContent={cssContent || undefined}
                  currentSelector={demo.headerCtaSelector}
                  onSelectorChange={(selector) => {
                    onApplyBranding({ headerCtaSelector: selector || '' }, true);
                  }}
                />
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