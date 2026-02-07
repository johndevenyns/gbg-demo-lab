import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Eye, Loader2, Settings, Globe, Palette, Layout, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useDemo, useUpdateDemo } from "@/hooks/useDemos";
import { DemoEnvironment } from "@/types/demo";
import { FormStyleConfig, DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { SiteMirrorCard } from "@/components/admin/SiteMirrorCard";
import { FormBuilderSection } from "@/components/formBuilder";

 // Lazy import FormStyleCard to pass into SiteMirrorCard
 import { FormStyleCard } from "@/components/admin/FormStyleCard";
import { FormPreviewPanel } from "@/components/formBuilder/FormPreviewPanel";
import { LogoUploadSection } from "@/components/admin/LogoUploadSection";
import { BrandingScrapeSection } from "@/components/admin/BrandingScrapeSection";
import { cn } from "@/lib/utils";

// Navigation sections
type ConfigSection = 'settings' | 'mirror' | 'branding' | 'form-builder' | 'preview';

const sections: { id: ConfigSection; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'settings', label: 'Site Settings', icon: Settings, description: 'Core configuration' },
  { id: 'mirror', label: 'Appearance', icon: Globe, description: 'Site & form styling' },
  { id: 'branding', label: 'Branding', icon: Palette, description: 'Colors & logo' },
  { id: 'form-builder', label: 'Form Builder', icon: Layout, description: 'Steps & fields' },
  { id: 'preview', label: 'Live Preview', icon: PlayCircle, description: 'Test the flow' },
];

// Site Settings Section
function SiteSettingsSection({ demo, onUpdate }: { demo: DemoEnvironment; onUpdate: (updates: Partial<DemoEnvironment>) => void }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>Core configuration for this demo environment</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Customer Name</Label>
          <Input value={demo.customerName} onChange={(e) => onUpdate({ customerName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Reference ID Prefix</Label>
          <Input value={demo.referenceIdPrefix || ""} onChange={(e) => onUpdate({ referenceIdPrefix: e.target.value })} />
        </div>
        <div className="md:col-span-2 flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label>Active</Label>
            <p className="text-sm text-muted-foreground">Demo is accessible to users</p>
          </div>
          <Switch checked={demo.isActive} onCheckedChange={(v) => onUpdate({ isActive: v })} />
        </div>
      </CardContent>
    </Card>
  );
}

// Branding Section
function BrandingSection({ demo, onUpdate }: { demo: DemoEnvironment; onUpdate: (updates: Partial<DemoEnvironment>) => void }) {
  return (
    <div className="space-y-6">
      {/* Capture from Website */}
      <BrandingScrapeSection demo={demo} onUpdate={onUpdate} />
      
      {/* Logo Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Upload a logo or link to an external image</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploadSection demo={demo} onUpdate={onUpdate} />
        </CardContent>
      </Card>
      
      {/* Colors Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Colors</CardTitle>
          <CardDescription>Customize the color scheme of the verification interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Header Background</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={demo.headerBgColor} onChange={(e) => onUpdate({ headerBgColor: e.target.value })} className="color-picker-swatch" />
                <Input value={demo.headerBgColor} onChange={(e) => onUpdate({ headerBgColor: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Header Text</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={demo.headerTextColor} onChange={(e) => onUpdate({ headerTextColor: e.target.value })} className="color-picker-swatch" />
                <Input value={demo.headerTextColor} onChange={(e) => onUpdate({ headerTextColor: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={demo.buttonColor} onChange={(e) => onUpdate({ buttonColor: e.target.value })} className="color-picker-swatch" />
                <Input value={demo.buttonColor} onChange={(e) => onUpdate({ buttonColor: e.target.value })} className="font-mono" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DemoConfig() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: demo, isLoading, error } = useDemo(id || "");
  const updateDemoMutation = useUpdateDemo();
  
  // Get active section from URL or default to 'settings'
  const activeSection = (searchParams.get('section') as ConfigSection) || 'settings';
  
  const setActiveSection = (section: ConfigSection) => {
    setSearchParams({ section });
  };
  
  // Local state for form fields
  const [localDemo, setLocalDemo] = useState<DemoEnvironment | null>(null);
  
  // Sync local state when demo loads
  useEffect(() => {
    if (demo) {
      setLocalDemo(demo);
    }
  }, [demo]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !demo || !localDemo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Demo not found</h2>
            <Button onClick={() => navigate("/admin")} variant="outline">Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<DemoEnvironment>, autoSave?: boolean) => {
    setLocalDemo(prev => {
      const newDemo = prev ? { ...prev, ...updates } : null;
      
      // If autoSave flag is set, save immediately with the new data
      if (autoSave && newDemo) {
        updateDemoMutation.mutate({ id: newDemo.id, updates });
      }
      
      return newDemo;
    });
  };

  const handleSave = () => {
    if (!localDemo) return;
    updateDemoMutation.mutate({ id: localDemo.id, updates: localDemo });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'settings':
        return <SiteSettingsSection demo={localDemo} onUpdate={handleUpdate} />;
      case 'mirror':
        return (
         <SiteMirrorCard 
           demo={localDemo} 
           onApplyBranding={handleUpdate}
           formStyleContent={
              <FormStyleCard
                demo={localDemo}
                formStyle={localDemo.formStyle || DEFAULT_FORM_STYLE}
                onUpdateStyle={(style: FormStyleConfig) => handleUpdate({ formStyle: style })}
                onUpdateButtonColor={(color: string) => handleUpdate({ buttonColor: color })}
              />
           }
         />
        );
      case 'branding':
        return <BrandingSection demo={localDemo} onUpdate={handleUpdate} />;
      case 'form-builder':
        return <FormBuilderSection demo={localDemo} onUpdate={handleUpdate} />;
      case 'preview':
        return <FormPreviewPanel demo={localDemo} />;
      default:
        return <SiteSettingsSection demo={localDemo} onUpdate={handleUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{localDemo.customerName}</h1>
                <p className="text-sm text-muted-foreground font-mono">/demo/{localDemo.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(`/demo/${localDemo.slug}`)}>
                <Eye className="w-4 h-4 mr-2" />Preview
              </Button>
              <Button onClick={handleSave} disabled={updateDemoMutation.isPending} className="gradient-primary">
                {updateDemoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-border bg-card/30 flex-shrink-0 hidden md:block">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", isActive && "text-primary")} />
                  <div className="min-w-0">
                    <div className={cn("font-medium text-sm", isActive && "text-primary")}>
                      {section.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {section.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Section Selector */}
        <div className="md:hidden border-b border-border bg-card/30 p-2 overflow-x-auto">
          <div className="flex gap-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-5xl">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
