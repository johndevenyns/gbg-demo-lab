import { useParams, Link } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback } from "react";
import { DemoFlowRenderer } from "@/components/preview/DemoFlowRenderer";
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from "@/components/preview/ResultPage";

export default function DemoPreview() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: demo, isLoading, error } = useDemoBySlug(slug || "");

  // Inject scraped CSS into the page
  useEffect(() => {
    if (demo?.scrapedCss) {
      const styleElement = document.createElement('style');
      styleElement.id = 'scraped-css';
      styleElement.textContent = demo.scrapedCss;
      document.head.appendChild(styleElement);

      return () => {
        const existingStyle = document.getElementById('scraped-css');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [demo?.scrapedCss]);

  const handleFlowComplete = useCallback((success: boolean, referenceId?: string) => {
    console.log('Flow complete:', { success, referenceId });
    // The result page handles the redirect via its button
  }, []);
  
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

  // Select active header/footer based on mirrorActiveMethod
  const activeMethod = demo.mirrorActiveMethod || 'html';
  const activeHeaderHtml = activeMethod === 'screenshot'
    ? demo.mirrorScreenshotHeaderHtml
    : demo.mirrorHtmlHeaderHtml;
  const activeFooterHtml = activeMethod === 'screenshot'
    ? demo.mirrorScreenshotFooterHtml
    : demo.mirrorHtmlFooterHtml;
  // Fallback to legacy fields if new fields are empty
  const hasScrapedHeader = (activeHeaderHtml && activeHeaderHtml.trim().length > 0)
    || (demo.scrapedHeaderHtml && demo.scrapedHeaderHtml.trim().length > 0);
  const hasScrapedFooter = (activeFooterHtml && activeFooterHtml.trim().length > 0)
    || (demo.scrapedFooterHtml && demo.scrapedFooterHtml.trim().length > 0);
  const finalHeaderHtml = (activeHeaderHtml && activeHeaderHtml.trim()) || demo.scrapedHeaderHtml || '';
  const finalFooterHtml = (activeFooterHtml && activeFooterHtml.trim()) || demo.scrapedFooterHtml || '';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Scraped Header/Nav or Fallback */}
      {hasScrapedHeader ? (
        <div 
          className="scraped-header"
          dangerouslySetInnerHTML={{ __html: finalHeaderHtml }} 
        />
      ) : (
        <header className="py-4 px-6" style={{ backgroundColor: demo.headerBgColor, color: demo.headerTextColor }}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {demo.logoUrl && <img src={demo.logoUrl} alt={demo.customerName} className="h-8" />}
            <span className="font-semibold text-lg">{demo.customerName}</span>
          </div>
        </header>
      )}
      
      {/* Main Content */}
      <main className="flex-1 bg-background py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
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

      {/* Scraped Footer */}
      {hasScrapedFooter && finalFooterHtml && (
        <div 
          className="scraped-footer"
          dangerouslySetInnerHTML={{ __html: finalFooterHtml }} 
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
