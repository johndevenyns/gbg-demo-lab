import { useState, useCallback, useRef } from "react";
import { Globe, X, Eye, Monitor, Tablet, Smartphone, MousePointerClick } from "lucide-react";
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
import { HeaderLinkPanel } from "./HeaderLinkPanel";
import { parseHotspotSelector, HotspotRect, toHotspotSelector } from "./HeaderHotspotPicker";
import { RegionSizeBadge, ContentExtraControls } from "./RegionSizeBadge";
import { ScrapedBranding } from "@/lib/api/scraping";
import { useToast } from "@/hooks/use-toast";
import { useHeaderCtaLinks } from "@/hooks/useHeaderCtaLinks";
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


function generateSelectorFromElement(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  if (el.classList.length > 0) {
    const classSelector = `${tag}.${Array.from(el.classList).join(".")}`;
    const parent = el.parentElement;
    if (parent && parent.querySelectorAll(classSelector).length === 1) return classSelector;
  }
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.tagName.toLowerCase() !== "body" && current.tagName.toLowerCase() !== "html") {
    let segment = current.tagName.toLowerCase();
    if (current.id) { parts.unshift(`#${current.id}`); break; }
    if (current.classList.length > 0) segment += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
      if (siblings.length > 1) segment += `:nth-child(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(segment);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

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
    const [linkHeaderMode, setLinkHeaderMode] = useState(false);
    const headerIframeRef = useRef<HTMLIFrameElement>(null);
    const headerOverlayRef = useRef<HTMLDivElement>(null);
    // HTML mode picking state
    const [pendingSelector, setPendingSelector] = useState("");
    const [pendingLabel, setPendingLabel] = useState("");
    // Screenshot mode hotspot drawing state
    const [hotspotDrawing, setHotspotDrawing] = useState(false);
    const [hotspotStart, setHotspotStart] = useState<{ x: number; y: number } | null>(null);
    const [hotspotCurrent, setHotspotCurrent] = useState<{ x: number; y: number } | null>(null);
    const [pendingRect, setPendingRect] = useState<HotspotRect | null>(null);
    const { data: ctaLinks = [] } = useHeaderCtaLinks(demo.id);
    const containerRef = useRef<HTMLDivElement | null>(null);
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

      const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
      const paddingY = formStyle.contentAreaPaddingY ?? 40;
      const minContentHeight = formStyle.contentAreaMinHeight ?? 400;
      const justifyMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end' };
      const justifyKey = (formStyle.contentAreaJustify || 'start') as 'start' | 'center' | 'end';
      const contentJustify = justifyMap[justifyKey] || 'flex-start';
      const contentMaxWidth = formStyle.contentAreaMaxWidth || 576;
      const contentBgColor = formStyle.contentAreaBgColor || '#f5f5f5';
      const headerHeight = formStyle.headerHeight ?? 120;
      const footerHeight = formStyle.footerHeight ?? 160;

      // Helper: persist a single FormStyleConfig field change immediately
      const updateStyle = (patch: Partial<FormStyleConfig>) => {
        onApplyBranding({ formStyle: { ...formStyle, ...patch } }, true);
      };

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
              <div className="flex items-center gap-2">
                {/* Link Header toggle */}
                {hasContentForMethod && headerHtml && (
                  <Button
                    variant={linkHeaderMode ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setLinkHeaderMode(!linkHeaderMode);
                      if (!linkHeaderMode) {
                        setPendingSelector("");
                        setPendingLabel("");
                        setPendingRect(null);
                      }
                    }}
                  >
                    <MousePointerClick className="w-4 h-4" />
                    <span className="text-xs">Link Header</span>
                    {ctaLinks.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] ml-0.5 px-1.5 py-0">
                        {ctaLinks.length}
                      </Badge>
                    )}
                  </Button>
                )}
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
            </div>
          </CardHeader>
          <CardContent>
            {hasContentForMethod ? (
              <ScrollArea className="w-full rounded-lg border bg-muted/30">
                <div
                  className={cn(
                    "p-4 relative",
                    previewViewport === 'desktop' ? "min-w-[1280px]" : "flex justify-center"
                  )}
                >
                  {/* Floating header link panel */}
                  <HeaderLinkPanel
                    active={linkHeaderMode}
                    onClose={() => setLinkHeaderMode(false)}
                    demoId={demo.id}
                    useCaseLinks={useCaseLinks}
                    pendingSelector={pendingSelector}
                    pendingLabel={pendingLabel}
                    onClearPending={() => { setPendingSelector(""); setPendingLabel(""); }}
                    pendingRect={pendingRect}
                    onClearPendingRect={() => setPendingRect(null)}
                    isScreenshotMode={activeMethod === 'screenshot'}
                  />

                  <div
                    className="overflow-hidden rounded-lg border bg-background shadow-sm"
                    style={{ width: previewViewport === 'desktop' ? '1280px' : vpConfig.width }}
                  >
                    {headerHtml && (
                      <div className="relative" style={{ height: `${headerHeight}px`, overflow: 'hidden' }}>
                        <RegionSizeBadge
                          label="Header"
                          value={headerHeight}
                          min={40}
                          max={500}
                          step={10}
                          onChange={(v) => updateStyle({ headerHeight: v })}
                          className="top-1 right-1"
                        />
                        <iframe
                          ref={headerIframeRef}
                          srcDoc={`
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1">
                                <style>
                                  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
                                  * { box-sizing: border-box; }
                                  ${linkHeaderMode && activeMethod === 'html'
                                    ? `a { pointer-events: auto !important; cursor: crosshair !important; }
                                       [data-cta-hover] { outline: 3px solid hsl(262, 83%, 58%) !important; outline-offset: 2px !important; cursor: pointer !important; }
                                       [data-cta-selected] { outline: 3px solid hsl(142, 71%, 45%) !important; outline-offset: 2px !important; }`
                                    : `a { pointer-events: none; }`
                                  }
                                </style>
                                ${cssContent ? `<style>${cssContent}</style>` : ''}
                              </head>
                              <body>
                                ${headerHtml}
                              </body>
                            </html>
                          `}
                          className="block w-full border-0"
                          style={{ height: `${headerHeight}px` }}
                          title="Live site header preview"
                          sandbox="allow-same-origin"
                          onLoad={(e) => {
                            const iframe = e.currentTarget;
                            enhanceHeaderPreviewIframe(iframe, 80);
                            // Set up click handler for HTML link mode
                            if (linkHeaderMode && activeMethod === 'html') {
                              try {
                                const doc = iframe.contentDocument;
                                if (!doc) return;
                                // Highlight existing links
                                ctaLinks.forEach((link) => {
                                  try { doc.querySelector(link.cssSelector)?.setAttribute("data-cta-selected", "true"); } catch {}
                                });
                                const handleClick = (ev: Event) => {
                                  ev.preventDefault();
                                  ev.stopPropagation();
                                  const target = ev.target as Element;
                                  const clickable = target.closest("a, button, [role='button'], [onclick]") || target;
                                  const sel = generateSelectorFromElement(clickable);
                                  const label = clickable.textContent?.trim().substring(0, 50) || clickable.tagName.toLowerCase();
                                  setPendingSelector(sel);
                                  setPendingLabel(label);
                                };
                                const handleMouseOver = (ev: Event) => {
                                  const target = ev.target as Element;
                                  if (!target || target === doc.body || target === doc.documentElement) return;
                                  const clickable = target.closest("a, button, [role='button'], [onclick]") || target;
                                  doc.querySelectorAll("[data-cta-hover]").forEach(el => el.removeAttribute("data-cta-hover"));
                                  clickable.setAttribute("data-cta-hover", "true");
                                };
                                doc.addEventListener("click", handleClick, true);
                                doc.addEventListener("mouseover", handleMouseOver);
                              } catch {}
                            }
                          }}
                        />
                        {/* Screenshot mode: overlay for hotspot drawing */}
                        {linkHeaderMode && activeMethod === 'screenshot' && (
                          <div
                            ref={headerOverlayRef}
                            className="absolute inset-0 z-10"
                            style={{ cursor: 'crosshair' }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const rect = headerOverlayRef.current?.getBoundingClientRect();
                              if (!rect) return;
                              const coords = {
                                x: ((e.clientX - rect.left) / rect.width) * 100,
                                y: ((e.clientY - rect.top) / rect.height) * 100,
                              };
                              setHotspotStart(coords);
                              setHotspotCurrent(coords);
                              setHotspotDrawing(true);
                            }}
                            onMouseMove={(e) => {
                              if (!hotspotDrawing) return;
                              const rect = headerOverlayRef.current?.getBoundingClientRect();
                              if (!rect) return;
                              setHotspotCurrent({
                                x: ((e.clientX - rect.left) / rect.width) * 100,
                                y: ((e.clientY - rect.top) / rect.height) * 100,
                              });
                            }}
                            onMouseUp={() => {
                              if (!hotspotDrawing || !hotspotStart || !hotspotCurrent) return;
                              setHotspotDrawing(false);
                              const x = Math.min(hotspotStart.x, hotspotCurrent.x);
                              const y = Math.min(hotspotStart.y, hotspotCurrent.y);
                              const w = Math.abs(hotspotCurrent.x - hotspotStart.x);
                              const h = Math.abs(hotspotCurrent.y - hotspotStart.y);
                              if (w >= 2 || h >= 2) {
                                setPendingRect({ x, y, w, h });
                              }
                              setHotspotStart(null);
                              setHotspotCurrent(null);
                            }}
                            onMouseLeave={() => {
                              if (hotspotDrawing) {
                                setHotspotDrawing(false);
                                setHotspotStart(null);
                                setHotspotCurrent(null);
                              }
                            }}
                          >
                            {/* Existing hotspot overlays */}
                            {ctaLinks.map((link) => {
                              const hs = parseHotspotSelector(link.cssSelector);
                              if (!hs) return null;
                              return (
                                <div
                                  key={link.id}
                                  className="absolute border-2 border-green-500 bg-green-500/15 rounded-sm pointer-events-none"
                                  style={{ left: `${hs.x}%`, top: `${hs.y}%`, width: `${hs.w}%`, height: `${hs.h}%` }}
                                />
                              );
                            })}
                            {/* Pending rect */}
                            {pendingRect && (
                              <div
                                className="absolute border-2 border-primary bg-primary/20 rounded-sm pointer-events-none animate-pulse"
                                style={{ left: `${pendingRect.x}%`, top: `${pendingRect.y}%`, width: `${pendingRect.w}%`, height: `${pendingRect.h}%` }}
                              />
                            )}
                            {/* Active drawing rect */}
                            {hotspotDrawing && hotspotStart && hotspotCurrent && (() => {
                              const dr = {
                                x: Math.min(hotspotStart.x, hotspotCurrent.x),
                                y: Math.min(hotspotStart.y, hotspotCurrent.y),
                                w: Math.abs(hotspotCurrent.x - hotspotStart.x),
                                h: Math.abs(hotspotCurrent.y - hotspotStart.y),
                              };
                              return (
                                <div
                                  className="absolute border-2 border-primary bg-primary/20 rounded-sm pointer-events-none"
                                  style={{ left: `${dr.x}%`, top: `${dr.y}%`, width: `${dr.w}%`, height: `${dr.h}%` }}
                                />
                              );
                            })()}
                          </div>
                        )}
                        {/* Link mode indicator border */}
                        {linkHeaderMode && (
                          <div className="absolute inset-0 border-2 border-primary/40 rounded-sm pointer-events-none z-20">
                            <Badge className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] animate-pulse">
                              {activeMethod === 'screenshot' ? 'Draw region' : 'Click element'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content area */}
                    <div className="relative" style={{ backgroundColor: contentBgColor }}>
                      <RegionSizeBadge
                        label="Content"
                        value={minContentHeight}
                        min={100}
                        max={1500}
                        step={10}
                        onChange={(v) => updateStyle({ contentAreaMinHeight: v })}
                        className="top-1 right-1"
                        extraControls={
                          <ContentExtraControls
                            paddingY={paddingY}
                            onPaddingYChange={(v) => updateStyle({ contentAreaPaddingY: v })}
                            justify={justifyKey}
                            onJustifyChange={(v) => updateStyle({ contentAreaJustify: v })}
                            maxWidth={contentMaxWidth}
                            onMaxWidthChange={(v) => updateStyle({ contentAreaMaxWidth: v })}
                            bgColor={contentBgColor}
                            onBgColorChange={(v) => updateStyle({ contentAreaBgColor: v })}
                          />
                        }
                      />

                      <div
                        style={{
                          minHeight: `${minContentHeight}px`,
                          paddingTop: `${paddingY}px`,
                          paddingBottom: `${paddingY}px`,
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: contentJustify,
                          alignItems: 'center',
                        }}
                      >
                        <div className="relative" style={{ maxWidth: `${contentMaxWidth}px`, width: '100%' }} ref={containerRef}>
                          <iframe
                            srcDoc={generatePreviewDocument({
                              formStyle: demo.formStyle || DEFAULT_FORM_STYLE,
                              buttonColor: demo.buttonColor || '#3b82f6',
                              headerHtml: '',
                              footerHtml: '',
                              contentBgColor: 'transparent',
                              skipLayoutWrapper: true,
                            })}
                            className="block w-full border-0"
                            style={{ height: '400px' }}
                            title="Live form preview"
                            sandbox="allow-same-origin"
                            onLoad={(e) => {
                              const iframe = e.target as HTMLIFrameElement;
                              try {
                                const body = iframe.contentDocument?.body;
                                const height = body?.scrollHeight || 400;
                                iframe.style.height = `${Math.max(height, 300)}px`;
                              } catch {
                                iframe.style.height = '400px';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {footerHtml && (
                      <div className="relative" style={{ height: `${footerHeight}px`, overflow: 'hidden' }}>
                        <RegionSizeBadge
                          label="Footer"
                          value={footerHeight}
                          min={40}
                          max={500}
                          step={10}
                          onChange={(v) => updateStyle({ footerHeight: v })}
                          className="top-1 right-1"
                        />
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
                          style={{ height: `${footerHeight}px` }}
                          title="Live site footer preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
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