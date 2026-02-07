import { useState } from "react";
import { Code, Camera, Paintbrush, Check, Globe, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CaptureTab = 'html' | 'screenshot' | 'form-styling';
export type CaptureMode = 'html' | 'screenshot';
export type AppearanceTab = 'site' | 'form';

interface SiteMirrorTabsProps {
  activeMethod: CaptureMode;
  onActiveMethodChange: (method: CaptureMode) => void;
  currentTab: CaptureTab;
  onTabChange: (tab: CaptureTab) => void;
  htmlContent: React.ReactNode;
  screenshotContent: React.ReactNode;
  formStylingContent: React.ReactNode;
  htmlConfigured: boolean;
  screenshotConfigured: boolean;
  formStylingConfigured: boolean;
  sitePreviewContent?: React.ReactNode;
  embedFormContent?: React.ReactNode;
}

export function SiteMirrorTabs({
  activeMethod,
  onActiveMethodChange,
  currentTab,
  onTabChange,
  htmlContent,
  screenshotContent,
  formStylingContent,
  htmlConfigured,
  screenshotConfigured,
  formStylingConfigured,
  sitePreviewContent,
  embedFormContent,
}: SiteMirrorTabsProps) {
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab>('site');
  const [siteSubTab, setSiteSubTab] = useState<'html' | 'screenshot'>('html');
  
  const siteConfigured = htmlConfigured || screenshotConfigured;

  return (
    <div className="space-y-6">
      {/* Top-level Appearance Tabs: Site & Form */}
      <Tabs value={appearanceTab} onValueChange={(v) => setAppearanceTab(v as AppearanceTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="site" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Site
            {siteConfigured && <Check className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="form" className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Form
            {formStylingConfigured && <Check className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
        </TabsList>
        
        {/* Site Tab Content */}
        <TabsContent value="site" className="mt-6 space-y-6">
          {/* Live Site Preview - Always visible at top */}
          {sitePreviewContent}

          {/* Active Method Selector */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <Label className="text-base font-semibold mb-3 block">Active Fetch Method</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which method will be used for the live demo. You can configure both methods below.
            </p>
            <RadioGroup 
              value={activeMethod} 
              onValueChange={(v) => onActiveMethodChange(v as CaptureMode)}
              className="flex flex-col sm:flex-row gap-3"
            >
              <label 
                htmlFor="active-html" 
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all flex-1",
                  activeMethod === 'html' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="html" id="active-html" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Code className="w-4 h-4" />
                    HTML/CSS Fetch
                    {htmlConfigured && (
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interactive HTML header/footer with extracted CSS
                  </p>
                </div>
              </label>
              
              <label 
                htmlFor="active-screenshot" 
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all flex-1",
                  activeMethod === 'screenshot' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="screenshot" id="active-screenshot" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Camera className="w-4 h-4" />
                    Screenshot Fetch
                    {screenshotConfigured && (
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visual screenshot of header/footer regions
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Sub-tabs for HTML/Screenshot Setup */}
          <Tabs value={siteSubTab} onValueChange={(v) => setSiteSubTab(v as 'html' | 'screenshot')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="html" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                HTML/CSS Setup
                {htmlConfigured && <Check className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Screenshot Setup
                {screenshotConfigured && <Check className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="html" className="mt-4">
              {htmlContent}
            </TabsContent>
            
            <TabsContent value="screenshot" className="mt-4">
              {screenshotContent}
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Form Tab Content */}
        <TabsContent value="form" className="mt-6 space-y-6">
          {formStylingContent}
          {embedFormContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}