import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Eye, Loader2, Settings, Globe, Palette, Calendar, User, PanelLeftClose, PanelLeft, Copy, ExternalLink, Briefcase, Users, MoreVertical, Archive, CopyPlus, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo, useUpdateDemo } from "@/hooks/useDemos";
import { DemoEnvironment } from "@/types/demo";
import { FormStyleConfig, DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { SiteMirrorCard } from "@/components/admin/SiteMirrorCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UseCaseSection } from "@/components/admin/UseCaseSection";
import { useDemoUseCaseLinks } from "@/hooks/useUseCases";
import { useEnabledPortalTypes } from "@/hooks/usePortalTypes";

import { FormStyleCard } from "@/components/admin/FormStyleCard";

import { LogoUploadSection } from "@/components/admin/LogoUploadSection";
import { BrandingScrapeSection } from "@/components/admin/BrandingScrapeSection";
import { cn } from "@/lib/utils";
import { DemoUserManagement } from "@/components/admin/DemoUserManagement";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SaveAsNewDemoDialog } from "@/components/admin/SaveAsNewDemoDialog";
import { SaveAsIndustryDialog } from "@/components/admin/SaveAsIndustryDialog";
import { ArchiveDemoDialog } from "@/components/admin/ArchiveDemoDialog";

// Navigation sections
type ConfigSection = 'settings' | 'mirror' | 'branding' | 'use-cases' | 'users';

const sections: { id: ConfigSection; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'settings', label: 'Site Settings', icon: Settings, description: 'Core configuration' },
  { id: 'mirror', label: 'Appearance', icon: Globe, description: 'Site & form styling' },
  { id: 'branding', label: 'Mobile Branding', icon: Palette, description: 'Colors & logo' },
  { id: 'use-cases', label: 'Use Cases', icon: Briefcase, description: 'Journeys & workflow builder' },
  { id: 'users', label: 'Demo Users', icon: Users, description: 'Manage demo user accounts' },
];

// Site Settings Section
function SiteSettingsSection({ demo, onUpdate, portalTypes }: { demo: DemoEnvironment; onUpdate: (updates: Partial<DemoEnvironment>) => void; portalTypes: { typeKey: string; displayName: string; description?: string }[] }) {
  const { toast } = useToast();
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const publicUrl = `${window.location.origin}/demo/${demo.slug}`;

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: "URL copied", description: "Public demo URL copied to clipboard." });
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Site Settings</CardTitle>
              <CardDescription>Core configuration for this demo environment</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{demo.isActive ? 'Active' : 'Inactive'}</span>
              <Switch checked={demo.isActive} onCheckedChange={(v) => onUpdate({ isActive: v })} />
            </div>
          </div>
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
          <div className="md:col-span-2 space-y-2">
            <Label>Public Demo URL</Label>
            <p className="text-xs text-muted-foreground">Share this link with anyone — no login required</p>
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-sm flex-1" />
              <Button variant="outline" size="icon" onClick={copyPublicUrl} title="Copy URL">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.open(publicUrl, '_blank')} title="Open in new tab">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Landing Page Heading</Label>
            <p className="text-xs text-muted-foreground">Heading shown above use case tabs (leave empty for global default)</p>
            <Input
              value={demo.landingHeading || ''}
              onChange={(e) => onUpdate({ landingHeading: e.target.value || undefined })}
              placeholder="Access Your Account"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Portal Type</Label>
            <p className="text-xs text-muted-foreground">Choose whether this demo includes a simulated portal for logged-in users</p>
            <Select value={demo.portalType || 'none'} onValueChange={(v) => onUpdate({ portalType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <span>No Portal</span>
                    <span className="text-muted-foreground text-xs">— Verification landing pages only</span>
                  </div>
                </SelectItem>
                {portalTypes.map(pt => (
                  <SelectItem key={pt.typeKey} value={pt.typeKey}>
                    <div className="flex items-center gap-2">
                      <span>{pt.displayName}</span>
                      {pt.description && <span className="text-muted-foreground text-xs">— {pt.description}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Metadata card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 shrink-0" />
              <span>Created by:</span>
              <span className="text-foreground font-medium truncate">{demo.createdByEmail || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Created:</span>
              <span className="text-foreground font-medium">{formatDate(demo.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
  const { user } = useAuth();
  const { data: demo, isLoading, error } = useDemo(id || "");
  const updateDemoMutation = useUpdateDemo();
  const { data: useCaseLinks = [] } = useDemoUseCaseLinks(id);
  const { data: portalTypes = [] } = useEnabledPortalTypes();
  
  // Per-user localStorage key for sidebar state
  const sidebarKey = user?.id ? `demoConfigSidebarCollapsed_${user.id}` : 'demoConfigSidebarCollapsed';
  
  // Get active section from URL or default to 'settings'
  const activeSection = (searchParams.get('section') as ConfigSection) || 'settings';
  
  const setActiveSection = (section: ConfigSection) => {
    setSearchParams({ section });
  };
  
  // Sidebar collapsed state (persisted per user)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(sidebarKey);
    return stored !== null ? stored === 'true' : true;
  });
  
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(sidebarKey, String(next));
      return next;
    });
  };
  
  // Lifecycle dialog states
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showIndustryDialog, setShowIndustryDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    if (!localDemo) return;
    setArchiving(true);
    try {
      await updateDemoMutation.mutateAsync({ id: localDemo.id, updates: { isActive: false } });
      toast({ title: "Demo archived", description: `${localDemo.customerName} has been archived.` });
      setShowArchiveDialog(false);
      navigate('/admin');
    } catch {
      toast({ title: "Error", description: "Failed to archive demo." });
    } finally {
      setArchiving(false);
    }
  };

  // Local state for form fields
  const [localDemo, setLocalDemo] = useState<DemoEnvironment | null>(null);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveTimestampRef = useRef<number>(0);
  const initialLoadRef = useRef(true);
  
  // Sync local state when demo loads — but only on first load or when
  // the server data is newer than our last save (avoids overwriting local edits)
  useEffect(() => {
    if (demo) {
      if (initialLoadRef.current) {
        setLocalDemo(demo);
        initialLoadRef.current = false;
      }
      // Don't overwrite local state on refetches — our auto-save is the source of truth
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

  // Auto-save: debounce updates to avoid excessive writes
  const handleUpdate = (updates: Partial<DemoEnvironment>) => {
    setLocalDemo(prev => prev ? { ...prev, ...updates } : null);
    
    // Clear any pending save
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    
    // Debounce save by 800ms
    pendingSaveRef.current = setTimeout(() => {
      setLocalDemo(current => {
        if (current) {
          lastSaveTimestampRef.current = Date.now();
          updateDemoMutation.mutate({ id: current.id, updates: current });
        }
        return current;
      });
    }, 800);
  };

  const handleSave = () => {
    // Clear any pending debounce and save immediately
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    if (!localDemo) return;
    lastSaveTimestampRef.current = Date.now();
    updateDemoMutation.mutate({ id: localDemo.id, updates: localDemo });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'settings':
        return <SiteSettingsSection demo={localDemo} onUpdate={handleUpdate} portalTypes={portalTypes} />;
      case 'mirror':
        return (
         <SiteMirrorCard 
            demo={localDemo}
            useCaseLinks={useCaseLinks}
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
      case 'use-cases':
        return <UseCaseSection demoId={localDemo.id} demo={localDemo} onUpdateDemo={handleUpdate} />;
      case 'users':
        return <DemoUserManagement demoId={localDemo.id} demoName={localDemo.customerName} demoSlug={localDemo.slug} />;
      default:
        return <SiteSettingsSection demo={localDemo} onUpdate={handleUpdate} portalTypes={portalTypes} />;
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
              <Button onClick={handleSave} disabled={updateDemoMutation.isPending} variant="outline">
                {updateDemoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {updateDemoMutation.isPending ? 'Saving...' : 'Save Now'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowCloneDialog(true)}>
                    <CopyPlus className="w-4 h-4 mr-2" />Save as New Demo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowIndustryDialog(true)}>
                    <Factory className="w-4 h-4 mr-2" />Save as Industry
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowArchiveDialog(true)} className="text-destructive focus:text-destructive">
                    <Archive className="w-4 h-4 mr-2" />Archive Demo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <TooltipProvider delayDuration={0}>
          <aside className={cn(
            "border-r border-border bg-card/30 flex-shrink-0 hidden md:flex flex-col transition-all duration-200",
            sidebarCollapsed ? "w-14" : "w-48"
          )}>
            <nav className="flex-1 p-2 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg transition-all",
                          sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 text-left",
                          isActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                        {!sidebarCollapsed && (
                          <span className={cn("text-sm font-medium truncate", isActive && "text-primary")}>
                            {section.label}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    {sidebarCollapsed && (
                      <TooltipContent side="right" className="text-xs">
                        {section.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>
            <div className="p-2 border-t border-border">
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
              >
                {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>
          </aside>
        </TooltipProvider>

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
          <div className="p-6 lg:p-8">
            {renderSection()}
          </div>
        </main>
      </div>

      {/* Lifecycle Dialogs */}
      <SaveAsNewDemoDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        demo={localDemo}
        useCaseLinks={useCaseLinks}
        onSuccess={(newId) => navigate(`/admin/demo/${newId}`)}
      />
      <SaveAsIndustryDialog
        open={showIndustryDialog}
        onOpenChange={setShowIndustryDialog}
        demo={localDemo}
        useCaseLinks={useCaseLinks}
        onSuccess={() => {}}
      />
      <ArchiveDemoDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        demoName={localDemo.customerName}
        saving={archiving}
        onConfirm={handleArchive}
      />
    </div>
  );
}
