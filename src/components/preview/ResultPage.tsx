import { CheckCircle2, XCircle, ExternalLink, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { 
  getFormBorderRadius, 
  getFormShadow, 
  getTitleFontSize, 
  getTitleFontWeight,
  getBodyFontSize,
  getBorderRadius
} from '@/lib/formStyleUtils';

export type ResultButtonAction = 'url' | 'portal' | 'landing';
export type ResultPageMode = 'default' | 'mirror' | 'custom_html' | 'screenshots' | 'ai_generated' | 'single_screenshot';

export type PageHotspotSlot = 'main' | 'header' | 'footer';
export type PageHotspotLinkKind = 'use_case' | 'page' | 'url';

export interface PageHotspot {
  id: string;
  slot: PageHotspotSlot;
  rect: { x: number; y: number; w: number; h: number }; // 0-100 percent
  linkKind: PageHotspotLinkKind;
  useCaseId?: string;
  pageSlug?: string;
  url?: string;
  openInNewTab?: boolean;
  label?: string;
}

export interface ResultPageScreenshotConfig {
  url?: string;
  height?: number; // px
  bgColor?: string;
  /** How the image is sized within its slot:
   *  - contain: actual aspect, fully visible (default)
   *  - cover: fill slot, may crop
   *  - stretch: fill slot, ignore aspect (may distort)
   *  - actual: original pixel size (no scaling)
   */
  fitMode?: 'contain' | 'cover' | 'stretch' | 'actual';
  /** Horizontal alignment of image within slot */
  positionX?: 'left' | 'center' | 'right';
  /** Vertical alignment of image within slot */
  positionY?: 'top' | 'center' | 'bottom';
}

export interface ResultPageConfig {
  type: 'success' | 'failure';
  title: string;
  subtitle?: string;
  message?: string;
  showIcon?: boolean;
  buttonText?: string;
  buttonAction?: ResultButtonAction;
  buttonUrl?: string;
  showReferenceId?: boolean;
  referenceId?: string;
  customContent?: string;

  // === New: page mode + per-mode config ===
  pageMode?: ResultPageMode;

  // Mirror mode: HTML body that goes between scraped header & footer
  mirrorMainHtml?: string;

  // Custom HTML mode: full HTML body content (sanitized)
  customHtml?: string;

  // Screenshots mode
  screenshotHeader?: ResultPageScreenshotConfig;
  screenshotMain?: ResultPageScreenshotConfig;
  screenshotFooter?: ResultPageScreenshotConfig;

  // Single screenshot mode — one image fills the page with vertical spacing + bg color
  singleScreenshotUrl?: string;
  singleScreenshotBgColor?: string;
  singleScreenshotPaddingTop?: number; // px
  singleScreenshotPaddingBottom?: number; // px
  singleScreenshotFitMode?: 'contain' | 'cover' | 'stretch' | 'actual';

  // Chrome around the single-screenshot main area
  // 'none' = no chrome, 'mirror' = use the demo's scraped header/footer, 'upload' = use uploaded image
  headerSource?: 'none' | 'mirror' | 'upload';
  footerSource?: 'none' | 'mirror' | 'upload';
  headerScreenshot?: ResultPageScreenshotConfig;
  footerScreenshot?: ResultPageScreenshotConfig;

  // AI generated mode
  aiPrompt?: string;
  aiGeneratedHtml?: string;
  aiGeneratedAt?: string;

  // Show/hide the action button (default: true if buttonText is set)
  showButton?: boolean;

  // Debug: show borders on iframe / screenshot blocks to diagnose spacing
  showBorders?: boolean;

  // Clickable hotspot regions overlaid on screenshot-mode pages
  hotspots?: PageHotspot[];
}

interface ResultPageProps {
  config: ResultPageConfig;
  formStyle?: FormStyleConfig;
  buttonColor?: string;
  onButtonClick?: () => void;
  // Mirror chrome (passed by renderer when mode === 'mirror')
  mirrorHeaderHtml?: string;
  mirrorFooterHtml?: string;
  mirrorCss?: string;
  /** Used to navigate to an extra custom page via /demo/:slug/page/:pageSlug */
  demoSlug?: string;
}

const SANITIZE_OPTS = {
  ALLOWED_TAGS: ['p','br','strong','em','b','i','u','a','ul','ol','li','h1','h2','h3','h4','h5','h6','span','div','section','article','header','footer','main','img','figure','figcaption','blockquote','hr','small','table','thead','tbody','tr','td','th','button','svg','path','g','circle','rect','line','polyline','polygon','style'],
  ALLOWED_ATTR: ['href','target','rel','class','style','src','alt','width','height','viewBox','fill','stroke','stroke-width','d','x','y','x1','y1','x2','y2','points','cx','cy','r','transform','aria-label','role','title'],
  ADD_TAGS: ['style'],
  FORBID_TAGS: ['script','iframe','object','embed'],
};

function buildMirrorIframeSrc(html: string, css: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${css || ''}\nhtml,body{margin:0;padding:0;overflow:hidden}</style></head><body>${html || ''}</body></html>`;
}

function MirrorChrome({ html, css, minHeight, showBorders }: { html?: string; css?: string; minHeight: number; showBorders?: boolean }) {
  if (!html) return null;
  // Fit the iframe height exactly to its rendered content (e.g. the footer
  // screenshot image) so there is no extra whitespace above/below it.
  const fitToContent = (iframe: HTMLIFrameElement) => {
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      const measure = () => {
        try {
          const h = Math.ceil(doc.body.getBoundingClientRect().height);
          if (h > 0) iframe.style.height = `${h}px`;
        } catch { /* ignore */ }
      };
      measure();
      // Re-measure once images inside the chrome finish loading
      Array.from(doc.images || []).forEach((img) => {
        if (!img.complete) img.addEventListener('load', measure);
      });
      setTimeout(measure, 300);
    } catch { /* ignore */ }
  };
  return (
    <iframe
      title="result-mirror-chrome"
      srcDoc={buildMirrorIframeSrc(html, css || '')}
      sandbox="allow-same-origin"
      style={{ width: '100%', border: showBorders ? '2px dashed #ef4444' : 'none', display: 'block', height: minHeight }}
      onLoad={(e) => fitToContent(e.currentTarget)}
    />
  );
}

function ScreenshotBlock({ cfg, fallbackBg, showBorders }: { cfg?: ResultPageScreenshotConfig; fallbackBg?: string; showBorders?: boolean }) {
  if (!cfg?.url) return null;
  // Slot is exactly the image's rendered height (no vertical whitespace).
  // The selected background color shows on either side of the image when the
  // image doesn't take up the full container width (contain / actual modes).
  const fit = cfg.fitMode || 'contain';
  const posX = cfg.positionX || 'center';
  const justify = posX === 'left' ? 'flex-start' : posX === 'right' ? 'flex-end' : 'center';
  const imgStyle: React.CSSProperties =
    fit === 'stretch' ? { display: 'block', width: '100%', height: 'auto', margin: 0, padding: 0 }
    : fit === 'cover' ? { display: 'block', width: '100%', height: 'auto', objectFit: 'cover', margin: 0, padding: 0 }
    : fit === 'actual' ? { display: 'block', maxWidth: '100%', height: 'auto', margin: 0, padding: 0 }
    : /* contain */ { display: 'block', maxWidth: '100%', height: 'auto', margin: 0, padding: 0 };
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: cfg.bgColor || fallbackBg || 'transparent',
        display: 'flex',
        justifyContent: justify,
        alignItems: 'flex-start',
        lineHeight: 0,
        fontSize: 0,
        outline: showBorders ? '2px dashed #ef4444' : undefined,
      }}
    >
      <img src={cfg.url} alt="" style={imgStyle} />
    </div>
  );
}

export function ResultPage({ config, formStyle, buttonColor, onButtonClick, mirrorHeaderHtml, mirrorFooterHtml, mirrorCss, demoSlug }: ResultPageProps) {
  const style = formStyle || DEFAULT_FORM_STYLE;
  const isSuccess = config.type === 'success';
  const mode: ResultPageMode = config.pageMode || 'default';

  // Hotspot click dispatcher — mirrors header CTA behavior
  const handleHotspotClick = (h: PageHotspot) => {
    if (h.linkKind === 'url' && h.url) {
      if (h.openInNewTab) window.open(h.url, '_blank', 'noopener');
      else window.location.href = h.url;
    } else if (h.linkKind === 'use_case' && h.useCaseId) {
      window.postMessage({ type: 'cta-use-case', useCaseId: h.useCaseId }, '*');
    } else if (h.linkKind === 'page' && h.pageSlug) {
      const slug = demoSlug || window.location.pathname.match(/^\/demo\/([^/]+)/)?.[1];
      if (slug) window.location.href = `/demo/${slug}/page/${h.pageSlug}`;
    }
  };

  const renderHotspots = (slot: PageHotspotSlot) => {
    const list = (config.hotspots || []).filter(h => h.slot === slot);
    if (list.length === 0) return null;
    return (
      <>
        {list.map(h => (
          <button
            key={h.id}
            type="button"
            aria-label={h.label || `Hotspot ${slot}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleHotspotClick(h); }}
            className="absolute cursor-pointer bg-transparent border-0 p-0 m-0"
            style={{
              left: `${h.rect.x}%`,
              top: `${h.rect.y}%`,
              width: `${h.rect.w}%`,
              height: `${h.rect.h}%`,
              outline: config.showBorders ? '2px dashed #22c55e' : 'none',
              zIndex: 5,
            }}
          />
        ))}
      </>
    );
  };
  
  // Get the computed button color - prefer explicit buttonColor, then style's focus color as brand
  const computedButtonColor = buttonColor || style.inputFocusBorderColor || '#3b82f6';
  
  // Use standard success/failure colors for icons
  const successColor = '#22c55e'; // green-500
  const failureColor = '#ef4444'; // red-500
  
  // Get computed values using shared utilities
  const borderRadius = getFormBorderRadius(style.formBorderRadius);
  const boxShadow = getFormShadow(style.formShadow);
  const borderWidth = style.formBorderWidth ? `${style.formBorderWidth}px` : '1px';
  const inputBorderRadius = getBorderRadius(style.borderRadius);
  
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else if (config.buttonUrl) {
      window.location.href = config.buttonUrl;
    }
  };

  // ===== AI generated or Fully custom HTML modes =====
  if (mode === 'ai_generated' || mode === 'custom_html') {
    const html = mode === 'ai_generated' ? config.aiGeneratedHtml : config.customHtml;
    if (html && html.trim().length > 0) {
      return (
        <div
          className="w-full flex-1"
          style={{ backgroundColor: style.contentAreaBgColor || '#ffffff' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, SANITIZE_OPTS) }}
        />
      );
    }
    // fall through to default if html missing
  }

  // ===== Screenshots mode =====
  if (mode === 'screenshots') {
    const anyImage = config.screenshotHeader?.url || config.screenshotMain?.url || config.screenshotFooter?.url;
    if (anyImage) {
      const showBtn = config.showButton !== false && !!config.buttonText;
      return (
        <div
          className="w-full flex-1 flex flex-col"
          style={{ backgroundColor: style.contentAreaBgColor || '#ffffff' }}
        >
          <div className="relative">
            <ScreenshotBlock cfg={config.screenshotHeader} fallbackBg={style.formBgColor} showBorders={config.showBorders} />
            {renderHotspots('header')}
          </div>
          <div className="relative flex-1" style={{ outline: config.showBorders ? '2px dashed #ef4444' : undefined, backgroundColor: config.screenshotMain?.bgColor || undefined }}>
            <ScreenshotBlock cfg={config.screenshotMain} fallbackBg={style.formBgColor} showBorders={config.showBorders} />
            {renderHotspots('main')}
            {showBtn && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center pb-6">
                <Button
                  onClick={handleButtonClick}
                  className="min-w-[200px]"
                  style={{ backgroundColor: computedButtonColor, color: '#ffffff' }}
                >
                  {config.buttonText}
                  {config.buttonAction === 'portal' ? <LogIn className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            )}
          </div>
          <div className="relative">
            <ScreenshotBlock cfg={config.screenshotFooter} fallbackBg={style.formBgColor} showBorders={config.showBorders} />
            {renderHotspots('footer')}
          </div>
        </div>
      );
    }
    // fall through if no images
  }

  // ===== Single screenshot mode =====
  if (mode === 'single_screenshot') {
    const url = config.singleScreenshotUrl;
    const hasHeader = config.headerSource && config.headerSource !== 'none';
    const hasFooter = config.footerSource && config.footerSource !== 'none';
    if (url || hasHeader || hasFooter) {
      // Slot height equals the image's rendered height (no vertical whitespace).
      // The page's background color shows on either side of the image for
      // contain/actual fit modes when the image isn't full container width.
      const fit = config.singleScreenshotFitMode || 'contain';
      const imgStyle: React.CSSProperties =
        fit === 'stretch' ? { display: 'block', width: '100%', height: 'auto', margin: 0, padding: 0 }
        : fit === 'cover' ? { display: 'block', width: '100%', height: 'auto', objectFit: 'cover', margin: 0, padding: 0 }
        : fit === 'actual' ? { display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto', padding: 0 }
        : /* contain */ { display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto', padding: 0 };
      const showBtn = config.showButton !== false && !!config.buttonText;
      const headerH = style.headerHeight || 120;
      const footerH = style.footerHeight || 160;
      return (
        <div
          className="w-full flex-1 flex flex-col"
          style={{
            backgroundColor: config.singleScreenshotBgColor || style.contentAreaBgColor || '#ffffff',
            outline: config.showBorders ? '2px dashed #ef4444' : undefined,
          }}
        >
          {/* Header chrome */}
          {(config.headerSource === 'mirror' || config.headerSource === 'upload') && (
            <div className="relative">
              {config.headerSource === 'mirror'
                ? <MirrorChrome html={mirrorHeaderHtml} css={mirrorCss} minHeight={headerH} showBorders={config.showBorders} />
                : <ScreenshotBlock cfg={config.headerScreenshot} fallbackBg={style.formBgColor} showBorders={config.showBorders} />}
              {renderHotspots('header')}
            </div>
          )}

          {/* Main screenshot */}
          {url && (
            <div
              className="relative flex-1"
              style={{
                paddingTop: config.singleScreenshotPaddingTop ?? 0,
                paddingBottom: config.singleScreenshotPaddingBottom ?? 0,
                lineHeight: 0,
                fontSize: 0,
              }}
            >
              {/* grows to push the footer to the bottom of the viewport */}
              <div className="relative" style={{ lineHeight: 0, fontSize: 0 }}>
                <img src={url} alt="" style={imgStyle} />
                {renderHotspots('main')}
              </div>
              {showBtn && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleButtonClick}
                    className="min-w-[200px]"
                    style={{ backgroundColor: computedButtonColor, color: '#ffffff' }}
                  >
                    {config.buttonText}
                    {config.buttonAction === 'portal' ? <LogIn className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Spacer keeps the footer pinned to the bottom when no main image is set */}
          {!url && <div className="flex-1" />}

          {/* Footer chrome */}
          {(config.footerSource === 'mirror' || config.footerSource === 'upload') && (
            <div className="relative">
              {config.footerSource === 'mirror'
                ? <MirrorChrome html={mirrorFooterHtml} css={mirrorCss} minHeight={footerH} showBorders={config.showBorders} />
                : <ScreenshotBlock cfg={config.footerScreenshot} fallbackBg={style.formBgColor} showBorders={config.showBorders} />}
              {renderHotspots('footer')}
            </div>
          )}
        </div>
      );
    }
    // fall through if no image
  }

  // ===== Mirror site layout mode =====
  if (mode === 'mirror' && (mirrorHeaderHtml || mirrorFooterHtml || config.mirrorMainHtml)) {
    const headerH = style.headerHeight || 120;
    const footerH = style.footerHeight || 160;
    const showBtn = config.showButton !== false && !!config.buttonText;
    return (
      <div className="w-full flex flex-col" style={{ backgroundColor: style.contentAreaBgColor || '#ffffff' }}>
        <MirrorChrome html={mirrorHeaderHtml} css={mirrorCss} minHeight={headerH} showBorders={config.showBorders} />
        <div
          className="flex-1 px-4 py-8"
          style={{ backgroundColor: style.contentAreaBgColor || '#ffffff', outline: config.showBorders ? '2px dashed #ef4444' : undefined }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              config.mirrorMainHtml ||
                `<div style="max-width:640px;margin:0 auto;text-align:center;font-family:${style.fontFamily || 'inherit'};"><h1 style="font-size:28px;margin:0 0 12px;">${config.title || ''}</h1>${config.subtitle ? `<p style=\"font-size:18px;color:#6b7280;margin:0 0 16px;\">${config.subtitle}</p>` : ''}${config.message ? `<p style=\"font-size:16px;color:#374151;\">${config.message}</p>` : ''}</div>`,
              SANITIZE_OPTS,
            ),
          }}
        />
        {showBtn && (
          <div className="flex justify-center pb-6" style={{ outline: config.showBorders ? '2px dashed #ef4444' : undefined }}>
            <Button
              onClick={handleButtonClick}
              className="min-w-[200px]"
              style={{ backgroundColor: computedButtonColor, color: '#ffffff' }}
            >
              {config.buttonText}
              {config.buttonAction === 'portal' ? <LogIn className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        )}
        <MirrorChrome html={mirrorFooterHtml} css={mirrorCss} minHeight={footerH} showBorders={config.showBorders} />
      </div>
    );
  }

  // Container styles matching form styling
  const containerStyle: React.CSSProperties = {
    fontFamily: style.fontFamily || 'inherit',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: '2rem',
    maxWidth: '500px',
    margin: '0 auto',
  };

  // Text color based on form background for contrast
  const textColor = style.titleColor || (style.formBgColor && isLightColor(style.formBgColor) ? '#1f2937' : '#f9fafb');
  const mutedTextColor = style.bodyColor || (style.formBgColor && isLightColor(style.formBgColor) ? '#6b7280' : '#9ca3af');

  return (
    <div 
      className="min-h-full flex items-center justify-center p-4"
      style={{ backgroundColor: style.contentAreaBgColor || 'transparent' }}
    >
      <div style={containerStyle} className="text-center space-y-6">
        {/* Icon */}
        {config.showIcon !== false && (
          <div className="flex justify-center">
            {isSuccess ? (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${successColor}15`,
                }}
              >
                <CheckCircle2 
                  className="w-12 h-12" 
                  style={{ color: successColor }}
                />
              </div>
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${failureColor}15`,
                }}
              >
                <XCircle 
                  className="w-12 h-12" 
                  style={{ color: failureColor }}
                />
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <h2 
            className="mb-2"
            style={{ 
              fontFamily: style.fontFamily,
              color: textColor,
              fontSize: getTitleFontSize(style.titleFontSize),
              fontWeight: getTitleFontWeight(style.titleFontWeight),
              textAlign: style.titleAlignment || 'center',
            }}
          >
            {config.title}
          </h2>
          {config.subtitle && (
            <p 
              className="text-lg"
              style={{ 
                fontFamily: style.fontFamily,
                color: mutedTextColor,
              }}
            >
              {config.subtitle}
            </p>
          )}
        </div>

        {/* Message */}
        {config.message && (
          <p 
            className="max-w-md mx-auto"
            style={{ 
              fontFamily: style.fontFamily,
              color: mutedTextColor,
              fontSize: getBodyFontSize(style.bodyFontSize),
            }}
          >
            {config.message}
          </p>
        )}

        {/* Custom content (HTML) */}
        {config.customContent && (
          <div 
            className="prose prose-sm max-w-none"
            style={{ color: textColor }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(config.customContent, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
              }),
            }}
          />
        )}

        {/* Reference ID - small, just above the button */}
        {config.showReferenceId && config.referenceId && (
          <p className="font-mono text-xs" style={{ color: mutedTextColor }}>
            Ref: {config.referenceId}
          </p>
        )}

        {/* Button */}
        {config.showButton !== false && config.buttonText && (
          <Button
            onClick={handleButtonClick}
            className="min-w-[200px]"
            style={{ 
              backgroundColor: computedButtonColor,
              color: '#ffffff',
              borderRadius: inputBorderRadius,
              fontFamily: style.fontFamily,
            }}
          >
            {config.buttonText}
            {config.buttonAction === 'portal' ? (
              <LogIn className="w-4 h-4 ml-2" />
            ) : config.buttonUrl ? (
              <ExternalLink className="w-4 h-4 ml-2" />
            ) : (
              <ArrowRight className="w-4 h-4 ml-2" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper to determine if a color is light (for text contrast)
function isLightColor(color: string): boolean {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  // Default to light if we can't parse
  return true;
}

// Default configurations
export const DEFAULT_SUCCESS_CONFIG: ResultPageConfig = {
  type: 'success',
  title: 'Verification Complete',
  subtitle: 'Your identity has been verified successfully',
  message: 'Thank you for completing the verification process. You may now continue with your application.',
  showIcon: true,
  buttonText: 'Continue',
  showReferenceId: true,
};

export const DEFAULT_FAILURE_CONFIG: ResultPageConfig = {
  type: 'failure',
  title: 'Verification Unsuccessful',
  subtitle: 'We were unable to verify your identity',
  message: 'Please review your information and try again, or contact support for assistance.',
  showIcon: true,
  buttonText: 'Try Again',
  showReferenceId: true,
};

export const DEFAULT_LANDING_CONFIG: ResultPageConfig = {
  type: 'success',
  title: 'Welcome',
  subtitle: 'Thanks for verifying',
  message: 'This is a custom landing page you can link to from your success page.',
  showIcon: false,
  buttonText: 'Continue',
  showReferenceId: false,
};
