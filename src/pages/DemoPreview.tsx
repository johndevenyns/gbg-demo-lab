import { useParams } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function DemoPreview() {
  const { slug } = useParams<{ slug: string }>();
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
            <h1 className="text-2xl font-bold mb-6">Start Your Application</h1>
            
            {demo.formSteps.length > 0 && (
              <div className="space-y-4">
                {demo.formSteps[0].fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive">*</span>}</label>
                    <input 
                      type="text"
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <button 
              className="w-full mt-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: demo.buttonColor }}
            >
              Continue
            </button>
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
