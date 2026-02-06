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
  
  // Generate a base URL from the source for relative asset references
  let baseHref = '';
  if (capturedSourceUrl) {
    try {
      const url = new URL(capturedSourceUrl);
      baseHref = `<base href="${url.origin}/">`;
    } catch {
      // Ignore invalid URLs
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseHref}
  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
    }
    
    /* Disable form submission for preview */
    form {
      pointer-events: auto;
    }
    
    form button[type="submit"],
    form input[type="submit"] {
      cursor: pointer;
    }

    /* Captured CSS from the original site */
    ${capturedFormCss || ''}
    
    /* Additional floating label styles that might be needed */
    .focused label,
    .has-focus label,
    .is-focused label,
    label.floating,
    label.active,
    label.shrink,
    label.label-active {
      transform: translateY(-100%) scale(0.75);
      transform-origin: top left;
    }
  </style>
</head>
<body>
  <div class="captured-form-container">
    ${capturedFormHtml || ''}
  </div>
  
  <script>
    // Prevent form submission in preview
    document.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('Form submission prevented in preview mode');
    });
    
    // Execute captured JavaScript
    try {
      ${capturedFormJs || ''}
    } catch (e) {
      console.warn('Error executing captured form JavaScript:', e);
    }
    
    // Notify parent of height changes
    function notifyHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'iframe-height', height: height }, '*');
    }
    
    // Observe DOM changes to update height
    const observer = new MutationObserver(notifyHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    
    // Initial height notification
    setTimeout(notifyHeight, 100);
    setTimeout(notifyHeight, 500);
  </script>
</body>
</html>
`.trim();
}

export default CapturedFormRenderer;
