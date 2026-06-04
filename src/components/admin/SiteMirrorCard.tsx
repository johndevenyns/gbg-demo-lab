import { useState, useCallback, useRef, useEffect } from "react";
import { Globe, X, Eye, Monitor, Tablet, Smartphone, MousePointerClick, Sparkles, Loader2 } from "lucide-react";
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
import { ScrapedBranding, headerRefinementApi } from "@/lib/api/scraping";
import { useToast } from "@/hooks/use-toast";
import { useHeaderCtaLinks } from "@/hooks/useHeaderCtaLinks";
import { DemoEnvironment } from "@/types/demo";
import { DemoUseCaseLink } from "@/types/useCase";
import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
import { generatePreviewDocument } from "@/lib/formStyleUtils";
import { enhanceHeaderPreviewIframe } from "@/lib/iframeContrast";
import { cn } from "@/lib/utils";

/**
 * Footer preview iframe that auto-fits its captured content's natural height.
 *
 * Captured footers vary wildly in size (some sites have 80px legal strips,
 * others have 800px multi-column sitemaps). A fixed iframe height clipped
 * the content. Now we listen for postMessage updates from a tiny script
 * injected into the iframe, and grow the visible height to fit — but never
 * shrink below the user-set badge value, which still acts as a minimum.
 */
function FooterPreviewFrame({
  footerHtml,
  cssContent,
  minHeight,
  onHeightChange,
  isScreenshotMode = false,
}: {
  footerHtml: string;
  cssContent?: string;
  minHeight: number;
  onHeightChange: (h: number) => void;
  isScreenshotMode?: boolean;
}) {
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const frameId = useRef<string>(`footer-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'mirror-footer-height' && e.data.frameId === frameId.current) {
        const h = Number(e.data.height) || 0;
        if (h > 20 && h < 2000) setNaturalHeight(h);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // The visible height is the larger of the user-set minimum and the
  // measured natural height. This means the badge effectively becomes a
  // floor, and the iframe expands to show the whole footer.
  // In screenshot mode the captured footer is a single image, so the
  // minHeight floor would leave empty space below the image — ignore it
  // and fit the iframe tightly to the natural content height.
  const displayHeight = Math.max(naturalHeight, 1);

  const srcDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    * { box-sizing: border-box; }
    a { pointer-events: none; }
  </style>
  ${cssContent ? `<style>${cssContent}</style>` : ''}
</head>
<body>
  ${footerHtml}
  <script>
    (function() {
      var FRAME_ID = ${JSON.stringify(frameId.current)};
      function report() {
        try {
          var h = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
          );
          window.parent.postMessage({ type: 'mirror-footer-height', frameId: FRAME_ID, height: h }, '*');
        } catch (e) {}
      }
      // Report after initial paint, then whenever images load, then on
      // any DOM mutation (covers async-mounted footer widgets).
      report();
      setTimeout(report, 100);
      setTimeout(report, 500);
      setTimeout(report, 1500);
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].addEventListener('load', report);
        imgs[i].addEventListener('error', report);
      }
      try {
        var mo = new MutationObserver(report);
        mo.observe(document.body, { childList: true, subtree: true, attributes: true });
      } catch (e) {}
    })();
  </script>
</body>
</html>`;

  return (
    <div className="relative" style={{ height: `${displayHeight}px`, overflow: 'hidden' }}>
      <RegionSizeBadge
        label="Footer"
        value={minHeight}
        min={40}
        max={1200}
        step={10}
        onChange={onHeightChange}
        className="top-1 right-1"
      />
      <iframe
        srcDoc={srcDoc}
        className="block w-full border-0"
        style={{ height: `${displayHeight}px` }}
        title="Live site footer preview"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}

type PreviewViewport = 'desktop' | 'tablet' | 'phone';

const viewportConfig: Record<PreviewViewport, { width: string; iframeWidth: number | null; label: string; icon: React.ElementType }> = {
  desktop: { width: '100%', iframeWidth: 1280, label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', iframeWidth: null, label: 'Tablet', icon: Tablet },
  phone: { width: '390px', iframeWidth: null, label: 'Phone', icon: Smartphone },
};

/**
 * Hook that listens for `mirror-region-height` postMessages from a child
 * iframe and returns the largest reported natural content height. Used to
 * auto-fit the header preview around mega-menus and stacked top bars in
 * the same way `FooterPreviewFrame` already does for footers.
 */
function useNaturalIframeHeight(frameId: string) {
  const [height, setHeight] = useState<number>(0);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'mirror-region-height' && e.data.frameId === frameId) {
        const h = Number(e.data.height) || 0;
        if (h > 20 && h < 2000) setHeight(h);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [frameId]);
  return height;
}

/**
 * Tiny script injected into header / footer preview iframes that reports
 * the natural content height back to the parent via postMessage. Kept as
 * a string so it can be dropped into a `srcDoc` template literal.
 */
function buildHeightReporterScript(frameId: string, messageType: string): string {
  return `
  <script>
    (function() {
      var FRAME_ID = ${JSON.stringify(frameId)};
      var TYPE = ${JSON.stringify(messageType)};
      function report() {
        try {
          var h = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
          );
          window.parent.postMessage({ type: TYPE, frameId: FRAME_ID, height: h }, '*');
        } catch (e) {}
      }
      report();
      setTimeout(report, 100);
      setTimeout(report, 500);
      setTimeout(report, 1500);
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].addEventListener('load', report);
        imgs[i].addEventListener('error', report);
      }
      try {
        var mo = new MutationObserver(report);
        mo.observe(document.body, { childList: true, subtree: true, attributes: true });
      } catch (e) {}
    })();
  </script>`;
}

function repairHeaderLogoHtml(headerHtml: string | undefined, logoUrl?: string, customerName?: string) {
  if (!headerHtml || !logoUrl || logoUrl.startsWith('data:')) return headerHtml || '';
  if (!/src\s*=\s*["']data:image\/svg\+xml/i.test(headerHtml)) return headerHtml;
  const safeAlt = (customerName || 'Logo').replace(/"/g, '&quot;');
  const safeLogoUrl = logoUrl.replace(/"/g, '%22');
  return headerHtml.replace(
    /<img\b[\s\S]*?src\s*=\s*["']data:image\/svg\+xml,[\s\S]*?(?:\/?>|(?=<\/a>))/i,
    `<img alt="${safeAlt}" src="${safeLogoUrl}" style="display:block;height:auto;max-height:48px;max-width:220px;width:auto;" />`
  );
}


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
    const [isRefining, setIsRefining] = useState(false);
    const [lastRefinementScore, setLastRefinementScore] = useState<number | null>(null);
    const headerIframeRef = useRef<HTMLIFrameElement>(null);
    const headerOverlayRef = useRef<HTMLDivElement>(null);
  const headerFrameId = useRef<string>(`header-${Math.random().toString(36).slice(2, 8)}`).current;
  const headerNaturalHeight = useNaturalIframeHeight(headerFrameId);
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

   /**
    * On-demand AI refinement of the saved HTML capture. Compares the captured
    * header/footer to the desktop screenshot using vision AI and applies
    * corrected HTML + an additional CSS override block. Triggered by the
    * "Refine with AI" button on the live preview, NOT during demo creation,
    * so the wizard stays fast and refinement only runs when the user wants it.
    */
   const handleRefineWithAi = useCallback(async () => {
     // Need an existing capture to refine and a screenshot to compare against
     const screenshot = (() => {
       try {
         const parsed = demo.mirrorScreenshotCss ? JSON.parse(demo.mirrorScreenshotCss) : null;
         return parsed?.viewportScreenshots?.desktop?.src as string | undefined;
       } catch {
         return undefined;
       }
     })();

     if (!screenshot) {
       toast({
         title: "Screenshot Required",
         description: "AI refinement compares the HTML capture against a screenshot of the site. Re-fetch the site to generate one first.",
         variant: "destructive",
       });
       return;
     }

     if (!demo.mirrorHtmlHeaderHtml || demo.mirrorHtmlHeaderHtml.trim().length === 0) {
       toast({
         title: "No HTML Capture",
         description: "Capture the site's HTML header/footer first, then refine.",
         variant: "destructive",
       });
       return;
     }

     setIsRefining(true);
     setLastRefinementScore(null);
     try {
       // Hard 100s client-side timeout so a hung refinement never blocks the UI
       const controller = new AbortController();
       const timer = setTimeout(() => controller.abort(), 100_000);
       const refinement = await headerRefinementApi.refineCapture(
         screenshot,
         demo.mirrorHtmlHeaderHtml || '',
         demo.mirrorHtmlFooterHtml || '',
         demo.mirrorHtmlCss || '',
         demo.customerSiteUrl || url || '',
         controller.signal,
       ).finally(() => clearTimeout(timer));

       if (refinement.success && refinement.data) {
         const r = refinement.data;
         const refinedHeader = r.refinedHeaderHtml || demo.mirrorHtmlHeaderHtml || '';
         const refinedFooter = r.refinedFooterHtml || demo.mirrorHtmlFooterHtml || '';
         const refinedCss = r.additionalCss
           ? (demo.mirrorHtmlCss || '') + '\n/* AI Refinement */\n' + r.additionalCss
           : (demo.mirrorHtmlCss || '');

         const updates: Partial<DemoEnvironment> = {
           mirrorHtmlHeaderHtml: refinedHeader,
           mirrorHtmlFooterHtml: refinedFooter,
           mirrorHtmlCss: refinedCss,
         };
         // Also adopt better extracted brand colors when AI provides them
         if (r.extractedColors?.headerBgColor) updates.headerBgColor = r.extractedColors.headerBgColor;
         if (r.extractedColors?.headerTextColor) updates.headerTextColor = r.extractedColors.headerTextColor;
         if (r.extractedColors?.buttonColor) updates.buttonColor = r.extractedColors.buttonColor;
          if (r.extractedColors?.logoUrl) {
            updates.logoUrl = r.extractedColors.logoUrl;
            updates.useUploadedLogo = false;
          }

         onApplyBranding(updates, true);
         setLastRefinementScore(r.matchScore);
         const changeCount = r.changes?.length || 0;
         toast({
           title: `AI Refined — ${r.matchScore}% Match`,
           description: `Applied ${changeCount} correction${changeCount !== 1 ? 's' : ''} to the HTML capture.`,
         });
       } else {
         toast({
           title: "Refinement Failed",
           description: refinement.error || "AI could not refine the capture. Original capture is unchanged.",
           variant: "destructive",
         });
       }
     } catch (e) {
       const msg = e instanceof Error ? e.message : 'Unknown error';
       toast({
         title: "Refinement Error",
         description: msg.includes('abort') ? 'Refinement timed out after 100s.' : msg,
         variant: "destructive",
       });
     } finally {
       setIsRefining(false);
     }
   }, [demo, url, onApplyBranding, toast]);

   // Unified fetch: when HTML capture completes, also populate screenshot + branding data
   const handleUnifiedFetchComplete = useCallback((data: ScrapedBranding) => {
     const updates: Partial<DemoEnvironment> = {
       customerSiteUrl: url,
     };
      const hasHtmlCapture = Boolean(
        data.headerHtml?.trim() || data.footerHtml?.trim() || data.cssContent?.trim()
      );

      // Populate screenshot data if we got screenshots
      if (data.screenshot || data.screenshots?.desktop) {
        const desktopScreenshot = data.screenshots?.desktop || data.screenshot;
        if (desktopScreenshot) {
          // Build screenshot-based header/footer HTML (image-based).
          // Use a fixed-height wrapper with overflow:hidden and an absolute-
          // positioned img so the crop is exact and the rest of the
          // captured page (e.g. an embedded sign-in form on /auth) cannot
          // bleed into the preview. The previous max-height approach left
          // the wrapper sized to the full screenshot, which caused the
          // middle of the page to show through behind the form.
          const screenshotSrc = desktopScreenshot.startsWith('data:') || desktopScreenshot.startsWith('http')
            ? desktopScreenshot
            : `data:image/png;base64,${desktopScreenshot}`;
          const headerCropPx = Math.max(40, Math.round(data.headerHeight ?? 120));
          const footerCropPx = Math.max(60, Math.round(data.footerHeight ?? 180));
          updates.mirrorScreenshotHeaderHtml = `<div style="width:100%;height:${headerCropPx}px;overflow:hidden;position:relative;"><img src="${screenshotSrc}" style="display:block;width:100%;height:auto;position:absolute;top:0;left:0;" alt="Site header" /></div>`;
          updates.mirrorScreenshotFooterHtml = `<div style="width:100%;height:${footerCropPx}px;overflow:hidden;position:relative;"><img src="${screenshotSrc}" style="display:block;width:100%;height:auto;position:absolute;bottom:0;left:0;" alt="Site footer" /></div>`;
          updates.mirrorScreenshotCss = '';
          if (!hasHtmlCapture) {
            updates.mirrorActiveMethod = 'screenshot';
            setActiveMethod('screenshot');
          }
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
        updates.useUploadedLogo = false;
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
      const headerHtml = showingMethod === 'html'
        ? repairHeaderLogoHtml(demo.mirrorHtmlHeaderHtml, demo.logoUrl, demo.customerName)
        : demo.mirrorScreenshotHeaderHtml;
     const footerHtml = showingMethod === 'html' ? demo.mirrorHtmlFooterHtml : demo.mirrorScreenshotFooterHtml;
     const cssContent = showingMethod === 'html' ? demo.mirrorHtmlCss : demo.mirrorScreenshotCss;
     const hasContentForMethod = showingMethod === 'html' ? hasHtmlContent : hasScreenshotContent;

      const vpConfig = viewportConfig[previewViewport];

      const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
       const paddingY = formStyle.contentAreaPaddingY ?? 0;
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
                {/* Refine HTML capture with AI (only when HTML mode is active and configured) */}
                {hasContentForMethod && activeMethod === 'html' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleRefineWithAi}
                    disabled={isRefining}
                    title="Use vision AI to compare the capture to the screenshot and apply corrections"
                  >
                    {isRefining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span className="text-xs">{isRefining ? 'Refining…' : 'Refine with AI'}</span>
                    {lastRefinementScore !== null && !isRefining && (
                      <Badge variant="secondary" className="text-[10px] ml-0.5 px-1.5 py-0">
                        {lastRefinementScore}%
                      </Badge>
                    )}
                  </Button>
                )}
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
                      <div
                        className="relative"
                        style={{
                          // Badge value is a FLOOR, not a ceiling — let the
                          // captured header reveal mega-menus / top bars
                          // without being clipped to the default height.
                          // In screenshot mode the captured header is a single
                          // image; ignore the floor so the wrapper hugs the
                          // image and there's no empty gap below it.
                          height: `${Math.max(headerNaturalHeight, 1)}px`,
                          overflow: 'hidden',
                        }}
                      >
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
                                ${buildHeightReporterScript(headerFrameId, 'mirror-region-height')}
                              </body>
                            </html>
                          `}
                          className="block w-full border-0"
                          style={{
                            height: `${Math.max(headerNaturalHeight, 1)}px`,
                          }}
                          title="Live site header preview"
                          sandbox="allow-same-origin allow-scripts"
                          onLoad={(e) => {
                            const iframe = e.currentTarget;
                            enhanceHeaderPreviewIframe(iframe, 1);
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
                      <FooterPreviewFrame
                        footerHtml={footerHtml}
                        cssContent={cssContent}
                        minHeight={footerHeight}
                        onHeightChange={(v) => updateStyle({ footerHeight: v })}
                        isScreenshotMode={activeMethod === 'screenshot'}
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
              iframeBordersVisible={demo.mirrorIframeBordersVisible ?? false}
              onIframeBordersVisibleChange={(v) =>
                onApplyBranding({ mirrorIframeBordersVisible: v }, true)
              }
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