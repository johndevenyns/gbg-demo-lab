import { useState, useMemo } from "react";
import { Globe, Loader2, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { scrapingApi, ScrapedBranding } from "@/lib/api/scraping";
import { useToast } from "@/hooks/use-toast";
import { DemoEnvironment } from "@/types/demo";
import { DEFAULT_FORM_STYLE } from "@/types/formStyle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SiteMirrorCardProps {
  demo: DemoEnvironment;
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

// Generate form preview HTML for the iframe
function generateFormPreviewHtml(demo: DemoEnvironment): string {
  const style = demo.formStyle || DEFAULT_FORM_STYLE;
  const buttonColor = demo.buttonColor || '#3B82F6';
  
  // Get the first form step's fields (or show placeholder if none)
  const formSteps = demo.formSteps?.filter(s => s.stepType === 'form') || [];
  const firstFormStep = formSteps[0];
  
  // Build field HTML
  let fieldsHtml = '';
  if (firstFormStep?.fields && firstFormStep.fields.length > 0) {
    firstFormStep.fields.forEach(field => {
      fieldsHtml += `
        <div style="margin-bottom: 16px;">
          <label style="
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: ${style.labelColor || '#333'};
            font-size: 14px;
          ">
            ${field.label}${field.required ? '<span style="color: #ef4444; margin-left: 4px;">*</span>' : ''}
          </label>
          <input 
            type="${field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}"
            placeholder="${field.placeholder || ''}"
            style="
              width: 100%;
              padding: 10px 14px;
              border: 1px solid ${style.inputBorderColor || '#d1d5db'};
              border-radius: 8px;
              font-size: 14px;
              background: ${style.inputBgColor || '#ffffff'};
              color: ${style.inputTextColor || '#1f2937'};
              outline: none;
            "
          />
        </div>
      `;
    });
  } else {
    fieldsHtml = `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #333; font-size: 14px;">
          First Name<span style="color: #ef4444; margin-left: 4px;">*</span>
        </label>
        <input type="text" placeholder="John" style="width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; outline: none;" />
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #333; font-size: 14px;">
          Last Name<span style="color: #ef4444; margin-left: 4px;">*</span>
        </label>
        <input type="text" placeholder="Smith" style="width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; outline: none;" />
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #333; font-size: 14px;">
          Email<span style="color: #ef4444; margin-left: 4px;">*</span>
        </label>
        <input type="email" placeholder="john@example.com" style="width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; outline: none;" />
      </div>
    `;
  }

  const stepTitle = firstFormStep?.title || 'Application Form';
  const totalSteps = formSteps.length || 1;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 0; font-family: ${style.fontFamily || 'system-ui, sans-serif'}; }
          * { box-sizing: border-box; }
        </style>
        ${demo.scrapedCss ? `<style>${demo.scrapedCss}</style>` : ''}
      </head>
      <body>
        ${demo.scrapedHeaderHtml || ''}
        <div style="padding: 40px 20px; background: #f5f5f5; min-height: 300px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1f2937;">${stepTitle}</h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Step 1 of ${totalSteps}</p>
            </div>
            ${fieldsHtml}
            <button style="
              width: 100%;
              padding: 12px 24px;
              background: ${buttonColor};
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              margin-top: 8px;
            ">
              Continue
            </button>
          </div>
        </div>
        ${demo.scrapedFooterHtml || ''}
      </body>
    </html>
  `;
}

export function SiteMirrorCard({ demo, onApplyBranding }: SiteMirrorCardProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState(demo.customerSiteUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedBranding | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleMirror = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to mirror",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setScrapedData(null);

    try {
      const response = await scrapingApi.scrapeSiteBranding(url);

      if (response.success && response.data) {
        setScrapedData(response.data);
        setShowPreview(true);
        toast({
          title: "Site Scraped",
          description: "Preview the extracted branding below",
        });
      } else {
        toast({
          title: "Scraping Failed",
          description: response.error || "Could not extract branding from the site",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error scraping site:", error);
      toast({
        title: "Error",
        description: "Failed to scrape site. Make sure the Firecrawl connector is enabled.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!scrapedData) return;

    const updates: Partial<DemoEnvironment> = {
      customerSiteUrl: url,
      logoUrl: scrapedData.logoUrl || demo.logoUrl,
      headerBgColor: scrapedData.colors.headerBgColor,
      headerTextColor: scrapedData.colors.headerTextColor,
      buttonColor: scrapedData.colors.buttonColor,
      scrapedHeaderHtml: scrapedData.headerHtml,
      scrapedFooterHtml: scrapedData.footerHtml,
      scrapedCss: scrapedData.cssContent,
    };

    // Pass true to indicate this should auto-save
    onApplyBranding(updates, true);

    setShowPreview(false);
    toast({
      title: "Branding Applied & Saving...",
      description: "The scraped branding, CSS, and layout are being saved",
    });
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Site Mirror
          </CardTitle>
          <CardDescription>
            Scrape header, footer, and branding from a customer's website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label>Customer Website URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleMirror}
              disabled={isLoading || !url.trim()}
              className="gradient-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mirroring...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Mirror Site
                </>
              )}
            </Button>
            
            {demo.customerSiteUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(demo.customerSiteUrl, '_blank')}
                title="Open original site"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>

          {demo.scrapedHeaderHtml && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  ✓ Header and footer already mirrored from{" "}
                  <a 
                    href={demo.customerSiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {demo.customerSiteUrl}
                  </a>
                </p>
              </div>

              {/* Preview Mirrored Branding */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Preview Mirrored Branding</Label>
                <div className="border rounded-lg overflow-hidden bg-white">
                  {/* Render scraped header with CSS in iframe for isolation */}
                  <iframe
                    srcDoc={generateFormPreviewHtml(demo)}
                    className="w-full h-[500px] border-0"
                    title="Mirrored branding preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Scraped Branding</DialogTitle>
            <DialogDescription>
              Review the extracted branding from {url}
            </DialogDescription>
          </DialogHeader>

          {scrapedData && (
            <div className="space-y-6">
              {/* Screenshot Preview */}
              {scrapedData.screenshot && (
                <div className="space-y-2">
                  <Label>Site Screenshot</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`data:image/png;base64,${scrapedData.screenshot}`}
                      alt="Site screenshot"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Colors Preview */}
              <div className="space-y-2">
                <Label>Extracted Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div
                      className="h-12 rounded-lg border"
                      style={{ backgroundColor: scrapedData.colors.headerBgColor }}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Header BG: {scrapedData.colors.headerBgColor}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div
                      className="h-12 rounded-lg border flex items-center justify-center text-lg font-bold"
                      style={{ 
                        backgroundColor: scrapedData.colors.headerBgColor,
                        color: scrapedData.colors.headerTextColor 
                      }}
                    >
                      Aa
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Text: {scrapedData.colors.headerTextColor}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div
                      className="h-12 rounded-lg border"
                      style={{ backgroundColor: scrapedData.colors.buttonColor }}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Button: {scrapedData.colors.buttonColor}
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Preview */}
              {scrapedData.logoUrl && (
                <div className="space-y-2">
                  <Label>Detected Logo</Label>
                  <div className="p-4 bg-muted rounded-lg inline-block">
                    <img
                      src={scrapedData.logoUrl}
                      alt="Logo"
                      className="max-h-16 max-w-[200px] object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Header Preview */}
              {scrapedData.headerHtml && (
                <div className="space-y-2">
                  <Label>Extracted Header HTML</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {scrapedData.headerHtml.substring(0, 500)}
                      {scrapedData.headerHtml.length > 500 && "..."}
                    </pre>
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              {scrapedData.footerHtml && (
                <div className="space-y-2">
                  <Label>Extracted Footer HTML</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {scrapedData.footerHtml.substring(0, 500)}
                      {scrapedData.footerHtml.length > 500 && "..."}
                    </pre>
                  </div>
                </div>
              )}

              {/* CSS Preview */}
              {scrapedData.cssContent && (
                <div className="space-y-2">
                  <Label>Extracted CSS ({scrapedData.cssContent.length} chars)</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {scrapedData.cssContent.substring(0, 500)}
                      {scrapedData.cssContent.length > 500 && "..."}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApply} className="gradient-primary">
              <Check className="w-4 h-4 mr-2" />
              Apply Branding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
