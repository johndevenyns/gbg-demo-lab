import { useState } from "react";
import { Globe, Loader2, ExternalLink, Check, ImageIcon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { scrapingApi, ScrapedBranding } from "@/lib/api/scraping";
import { useToast } from "@/hooks/use-toast";
import { DemoEnvironment } from "@/types/demo";

interface BrandingScrapeProps {
  demo: DemoEnvironment;
  onUpdate: (updates: Partial<DemoEnvironment>) => void;
}

export function BrandingScrapeSection({ demo, onUpdate }: BrandingScrapeProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedBranding | null>(null);
  
  // Track which items to apply
  const [applyLogo, setApplyLogo] = useState(true);
  const [applyColors, setApplyColors] = useState(true);

  const handleFetch = async () => {
    if (!url.trim()) {
      toast({ title: "URL Required", description: "Please enter a website URL", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await scrapingApi.scrapeSiteBranding(url);
      if (response.success && response.data) {
        setScrapedData(response.data);
        toast({ title: "Branding Fetched", description: "Logo and colors extracted successfully" });
      } else {
        toast({ title: "Fetch Failed", description: response.error || "Could not extract branding", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
      toast({ title: "Error", description: "Failed to fetch branding. Check Firecrawl connector.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!scrapedData) return;

    const updates: Partial<DemoEnvironment> = {};

    if (applyLogo && scrapedData.logoUrl) {
      updates.logoUrl = scrapedData.logoUrl;
      updates.useUploadedLogo = false; // Switch to linked logo
    }

    if (applyColors) {
      updates.headerBgColor = scrapedData.colors.headerBgColor;
      updates.headerTextColor = scrapedData.colors.headerTextColor;
      updates.buttonColor = scrapedData.colors.buttonColor;
    }

    onUpdate(updates);
    toast({ 
      title: "Branding Applied", 
      description: `${applyLogo && scrapedData.logoUrl ? 'Logo' : ''}${applyLogo && scrapedData.logoUrl && applyColors ? ' and ' : ''}${applyColors ? 'Colors' : ''} have been updated` 
    });
    setScrapedData(null); // Clear preview after applying
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Fetch from Website
        </CardTitle>
        <CardDescription>
          Extract logo and colors automatically from any website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label>Website URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleFetch} disabled={isLoading || !url.trim()}>
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching...</>
            ) : (
              <><Globe className="w-4 h-4 mr-2" />Fetch Branding</>
            )}
          </Button>
          {url && (
            <Button variant="outline" size="icon" onClick={() => window.open(url, '_blank')} title="Open site">
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Scraped Data Preview */}
        {scrapedData && (
          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="text-base font-semibold">Extracted Branding</Label>

            {/* URLs Fetched Info */}
            {scrapedData.fetchedUrls && scrapedData.fetchedUrls.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/30 border text-xs space-y-1">
                <p className="font-medium text-muted-foreground">URLs fetched:</p>
                {scrapedData.fetchedUrls.map((fetchedUrl, idx) => (
                  <p key={idx} className="font-mono text-muted-foreground truncate">
                    {idx + 1}. {fetchedUrl}
                  </p>
                ))}
              </div>
            )}

            {/* Logo Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Logo
                </Label>
                {scrapedData.logoUrl && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyLogo}
                      onChange={(e) => setApplyLogo(e.target.checked)}
                      className="rounded border-border"
                    />
                    Apply
                  </label>
                )}
              </div>
              {scrapedData.logoUrl ? (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
                  <div className="w-16 h-16 rounded-lg border bg-background flex items-center justify-center overflow-hidden p-2">
                    <img 
                      src={scrapedData.logoUrl} 
                      alt="Extracted logo" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Logo Found</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{scrapedData.logoUrl}</p>
                    {scrapedData.logoFoundAt && scrapedData.logoFoundAt !== scrapedData.sourceUrl && (
                      <p className="text-xs text-warning mt-1">Found via fallback: {scrapedData.logoFoundAt}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/30 border border-dashed text-center text-sm text-muted-foreground">
                  No logo detected on this page or root domain
                </div>
              )}
            </div>

            {/* Colors Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Colors
                </Label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyColors}
                    onChange={(e) => setApplyColors(e.target.checked)}
                    className="rounded border-border"
                  />
                  Apply
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50 border">
                <div className="space-y-1">
                  <div 
                    className="h-12 rounded-lg border shadow-sm" 
                    style={{ backgroundColor: scrapedData.colors.headerBgColor }} 
                  />
                  <p className="text-xs text-muted-foreground text-center">Header BG</p>
                  <p className="text-xs font-mono text-center">{scrapedData.colors.headerBgColor}</p>
                </div>
                <div className="space-y-1">
                  <div 
                    className="h-12 rounded-lg border shadow-sm flex items-center justify-center text-sm font-bold"
                    style={{ 
                      backgroundColor: scrapedData.colors.headerBgColor, 
                      color: scrapedData.colors.headerTextColor 
                    }}
                  >
                    Aa
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Text</p>
                  <p className="text-xs font-mono text-center">{scrapedData.colors.headerTextColor}</p>
                </div>
                <div className="space-y-1">
                  <div 
                    className="h-12 rounded-lg border shadow-sm" 
                    style={{ backgroundColor: scrapedData.colors.buttonColor }} 
                  />
                  <p className="text-xs text-muted-foreground text-center">Button</p>
                  <p className="text-xs font-mono text-center">{scrapedData.colors.buttonColor}</p>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleApply} 
                disabled={!applyLogo && !applyColors}
                className="gradient-primary"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Selected
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
