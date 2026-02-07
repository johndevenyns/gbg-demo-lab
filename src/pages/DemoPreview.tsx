import { useParams, Link } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useMemo } from "react";
import { DemoFlowRenderer } from "@/components/preview/DemoFlowRenderer";
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from "@/components/preview/ResultPage";
import { DEFAULT_FORM_STYLE } from "@/types/formStyle";

// Helper functions for form styling
function getFormBorderRadius(radius?: string): string {
  switch (radius) {
    case 'none': return '0px';
    case 'sm': return '6px';
    case 'md': return '8px';
    case 'lg': return '12px';
    case 'xl': return '16px';
    case '2xl': return '24px';
    default: return '12px';
  }
}

function getFormShadow(shadow?: string): string {
  switch (shadow) {
    case 'none': return 'none';
    case 'sm': return '0 1px 2px rgba(0,0,0,0.05)';
    case 'md': return '0 4px 6px -1px rgba(0,0,0,0.1)';
    case 'lg': return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
    case 'xl': return '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
    default: return '0 10px 15px -3px rgba(0,0,0,0.1)';
  }
}

export default function DemoPreview() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: demo, isLoading, error } = useDemoBySlug(slug || "");

  const handleFlowComplete = useCallback((success: boolean, referenceId?: string) => {
    console.log('Flow complete:', { success, referenceId });
    // The result page handles the redirect via its button
  }, []);

  // Build full HTML document for the preview iframe - handles all mirroring methods properly
  const previewDocument = useMemo(() => {
    if (!demo) return null;

    const activeMethod = demo.mirrorActiveMethod || 'html';
    const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
    
    // Get the correct header/footer HTML based on active method
    let headerHtml = '';
    let footerHtml = '';
    let cssContent = '';

    if (activeMethod === 'screenshot') {
      headerHtml = demo.mirrorScreenshotHeaderHtml || '';
      footerHtml = demo.mirrorScreenshotFooterHtml || '';
      cssContent = ''; // Screenshot method uses img tags, no external CSS
    } else {
      // HTML capture method
      headerHtml = demo.mirrorHtmlHeaderHtml || demo.scrapedHeaderHtml || '';
      footerHtml = demo.mirrorHtmlFooterHtml || demo.scrapedFooterHtml || '';
      cssContent = demo.mirrorHtmlCss || demo.scrapedCss || '';
    }

    // Fallback header if nothing is configured
    if (!headerHtml.trim()) {
      headerHtml = `
        <header style="padding: 16px 24px; background: ${demo.headerBgColor || '#1a1a2e'}; color: ${demo.headerTextColor || '#ffffff'};">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 16px;">
            ${demo.logoUrl ? `<img src="${demo.logoUrl}" alt="${demo.customerName}" style="height: 32px;" />` : ''}
            <span style="font-weight: 600; font-size: 18px;">${demo.customerName}</span>
          </div>
        </header>
      `;
    }

    return {
      headerHtml,
      footerHtml,
      cssContent,
      formStyle,
    };
  }, [demo]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !demo || !demo.isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Demo Not Found</h1>
          <p className="text-muted-foreground">This demo environment doesn't exist or is inactive.</p>
        </div>
      </div>
    );
  }

  // Check if we have mirrored content
  const hasMirroredHeader = Boolean(previewDocument?.headerHtml?.trim());
  const hasMirroredFooter = Boolean(previewDocument?.footerHtml?.trim());

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mirrored Header - using iframe for CSS isolation */}
      {hasMirroredHeader && previewDocument && (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { margin: 0; padding: 0; }
                  * { box-sizing: border-box; }
                  a { pointer-events: none; }
                </style>
                ${previewDocument.cssContent ? `<style>${previewDocument.cssContent}</style>` : ''}
              </head>
              <body>
                ${previewDocument.headerHtml}
              </body>
            </html>
          `}
          className="w-full border-0"
          style={{ height: 'auto', minHeight: '60px' }}
          title="Site header"
          sandbox="allow-same-origin"
          onLoad={(e) => {
            // Auto-resize iframe to content height
            const iframe = e.target as HTMLIFrameElement;
            try {
              const height = iframe.contentDocument?.body?.scrollHeight || 80;
              iframe.style.height = `${height}px`;
            } catch {
              iframe.style.height = '80px';
            }
          }}
        />
      )}

      {/* Main Form Content */}
      <main
        className="flex-1 py-12"
        style={{
          backgroundColor: previewDocument?.formStyle?.contentAreaBgColor || 'transparent',
        }}
      >
        <div className="max-w-xl mx-auto px-4">
          <div 
            className="p-8"
            style={{
              backgroundColor: (previewDocument?.formStyle?.formBgColor || 'white'),
              borderRadius: getFormBorderRadius(previewDocument?.formStyle?.formBorderRadius),
              boxShadow: getFormShadow(previewDocument?.formStyle?.formShadow),
              border: `${previewDocument?.formStyle?.formBorderWidth || '1'}px solid ${previewDocument?.formStyle?.formBorderColor || '#e5e7eb'}`,
            }}
          >
            {demo.formSteps.length > 0 ? (
              <DemoFlowRenderer
                key={demo.id}
                steps={demo.formSteps}
                buttonColor={demo.buttonColor}
                formStyle={demo.formStyle}
                successPageConfig={demo.successPageConfig || DEFAULT_SUCCESS_CONFIG}
                failurePageConfig={demo.failurePageConfig || DEFAULT_FAILURE_CONFIG}
                approvedUrl={demo.approvedUrl}
                rejectedUrl={demo.rejectedUrl}
                customerName={demo.customerName}
                returnUrl={demo.returnUrl}
                includeQr={demo.includeQr}
                referenceIdPrefix={demo.referenceIdPrefix}
                storedTestData={demo.storedTestData}
                showTestButtons={true}
                logoUrl={demo.logoUrl}
                headerBgColor={demo.headerBgColor}
                headerTextColor={demo.headerTextColor}
                resourceId={demo.resourceId}
                resourceIdDocBio={demo.resourceIdDocBio}
                resourceIdDataBio={demo.resourceIdDataBio}
                resourceIdDataOnly={demo.resourceIdDataOnly}
                onComplete={handleFlowComplete}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No form steps configured</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mirrored Footer - using iframe for CSS isolation */}
      {hasMirroredFooter && previewDocument && (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { margin: 0; padding: 0; }
                  * { box-sizing: border-box; }
                  a { pointer-events: none; }
                </style>
                ${previewDocument.cssContent ? `<style>${previewDocument.cssContent}</style>` : ''}
              </head>
              <body>
                ${previewDocument.footerHtml}
              </body>
            </html>
          `}
          className="w-full border-0"
          style={{ height: 'auto', minHeight: '60px' }}
          title="Site footer"
          sandbox="allow-same-origin"
          onLoad={(e) => {
            // Auto-resize iframe to content height
            const iframe = e.target as HTMLIFrameElement;
            try {
              const height = iframe.contentDocument?.body?.scrollHeight || 200;
              iframe.style.height = `${height}px`;
            } catch {
              iframe.style.height = '200px';
            }
          }}
        />
      )}

      {/* Admin Exit Bar - Only show for authenticated admins */}
      {!authLoading && isAdmin && (
        <>
          <div className="fixed bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border py-2 px-4 z-50">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Preview Mode</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {demo.customerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/demo/${demo.id}`}>
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Spacer for fixed bar */}
          <div className="h-12" />
        </>
      )}
    </div>
  );
}
