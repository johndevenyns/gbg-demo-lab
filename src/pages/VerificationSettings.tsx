import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Smartphone, Plus, Pencil, Trash2, GripVertical, Check, X, LogOut, Settings, Users, UserCheck, LayoutTemplate, ListChecks, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/useAuth";
import {
  useVerificationTypes,
  useUpdateVerificationType,
  useMdlProviders,
  useUpdateMdlProvider,
  useCreateMdlProvider,
  useDeleteMdlProvider,
} from "@/hooks/useVerificationAdmin";
import { VerificationTypeConfig, MdlProvider, MdlProviderFormData } from "@/types/verification";
import { UserManagement } from "@/components/admin/UserManagement";
import { TestProfileManagement } from "@/components/admin/TestProfileManagement";
import { AdminResourceIdSettings } from "@/components/admin/AdminResourceIdSettings";
import { FormTemplateManagement } from "@/components/admin/FormTemplateManagement";
import { GlobalFieldConfigManagement } from "@/components/admin/GlobalFieldConfigManagement";
import { Key } from "lucide-react";

// Icon mapping for verification types
const iconMap: Record<string, React.ReactNode> = {
  FileText: <Shield className="w-5 h-5" />,
  UserCheck: <Shield className="w-5 h-5" />,
  Database: <Shield className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
};

function VerificationTypeCard({ 
  type, 
  onUpdate 
}: { 
  type: VerificationTypeConfig; 
  onUpdate: (updates: Partial<VerificationTypeConfig>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    displayName: type.displayName,
    description: type.description || '',
    defaultResourceId: type.defaultResourceId || '',
  });

  const handleSave = () => {
    onUpdate({
      displayName: editValues.displayName,
      description: editValues.description,
      defaultResourceId: editValues.defaultResourceId,
    });
    setIsEditing(false);
  };

  return (
    <Card className={`glass-card transition-all ${type.isEnabled ? '' : 'opacity-60'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {iconMap[type.iconName || ''] || <Shield className="w-5 h-5" />}
            </div>
            <div>
              {isEditing ? (
                <Input
                  value={editValues.displayName}
                  onChange={(e) => setEditValues(prev => ({ ...prev, displayName: e.target.value }))}
                  className="h-8 text-lg font-semibold"
                />
              ) : (
                <CardTitle className="text-lg">{type.displayName}</CardTitle>
              )}
              <CardDescription className="font-mono text-xs">{type.typeKey}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={type.isEnabled}
              onCheckedChange={(checked) => onUpdate({ isEnabled: checked })}
            />
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleSave}>
                  <Check className="w-4 h-4 text-success" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={editValues.description}
                onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                className="resize-none"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Default Resource ID</Label>
              <Input
                value={editValues.defaultResourceId}
                onChange={(e) => setEditValues(prev => ({ ...prev, defaultResourceId: e.target.value }))}
                placeholder="Global default resource ID"
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{type.description}</p>
            <div className="flex flex-wrap gap-2">
              {type.requiresDocument && (
                <Badge variant="outline" className="text-xs">Requires Document</Badge>
              )}
              {type.requiresBiometric && (
                <Badge variant="outline" className="text-xs">Requires Biometric</Badge>
              )}
              {type.supportsQrCode && (
                <Badge variant="outline" className="text-xs">QR Code</Badge>
              )}
            </div>
            {type.defaultResourceId && (
              <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                Resource ID: {type.defaultResourceId}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MdlProviderCard({
  provider,
  onUpdate,
  onDelete,
}: {
  provider: MdlProvider;
  onUpdate: (updates: Partial<MdlProvider>) => void;
  onDelete: () => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <Card className={`glass-card transition-all ${provider.isEnabled ? '' : 'opacity-60'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden">
              {provider.logoUrl ? (
                <img src={provider.logoUrl} alt={provider.displayName} className="w-8 h-8 object-contain" />
              ) : (
                <Smartphone className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{provider.displayName}</h3>
                {provider.countryCode && (
                  <Badge variant="secondary" className="text-xs">{provider.countryCode}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{provider.domain}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={provider.isEnabled}
                onCheckedChange={(checked) => onUpdate({ isEnabled: checked })}
              />
              <Button variant="ghost" size="icon" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          {provider.scope && provider.scope.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {provider.scope.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {provider.displayName}. Demos using this provider will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddProviderDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: MdlProviderFormData) => void;
}) {
  const [formData, setFormData] = useState<MdlProviderFormData>({
    providerKey: '',
    displayName: '',
    description: '',
    logoUrl: '',
    domain: '',
    countryCode: '',
    scope: [],
    isEnabled: true,
    displayOrder: 99,
  });
  const [scopeInput, setScopeInput] = useState('');

  const handleSubmit = () => {
    if (!formData.providerKey || !formData.displayName) return;
    onAdd({
      ...formData,
      scope: scopeInput.split(',').map(s => s.trim()).filter(Boolean),
    });
    setFormData({
      providerKey: '',
      displayName: '',
      description: '',
      logoUrl: '',
      domain: '',
      countryCode: '',
      scope: [],
      isEnabled: true,
      displayOrder: 99,
    });
    setScopeInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add mDL Provider</DialogTitle>
          <DialogDescription>Add a new mobile ID provider to the system.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider Key</Label>
              <Input
                value={formData.providerKey}
                onChange={(e) => setFormData(prev => ({ ...prev, providerKey: e.target.value }))}
                placeholder="e.g., mitid"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g., MitID"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={formData.logoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="e.g., mitid.dk"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country Code</Label>
              <Input
                value={formData.countryCode}
                onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                placeholder="e.g., DK"
              />
            </div>
            <div className="space-y-2">
              <Label>Scopes (comma-separated)</Label>
              <Input
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                placeholder="identity, signing"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.providerKey || !formData.displayName}>
            Add Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VerificationSettings() {
  const navigate = useNavigate();
  const { user, signOut, isGlobalAdmin } = useAuth();
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  
  const { data: verificationTypes = [], isLoading: typesLoading } = useVerificationTypes();
  const { data: mdlProviders = [], isLoading: providersLoading } = useMdlProviders();
  
  const updateType = useUpdateVerificationType();
  const updateProvider = useUpdateMdlProvider();
  const createProvider = useCreateMdlProvider();
  const deleteProvider = useDeleteMdlProvider();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleUpdateType = (id: string, updates: Partial<VerificationTypeConfig>) => {
    updateType.mutate({ id, updates: {
      displayName: updates.displayName,
      description: updates.description || undefined,
      defaultResourceId: updates.defaultResourceId || undefined,
      isEnabled: updates.isEnabled,
    }});
  };

  const handleUpdateProvider = (id: string, updates: Partial<MdlProvider>) => {
    updateProvider.mutate({ id, updates: {
      displayName: updates.displayName,
      description: updates.description || undefined,
      logoUrl: updates.logoUrl || undefined,
      domain: updates.domain || undefined,
      countryCode: updates.countryCode || undefined,
      scope: updates.scope,
      isEnabled: updates.isEnabled,
    }});
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="admin-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Global Settings</h1>
                <p className="text-sm text-muted-foreground">Manage verification types, providers, and users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-container py-8">
        <Tabs defaultValue={isGlobalAdmin ? "users" : "my-resource-ids"} className="space-y-6">
          <TabsList>
            {isGlobalAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Management
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="types" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Verification Types
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="providers" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                mDL Providers
              </TabsTrigger>
            )}
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Test Profiles
            </TabsTrigger>
            <TabsTrigger value="my-resource-ids" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              My Resource IDs
            </TabsTrigger>
            {isGlobalAdmin && (
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" />
                Form Templates
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="field-config" className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Field Configuration
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="types" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Verification Types</h2>
                <p className="text-sm text-muted-foreground">
                  Configure global settings for each verification method
                </p>
              </div>
            </div>

            {typesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="glass-card animate-pulse">
                    <CardContent className="h-40" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verificationTypes.map((type) => (
                  <VerificationTypeCard
                    key={type.id}
                    type={type}
                    onUpdate={(updates) => handleUpdateType(type.id, updates)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">mDL Providers</h2>
                <p className="text-sm text-muted-foreground">
                  Manage mobile ID providers available for verification
                </p>
              </div>
              <Button onClick={() => setAddProviderOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </div>

            {providersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glass-card animate-pulse">
                    <CardContent className="h-20" />
                  </Card>
                ))}
              </div>
            ) : mdlProviders.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No providers configured</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add mDL providers to enable mobile ID verification
                  </p>
                  <Button onClick={() => setAddProviderOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Provider
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mdlProviders.map((provider) => (
                  <MdlProviderCard
                    key={provider.id}
                    provider={provider}
                    onUpdate={(updates) => handleUpdateProvider(provider.id, updates)}
                    onDelete={() => deleteProvider.mutate(provider.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="profiles" className="space-y-6">
            <TestProfileManagement />
          </TabsContent>

          <TabsContent value="my-resource-ids" className="space-y-6">
            <AdminResourceIdSettings />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <FormTemplateManagement />
          </TabsContent>

          <TabsContent value="field-config" className="space-y-6">
            <GlobalFieldConfigManagement />
          </TabsContent>
        </Tabs>
      </main>

      <AddProviderDialog
        open={addProviderOpen}
        onOpenChange={setAddProviderOpen}
        onAdd={(data) => createProvider.mutate(data)}
      />
    </div>
  );
}
