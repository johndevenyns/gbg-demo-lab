import { useParams, useNavigate } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { Loader2 } from "lucide-react";
import { useEffect, useCallback } from "react";
import { DemoFlowRenderer } from "@/components/preview/DemoFlowRenderer";
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from "@/components/preview/ResultPage";

export default function DemoPreview() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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

  const hasScrapedHeader = demo.scrapedHeaderHtml && demo.scrapedHeaderHtml.trim().length > 0;
  const hasScrapedFooter = demo.scrapedFooterHtml && demo.scrapedFooterHtml.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Scraped Header/Nav or Fallback */}
      {hasScrapedHeader ? (
        <div 
          className="scraped-header"
          dangerouslySetInnerHTML={{ __html: demo.scrapedHeaderHtml }} 
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
      {hasScrapedFooter && (
        <div 
          className="scraped-footer"
          dangerouslySetInnerHTML={{ __html: demo.scrapedFooterHtml }} 
        />
      )}
    </div>
  );
}
