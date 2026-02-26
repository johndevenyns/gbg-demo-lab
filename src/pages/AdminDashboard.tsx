import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Settings, ExternalLink, Trash2, Copy, Building2, Car, Gamepad2, Shield, Landmark, Layers, Heart, ShoppingBag, ImageOff, LogOut } from "lucide-react";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemos, useDeleteDemo } from "@/hooks/useDemos";
import { useAuth } from "@/hooks/useAuth";
import { IndustryTemplate } from "@/types/demo";
import { CreateDemoDialog } from "@/components/admin/CreateDemoDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCodeGeneratorDialog } from "@/components/admin/QrCodeGeneratorDialog";

const industryIcons: Record<IndustryTemplate, React.ReactNode> = {
  bank: <Landmark className="w-5 h-5" />,
  rental_car: <Car className="w-5 h-5" />,
  online_gambling: <Gamepad2 className="w-5 h-5" />,
  healthcare: <Heart className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  retail: <ShoppingBag className="w-5 h-5" />,
  custom: <Layers className="w-5 h-5" />,
};

const industryLabels: Record<IndustryTemplate, string> = {
  bank: "Banking",
  rental_car: "Rental Car",
  online_gambling: "Online Gambling",
  healthcare: "Healthcare",
  insurance: "Insurance",
  retail: "Retail",
  custom: "Custom",
};

// Logo thumbnail for demo cards
function DemoLogo({ url, fallbackColor, fallbackIcon }: { url?: string | null; fallbackColor: string; fallbackIcon: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  
  if (!url || hasError) {
    return (
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: fallbackColor }}
      >
        {fallbackIcon}
      </div>
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
      <img 
        src={url} 
        alt="Customer logo" 
        className="max-w-full max-h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { data: demos = [], isLoading } = useDemos();
  const deleteDemo = useDeleteDemo();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [demoToDelete, setDemoToDelete] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredDemos = demos.filter(demo => 
    demo.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    demo.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDemos = filteredDemos.filter(d => d.isActive);
  const inactiveDemos = filteredDemos.filter(d => !d.isActive);

  const handleDelete = () => {
    if (demoToDelete) {
      deleteDemo.mutate(demoToDelete, {
        onSuccess: () => {
          setDemoToDelete(null);
          setDeleteDialogOpen(false);
        }
      });
    }
  };

  const copyDemoUrl = (slug: string) => {
    const url = `${window.location.origin}/demo/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied", description: "Demo URL has been copied to clipboard." });
  };

  const renderDemoGrid = (demoList: typeof demos, label: string) => {
    if (demoList.length === 0) {
      return (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No {label} demos
            </h3>
            <p className="text-muted-foreground">
              {label === 'active'
                ? 'Create a new demo or reactivate an existing one'
                : 'Deactivated demos will appear here'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoList.map((demo, index) => (
          <Card
            key={demo.id}
            className="glass-card group animate-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <DemoLogo
                    url={demo.logoUrl}
                    fallbackColor={demo.buttonColor}
                    fallbackIcon={industryIcons[demo.industryTemplate]}
                  />
                  <div>
                    <CardTitle className="text-lg">{demo.customerName}</CardTitle>
                    <CardDescription className="font-mono text-xs">/demo/{demo.slug}</CardDescription>
                  </div>
                </div>
                <Badge variant={demo.isActive ? 'default' : 'secondary'}>
                  {demo.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="font-medium">{industryLabels[demo.industryTemplate]}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verification</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {demo.verificationType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Form Steps</span>
                  <span className="font-medium">{demo.formSteps.length}</span>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: demo.headerBgColor }}
                    title="Header Background"
                  />
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: demo.headerTextColor }}
                    title="Header Text"
                  />
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: demo.buttonColor }}
                    title="Button Color"
                  />
                  <div className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(demo.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/admin/demo/${demo.id}`)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`/demo/${demo.slug}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyDemoUrl(demo.slug)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDemoToDelete(demo.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="admin-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">GBG Demo Manager</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateDialogOpen(true)} className="gradient-primary glow-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Demo
              </Button>
              <ChangePasswordDialog />
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-container py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Demo Environments</h2>
          <div className="flex items-center gap-2">
            <QrCodeGeneratorDialog />
            <Button variant="outline" onClick={() => navigate('/admin/global-settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Global Settings
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-foreground">{demos.length}</div>
              <div className="text-sm text-muted-foreground">Total Demos</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-success">{demos.filter(d => d.isActive).length}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-foreground">{new Set(demos.map(d => d.industryTemplate)).size}</div>
              <div className="text-sm text-muted-foreground">Industries</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-accent">{demos.filter(d => d.includeQr).length}</div>
              <div className="text-sm text-muted-foreground">With QR Code</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search demos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Active / Inactive Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeDemos.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactiveDemos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {renderDemoGrid(activeDemos, 'active')}
          </TabsContent>
          <TabsContent value="inactive" className="mt-4">
            {renderDemoGrid(inactiveDemos, 'inactive')}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Dialog */}
      <CreateDemoDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => navigate(`/admin/demo/${id}`)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo Environment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The demo environment and all its configuration will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
