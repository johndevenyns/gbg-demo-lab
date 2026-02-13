import { useEffect, useRef, useState } from 'react';
import { FormStyleConfig } from '@/types/formStyle';

interface CapturedFormRendererProps {
  formStyle: FormStyleConfig;
  className?: string;
  minHeight?: number;
}

/**
 * Renders a captured form in an isolated iframe to prevent CSS/JS conflicts
 * and provide a faithful reproduction of the original form.
 */
export function CapturedFormRenderer({ 
  formStyle, 
  className = '',
  minHeight = 400,
}: CapturedFormRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(minHeight);

  useEffect(() => {
    if (!iframeRef.current || !formStyle.capturedFormHtml) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Build the complete HTML document for the iframe
    const htmlContent = buildIframeContent(formStyle);
    
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Adjust iframe height to content
    const adjustHeight = () => {
      try {
        const body = doc.body;
        const html = doc.documentElement;
        if (body && html) {
          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight,
            minHeight
          );
          setIframeHeight(height + 40); // Add padding
        }
      } catch (e) {
        console.warn('Could not adjust iframe height:', e);
      }
    };

    // Adjust height after content loads
    const timer = setTimeout(adjustHeight, 100);
    const timer2 = setTimeout(adjustHeight, 500);
    const timer3 = setTimeout(adjustHeight, 1000);

    // Also listen for images loading
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', adjustHeight);
    });

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [formStyle.capturedFormHtml, formStyle.capturedFormCss, formStyle.capturedFormJs, minHeight]);

  if (!formStyle.capturedFormHtml) {
    return (
      <div className={`flex items-center justify-center h-64 bg-muted rounded-lg border ${className}`}>
        <p className="text-muted-foreground text-sm">No captured form to display</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className={`w-full border-0 rounded-lg bg-white ${className}`}
      style={{ 
        height: iframeHeight,
        minHeight: minHeight,
      }}
      title="Captured Form Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

/**
 * Build the complete HTML document for the captured form iframe
 */
function buildIframeContent(formStyle: FormStyleConfig): string {
  const { capturedFormHtml, capturedFormCss, capturedFormJs, capturedSourceUrl } = formStyle;
  
  let baseHref = '';
  if (capturedSourceUrl) {
    try {
      const url = new URL(capturedSourceUrl);
      baseHref = `<base href="${url.origin}/">`;
    } catch {
      // Ignore invalid URLs
    }
  }

  // Build framework CDN links from detected frameworks
  const patterns = formStyle.capturedPatterns as any;
  const frameworks = patterns?.detectedFrameworks || [];
  const cdnCssLinks = frameworks
    .flatMap((f: any) => f.cdnCss || [])
    .map((url: string) => `<link rel="stylesheet" href="${url}" crossorigin="anonymous">`)
    .join('\n  ');
  const cdnJsLinks = frameworks
    .flatMap((f: any) => f.cdnJs || [])
    .map((url: string) => `<script src="${url}" crossorigin="anonymous"><\/script>`)
    .join('\n  ');

  // Build font resource links (Google Fonts, Adobe Fonts, etc.)
  const fontLinks = (patterns?.fontLinks || [])
    .map((url: string) => {
      if (url.endsWith('.js')) {
        return `<script src="${url}" crossorigin="anonymous"><\/script>`;
      }
      if (url.includes('fonts.gstatic.com')) {
        return `<link rel="preconnect" href="${url}" crossorigin>`;
      }
      return `<link rel="stylesheet" href="${url}" crossorigin="anonymous">`;
    })
    .join('\n  ');

  // Build @font-face rules
  const fontFaceRules = (patterns?.fontFaceRules || []).join('\n    ');

  // Detect font-family from patterns for the body default
  const detectedFont = patterns?.detectedFontFamily || '';
  const bodyFontFamily = detectedFont
    ? `${detectedFont}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    : `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseHref}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontLinks}
  ${cdnCssLinks}
  <style>
    ${fontFaceRules}

    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: ${bodyFontFamily};
      background: transparent;
      ${patterns?.detectedLetterSpacing ? `letter-spacing: ${patterns.detectedLetterSpacing};` : ''}
      ${patterns?.detectedLineHeight ? `line-height: ${patterns.detectedLineHeight};` : ''}
    }
    form { pointer-events: auto; }
    form button[type="submit"], form input[type="submit"] { cursor: pointer; }

    ${capturedFormCss || ''}

    .focused label, .has-focus label, .is-focused label,
    label.floating, label.active, label.shrink, label.label-active {
      transform: translateY(-100%) scale(0.75);
      transform-origin: top left;
    }
  </style>
</head>
<body>
  <div class="captured-form-container">
    ${capturedFormHtml || ''}
  </div>
  ${cdnJsLinks}
  <script>
    try {
      ${capturedFormJs || ''}
    } catch (e) {
      console.warn('Error executing captured form JavaScript:', e);
    }
    
    function notifyHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'iframe-height', height: height }, '*');
    }
    const observer = new MutationObserver(notifyHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    setTimeout(notifyHeight, 100);
    setTimeout(notifyHeight, 500);
  </script>
</body>
</html>
`.trim();
}

export default CapturedFormRenderer;
