import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDemoStore } from "@/stores/demoStore";
import { VerificationType } from "@/types/demo";
import { useToast } from "@/hooks/use-toast";

export default function DemoConfig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getDemo, updateDemo } = useDemoStore();
  
  const demo = getDemo(id || "");
  
  if (!demo) {
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

  const handleUpdate = (updates: Partial<typeof demo>) => {
    updateDemo(demo.id, updates);
  };

  const handleSave = () => {
    toast({ title: "Saved", description: "Demo configuration has been saved." });
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
                <h1 className="text-xl font-bold">{demo.customerName}</h1>
                <p className="text-sm text-muted-foreground font-mono">/demo/{demo.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.open(`/demo/${demo.slug}`, '_blank')}>
                <Eye className="w-4 h-4 mr-2" />Preview
              </Button>
              <Button onClick={handleSave} className="gradient-primary">
                <Save className="w-4 h-4 mr-2" />Save
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
              <Input value={demo.customerName} onChange={(e) => handleUpdate({ customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={demo.logoUrl || ""} onChange={(e) => handleUpdate({ logoUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Verification Type</Label>
              <Select value={demo.verificationType} onValueChange={(v) => handleUpdate({ verificationType: v as VerificationType })}>
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
              <Input value={demo.returnUrl} onChange={(e) => handleUpdate({ returnUrl: e.target.value })} placeholder="https://..." />
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
              <Input value={demo.resourceId} onChange={(e) => handleUpdate({ resourceId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resource ID (DocBio)</Label>
              <Input value={demo.resourceIdDocBio || ""} onChange={(e) => handleUpdate({ resourceIdDocBio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resource ID (DataBio)</Label>
              <Input value={demo.resourceIdDataBio || ""} onChange={(e) => handleUpdate({ resourceIdDataBio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resource ID (DataOnly)</Label>
              <Input value={demo.resourceIdDataOnly || ""} onChange={(e) => handleUpdate({ resourceIdDataOnly: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reference ID Prefix</Label>
              <Input value={demo.referenceIdPrefix || ""} onChange={(e) => handleUpdate({ referenceIdPrefix: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reference ID</Label>
              <Input value={demo.referenceId || ""} onChange={(e) => handleUpdate({ referenceId: e.target.value })} />
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
                <input type="color" value={demo.headerBgColor} onChange={(e) => handleUpdate({ headerBgColor: e.target.value })} className="color-picker-swatch" />
                <Input value={demo.headerBgColor} onChange={(e) => handleUpdate({ headerBgColor: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Header Text</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={demo.headerTextColor} onChange={(e) => handleUpdate({ headerTextColor: e.target.value })} className="color-picker-swatch" />
                <Input value={demo.headerTextColor} onChange={(e) => handleUpdate({ headerTextColor: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={demo.buttonColor} onChange={(e) => handleUpdate({ buttonColor: e.target.value })} className="color-picker-swatch" />
                <Input value={demo.buttonColor} onChange={(e) => handleUpdate({ buttonColor: e.target.value })} className="font-mono" />
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
              <Switch checked={demo.includeQr} onCheckedChange={(v) => handleUpdate({ includeQr: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Address Verification</Label>
                <p className="text-sm text-muted-foreground">Validate addresses during verification</p>
              </div>
              <Switch checked={demo.includeAddressVerification} onCheckedChange={(v) => handleUpdate({ includeAddressVerification: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Demo is accessible to users</p>
              </div>
              <Switch checked={demo.isActive} onCheckedChange={(v) => handleUpdate({ isActive: v })} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
