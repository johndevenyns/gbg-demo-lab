import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDemo, useUpdateDemo } from "@/hooks/useDemos";
import { DemoEnvironment, VerificationType } from "@/types/demo";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function DemoConfig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: demo, isLoading, error } = useDemo(id || "");
  const updateDemoMutation = useUpdateDemo();
  
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

  const handleUpdate = (updates: Partial<DemoEnvironment>) => {
    setLocalDemo(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleSave = () => {
    if (!localDemo) return;
    updateDemoMutation.mutate({ id: localDemo.id, updates: localDemo });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="admin-container py-4">
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
              <Button variant="outline" onClick={() => window.open(`/demo/${localDemo.slug}`, '_blank')}>
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

      <main className="admin-container py-8 space-y-6">
        {/* Basic Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
            <CardDescription>Core configuration for this demo environment</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={localDemo.customerName} onChange={(e) => handleUpdate({ customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={localDemo.logoUrl || ""} onChange={(e) => handleUpdate({ logoUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Verification Type</Label>
              <Select value={localDemo.verificationType} onValueChange={(v) => handleUpdate({ verificationType: v as VerificationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="docBio">Doc & Bio (Document + Selfie)</SelectItem>
                  <SelectItem value="dataBio">Data & Bio (User Data + Selfie)</SelectItem>
                  <SelectItem value="dataOnly">Data Only (No Biometrics)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Return URL</Label>
              <Input value={localDemo.returnUrl} onChange={(e) => handleUpdate({ returnUrl: e.target.value })} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Resource IDs */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Resource IDs</CardTitle>
            <CardDescription>GBG Journey Resource IDs for verification</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Resource ID (Default)</Label>
              <Input value={localDemo.resourceId} onChange={(e) => handleUpdate({ resourceId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resource ID (DocBio)</Label>
              <Input value={localDemo.resourceIdDocBio || ""} onChange={(e) => handleUpdate({ resourceIdDocBio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resource ID (DataBio)</Label>
              <Input value={localDemo.resourceIdDataBio || ""} onChange={(e) => handleUpdate({ resourceIdDataBio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resource ID (DataOnly)</Label>
              <Input value={localDemo.resourceIdDataOnly || ""} onChange={(e) => handleUpdate({ resourceIdDataOnly: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reference ID Prefix</Label>
              <Input value={localDemo.referenceIdPrefix || ""} onChange={(e) => handleUpdate({ referenceIdPrefix: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        {/* Branding Colors */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Customize the appearance of the verification interface</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Header Background</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={localDemo.headerBgColor} onChange={(e) => handleUpdate({ headerBgColor: e.target.value })} className="color-picker-swatch" />
                <Input value={localDemo.headerBgColor} onChange={(e) => handleUpdate({ headerBgColor: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Header Text</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={localDemo.headerTextColor} onChange={(e) => handleUpdate({ headerTextColor: e.target.value })} className="color-picker-swatch" />
                <Input value={localDemo.headerTextColor} onChange={(e) => handleUpdate({ headerTextColor: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={localDemo.buttonColor} onChange={(e) => handleUpdate({ buttonColor: e.target.value })} className="color-picker-swatch" />
                <Input value={localDemo.buttonColor} onChange={(e) => handleUpdate({ buttonColor: e.target.value })} className="font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Include QR Code</Label>
                <p className="text-sm text-muted-foreground">Show QR code for mobile verification</p>
              </div>
              <Switch checked={localDemo.includeQr} onCheckedChange={(v) => handleUpdate({ includeQr: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Address Verification</Label>
                <p className="text-sm text-muted-foreground">Validate addresses during verification</p>
              </div>
              <Switch checked={localDemo.includeAddressVerification} onCheckedChange={(v) => handleUpdate({ includeAddressVerification: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Demo is accessible to users</p>
              </div>
              <Switch checked={localDemo.isActive} onCheckedChange={(v) => handleUpdate({ isActive: v })} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
