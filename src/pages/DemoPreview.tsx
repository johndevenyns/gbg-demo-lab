import { useParams, Link } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { DemoFlowRenderer } from "@/components/preview/DemoFlowRenderer";
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from "@/components/preview/ResultPage";
import { DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { useDemoUseCaseLinks } from "@/hooks/useUseCases";
import { UseCaseLandingPage } from "@/components/preview/UseCaseLandingPage";
import { ResolvedUseCase } from "@/types/useCase";
import { FormStep } from "@/types/demo";

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
  const { data: links = [] } = useDemoUseCaseLinks(demo?.id);
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<ResolvedUseCase | null>(null);

  // Resolve use cases: merge global defaults with demo overrides
  const resolvedUseCases = useMemo((): ResolvedUseCase[] => {
    return links
      .filter(link => link.isEnabled && link.globalUseCase)
      .map(link => {
        const uc = link.globalUseCase!;
        return {
          linkId: link.id,
          useCaseId: uc.id,
          title: uc.title,
          description: uc.description,
          iconName: uc.iconName,
          formSteps: (link.formStepsOverride as Record<string, unknown>[]) ?? uc.defaultFormSteps,
          verificationType: link.verificationTypeOverride ?? uc.defaultVerificationType,
          pageContent: link.pageContentOverride
            ? { ...uc.defaultPageContent, ...link.pageContentOverride }
            : uc.defaultPageContent,
          isEnabled: link.isEnabled,
          displayOrder: link.displayOrder,
        };
      });
  }, [links]);

  const hasUseCases = resolvedUseCases.length > 0;

  // Listen for CTA messages from the header iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'cta-use-case' && e.data?.useCaseId) {
        // Find the resolved use case matching the linked ID
        const target = resolvedUseCases.find(uc => uc.useCaseId === e.data.useCaseId);
        if (target) {
          handleSelectUseCase(target);
        }
      } else if (e.data?.type === 'scroll-to-form' && formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [resolvedUseCases]);

  const handleFlowComplete = useCallback((success: boolean, referenceId?: string) => {
    console.log('Flow complete:', { success, referenceId });
  }, []);

  const handleSelectUseCase = useCallback((uc: ResolvedUseCase) => {
    setSelectedUseCase(uc);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);

  // Build full HTML document for the preview iframe
  const previewDocument = useMemo(() => {
    if (!demo) return null;
    const activeMethod = demo.mirrorActiveMethod || 'html';
    const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
    let headerHtml = '';
    let footerHtml = '';
    let cssContent = '';

    if (activeMethod === 'screenshot') {
      headerHtml = demo.mirrorScreenshotHeaderHtml || '';
      footerHtml = demo.mirrorScreenshotFooterHtml || '';
    } else {
      headerHtml = demo.mirrorHtmlHeaderHtml || demo.scrapedHeaderHtml || '';
      footerHtml = demo.mirrorHtmlFooterHtml || demo.scrapedFooterHtml || '';
      cssContent = demo.mirrorHtmlCss || demo.scrapedCss || '';
    }

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

    const headerCtaUseCaseId = demo.headerCtaUseCaseId || '';
    return { headerHtml, footerHtml, cssContent, formStyle, headerCtaSelector: demo.headerCtaSelector || '', headerCtaUseCaseId };
  }, [demo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6b7280' }} />
      </div>
    );
  }

  if (error || !demo || !demo.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1f2937' }}>Demo Not Found</h1>
          <p style={{ color: '#6b7280' }}>This demo environment doesn't exist or is inactive.</p>
        </div>
      </div>
    );
  }

  const hasMirroredHeader = Boolean(previewDocument?.headerHtml?.trim());
  const hasMirroredFooter = Boolean(previewDocument?.footerHtml?.trim());

  // Determine which form steps to show
  const activeFormSteps = selectedUseCase
    ? (selectedUseCase.formSteps as unknown as FormStep[])
    : demo.formSteps;

  const showLanding = hasUseCases && !selectedUseCase;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: previewDocument?.formStyle?.contentAreaBgColor || '#f5f5f5', color: '#1a1a2e' }}>
      {/* Mirrored Header */}
      {hasMirroredHeader && previewDocument && (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { margin: 0; padding: 0; overflow: hidden; }
                  html { overflow: hidden; }
                  a { pointer-events: none; }
                  ${previewDocument.headerCtaSelector ? `${previewDocument.headerCtaSelector} { pointer-events: auto !important; cursor: pointer !important; }` : ''}
                </style>
                ${previewDocument.cssContent ? `<style>${previewDocument.cssContent}</style>` : ''}
              </head>
              <body>
                ${previewDocument.headerHtml}
                ${previewDocument.headerCtaSelector ? `
                <script>
                  document.addEventListener('click', function(e) {
                    var target = e.target.closest('${previewDocument.headerCtaSelector.replace(/'/g, "\\'")}');
                    if (target) {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'scroll-to-form' }, '*');
                    }
                  }, true);
                </script>
                ` : ''}
              </body>
            </html>
          `}
          className="w-full border-0"
          style={{ height: 'auto', minHeight: '60px' }}
          title="Site header"
          sandbox="allow-same-origin allow-scripts"
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            try {
              const body = iframe.contentDocument?.body;
              const firstChild = body?.firstElementChild as HTMLElement;
              const height = firstChild?.offsetHeight || body?.scrollHeight || 80;
              iframe.style.height = `${height}px`;
            } catch {
              iframe.style.height = '80px';
            }
          }}
        />
      )}

      {/* Main Content */}
      <main
        className="flex-1 py-4"
        style={{ backgroundColor: previewDocument?.formStyle?.contentAreaBgColor || 'transparent' }}
      >
        {showLanding ? (
          <UseCaseLandingPage
            useCases={resolvedUseCases}
            buttonColor={demo.buttonColor}
            onSelectUseCase={handleSelectUseCase}
          />
        ) : (
          <div className="max-w-xl mx-auto px-4">
            <div
              ref={formRef}
              className="p-8"
              style={{
                backgroundColor: previewDocument?.formStyle?.formBgColor || 'white',
                borderRadius: getFormBorderRadius(previewDocument?.formStyle?.formBorderRadius),
                boxShadow: getFormShadow(previewDocument?.formStyle?.formShadow),
                border: `${previewDocument?.formStyle?.formBorderWidth || '1'}px solid ${previewDocument?.formStyle?.formBorderColor || '#e5e7eb'}`,
              }}
            >
              {activeFormSteps.length > 0 ? (
                <DemoFlowRenderer
                  key={selectedUseCase ? selectedUseCase.linkId : demo.id}
                  steps={activeFormSteps}
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
                  <p>No form steps configured for this use case</p>
                  {selectedUseCase && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSelectedUseCase(null)}
                    >
                      ← Back to Use Cases
                    </Button>
                  )}
                </div>
              )}
            </div>
            {selectedUseCase && hasUseCases && (
              <div className="text-center mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUseCase(null)}
                >
                  ← Back to Use Cases
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mirrored Footer */}
      {hasMirroredFooter && previewDocument && (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { margin: 0; padding: 0; overflow: hidden; }
                  html { overflow: hidden; }
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
            const iframe = e.target as HTMLIFrameElement;
            try {
              const body = iframe.contentDocument?.body;
              const firstChild = body?.firstElementChild as HTMLElement;
              const height = firstChild?.offsetHeight || body?.scrollHeight || 200;
              iframe.style.height = `${height}px`;
            } catch {
              iframe.style.height = '200px';
            }
          }}
        />
      )}

      {/* Admin Exit Bar */}
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
          <div className="h-12" />
        </>
      )}
    </div>
  );
}
