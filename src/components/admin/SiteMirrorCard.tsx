 import { useState } from "react";
 import { Globe, X } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { SiteMirrorTabs, CaptureTab, CaptureMode } from "./SiteMirrorTabs";
 import { HtmlCaptureTab } from "./HtmlCaptureTab";
 import { ScreenshotCaptureTab } from "./ScreenshotCaptureTab";
 import { useToast } from "@/hooks/use-toast";
 import { DemoEnvironment } from "@/types/demo";
 import { DEFAULT_FORM_STYLE } from "@/types/formStyle";

 export type { CaptureMode } from "./SiteMirrorTabs";
 
 interface SiteMirrorCardProps {
   demo: DemoEnvironment;
   onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
   formStyleContent?: React.ReactNode;
 }
 
 export function SiteMirrorCard({ demo, onApplyBranding, formStyleContent }: SiteMirrorCardProps) {
   const { toast } = useToast();
   const [url, setUrl] = useState(demo.customerSiteUrl || "");
   
  // Track which method is active for the demo (persisted) AND which tab user is viewing
  const [activeMethod, setActiveMethod] = useState<CaptureMode>(demo.mirrorActiveMethod || 'html');
   const [currentTab, setCurrentTab] = useState<CaptureTab>('html');
   
   // Determine if each method is configured based on content type
  const htmlConfigured = Boolean(demo.mirrorHtmlHeaderHtml && demo.mirrorHtmlHeaderHtml.trim().length > 0);
  const screenshotConfigured = Boolean(demo.mirrorScreenshotHeaderHtml && demo.mirrorScreenshotHeaderHtml.trim().length > 0);
   const formStylingConfigured = Boolean(demo.formStyle && demo.formStyle.source !== 'template');

  const handleActiveMethodChange = (method: CaptureMode) => {
    setActiveMethod(method);
    // Persist the active method to the database
    onApplyBranding({ mirrorActiveMethod: method }, true);
  };
 
   const handleClearMirror = () => {
     const updates: Partial<DemoEnvironment> = {
       scrapedHeaderHtml: '',
       scrapedFooterHtml: '',
       scrapedCss: '',
      mirrorHtmlHeaderHtml: '',
      mirrorHtmlFooterHtml: '',
      mirrorHtmlCss: '',
      mirrorScreenshotHeaderHtml: '',
      mirrorScreenshotFooterHtml: '',
      mirrorScreenshotCss: '',
       ...(demo.formStyle?.source === 'mirrored' && { formStyle: { ...DEFAULT_FORM_STYLE, source: 'template' } }),
     };
     onApplyBranding(updates, true);
     toast({ title: "Mirror Cleared", description: "Scraped branding has been cleared." });
   };
 
   const handleApplyBranding = (updates: Partial<DemoEnvironment>) => {
     onApplyBranding(updates, true);
   };
 
   return (
     <Card className="glass-card">
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
            <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Configure site branding and form styling
              </CardDescription>
           </div>
           {(htmlConfigured || screenshotConfigured) && (
             <Button
               variant="outline"
               size="sm"
               onClick={handleClearMirror}
               className="text-destructive hover:text-destructive"
             >
               <X className="w-4 h-4 mr-2" />
               Clear All
             </Button>
           )}
         </div>
       </CardHeader>
       <CardContent>
         <SiteMirrorTabs
           activeMethod={activeMethod}
          onActiveMethodChange={handleActiveMethodChange}
           currentTab={currentTab}
           onTabChange={setCurrentTab}
           htmlConfigured={htmlConfigured}
           screenshotConfigured={screenshotConfigured}
           htmlContent={
             <HtmlCaptureTab
               demo={demo}
               url={url}
               onUrlChange={setUrl}
               onApply={handleApplyBranding}
               isConfigured={htmlConfigured}
             />
           }
           screenshotContent={
             <ScreenshotCaptureTab
               demo={demo}
               url={url}
               onUrlChange={setUrl}
               onApply={handleApplyBranding}
               isConfigured={screenshotConfigured}
             />
           }
           formStylingContent={formStyleContent}
           formStylingConfigured={formStylingConfigured}
         />
       </CardContent>
     </Card>
   );
 }