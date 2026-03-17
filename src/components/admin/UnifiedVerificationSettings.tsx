import { useState } from "react";
import { Shield, Smartphone, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, Save, Info, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useVerificationTypes, useUpdateVerificationType,
  useMdlProviders, useUpdateMdlProvider, useCreateMdlProvider, useDeleteMdlProvider,
} from "@/hooks/useVerificationAdmin";
import {
  useMyAdminResourceIds, useUpsertAdminResourceId, useDeleteAdminResourceId,
} from "@/hooks/useAdminResourceIds";
import { VerificationTypeConfig, MdlProvider, MdlProviderFormData } from "@/types/verification";

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  FileText: <Shield className="w-5 h-5" />,
  UserCheck: <Shield className="w-5 h-5" />,
  Database: <Shield className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
};

// ── mDL Provider Card (inline) ──────────────────────────────────────
function MdlProviderCard({ provider, onUpdate, onDelete }: {
  provider: MdlProvider;
  onUpdate: (updates: Partial<MdlProvider>) => void;
  onDelete: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${provider.isEnabled ? 'border-border' : 'border-border opacity-60'}`}>
        <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
          {provider.logoUrl ? (
            <img src={provider.logoUrl} alt={provider.displayName} className="w-7 h-7 object-contain" />
          ) : (
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{provider.displayName}</span>
            {provider.countryCode && (
              <Badge variant="secondary" className="text-[10px]">{provider.countryCode}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{provider.domain}</p>
        </div>
        <Switch
          checked={provider.isEnabled}
          onCheckedChange={(checked) => onUpdate({ isEnabled: checked })}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {provider.displayName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Add Provider Dialog ─────────────────────────────────────────────
function AddProviderDialog({ open, onOpenChange, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: MdlProviderFormData) => void;
}) {
  const [formData, setFormData] = useState<MdlProviderFormData>({
    providerKey: '', displayName: '', description: '', logoUrl: '',
    domain: '', countryCode: '', scope: [], isEnabled: true, displayOrder: 99,
  });
  const [scopeInput, setScopeInput] = useState('');

  const handleSubmit = () => {
    if (!formData.providerKey || !formData.displayName) return;
    onAdd({ ...formData, scope: scopeInput.split(',').map(s => s.trim()).filter(Boolean) });
    setFormData({ providerKey: '', displayName: '', description: '', logoUrl: '', domain: '', countryCode: '', scope: [], isEnabled: true, displayOrder: 99 });
    setScopeInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add mDL Provider</DialogTitle>
          <DialogDescription>Add a new mobile ID provider.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider Key</Label>
              <Input value={formData.providerKey} onChange={(e) => setFormData(p => ({ ...p, providerKey: e.target.value }))} placeholder="e.g., mitid" />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={formData.displayName} onChange={(e) => setFormData(p => ({ ...p, displayName: e.target.value }))} placeholder="e.g., MitID" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={formData.logoUrl} onChange={(e) => setFormData(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={formData.domain} onChange={(e) => setFormData(p => ({ ...p, domain: e.target.value }))} placeholder="e.g., mitid.dk" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country Code</Label>
              <Input value={formData.countryCode} onChange={(e) => setFormData(p => ({ ...p, countryCode: e.target.value }))} placeholder="e.g., DK" />
            </div>
            <div className="space-y-2">
              <Label>Scopes (comma-separated)</Label>
              <Input value={scopeInput} onChange={(e) => setScopeInput(e.target.value)} placeholder="identity, signing" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.providerKey || !formData.displayName}>Add Provider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Verification Type Card (expandable) ─────────────────────────────
function VerificationTypeCard({ type, onUpdate, isMdl, mdlProviders, onUpdateProvider, onDeleteProvider, onAddProvider, isGlobalAdmin }: {
  type: VerificationTypeConfig;
  onUpdate: (updates: Partial<VerificationTypeConfig>) => void;
  isMdl: boolean;
  mdlProviders: MdlProvider[];
  onUpdateProvider: (id: string, updates: Partial<MdlProvider>) => void;
  onDeleteProvider: (id: string) => void;
  onAddProvider: () => void;
  isGlobalAdmin: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ displayName: type.displayName, description: type.description || '' });
  const [globalResourceId, setGlobalResourceId] = useState(type.defaultResourceId || '');
  const globalResourceIdChanged = globalResourceId !== (type.defaultResourceId || '');

  const handleSave = () => {
    onUpdate({ displayName: editValues.displayName, description: editValues.description });
    setIsEditing(false);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
                    onChange={(e) => setEditValues(p => ({ ...p, displayName: e.target.value }))}
                    className="h-8 text-lg font-semibold"
                  />
                ) : (
                  <CardTitle className="text-lg">{type.displayName}</CardTitle>
                )}
                <CardDescription className="font-mono text-xs">{type.typeKey}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isGlobalAdmin && (
                <Switch checked={type.isEnabled} onCheckedChange={(checked) => onUpdate({ isEnabled: checked })} />
              )}
              {isGlobalAdmin && (
                isEditing ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={handleSave}><Check className="w-4 h-4 text-green-500" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X className="w-4 h-4 text-destructive" /></Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Pencil className="w-4 h-4" /></Button>
                )
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={editValues.description}
                onChange={(e) => setEditValues(p => ({ ...p, description: e.target.value }))}
                className="resize-none" rows={2}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{type.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {type.requiresDocument && <Badge variant="outline" className="text-xs">Requires Document</Badge>}
                {type.requiresBiometric && <Badge variant="outline" className="text-xs">Requires Biometric</Badge>}
                {type.supportsQrCode && <Badge variant="outline" className="text-xs">QR Code</Badge>}
                {isMdl && <Badge variant="outline" className="text-xs">{mdlProviders.length} provider{mdlProviders.length !== 1 ? 's' : ''}</Badge>}
              </div>
            </>
          )}
        </CardContent>

        <CollapsibleContent>
          {/* Global Resource ID (global admin only) */}
          {isGlobalAdmin && (
            <div className="px-6 pb-4">
              <Separator className="mb-4" />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Global Default Resource ID</Label>
                <p className="text-xs text-muted-foreground">
                  This Resource ID will be used for all demos unless overridden at the admin or customer level.
                </p>
                <div className="flex items-end gap-2">
                  <Input
                    value={globalResourceId}
                    onChange={(e) => setGlobalResourceId(e.target.value)}
                    placeholder="Enter global resource ID..."
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => onUpdate({ defaultResourceId: globalResourceId.trim() || null })}
                    disabled={!globalResourceIdChanged}
                  >
                    <Save className="w-4 h-4 mr-1" />Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* mDL Providers subsection */}
          {isMdl && isGlobalAdmin && (
            <div className="px-6 pb-6">
              <Separator className="mb-4" />
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold">Mobile ID Providers</h4>
                  <p className="text-xs text-muted-foreground">Manage available mobile ID providers for this verification type</p>
                </div>
                <Button size="sm" variant="outline" onClick={onAddProvider}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add
                </Button>
              </div>
              {mdlProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No providers configured.</p>
              ) : (
                <div className="space-y-2">
                  {mdlProviders.map(p => (
                    <MdlProviderCard
                      key={p.id}
                      provider={p}
                      onUpdate={(updates) => onUpdateProvider(p.id, updates)}
                      onDelete={() => onDeleteProvider(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Main Component ──────────────────────────────────────────────────
export function UnifiedVerificationSettings({ isGlobalAdmin }: { isGlobalAdmin: boolean }) {
  const { data: verificationTypes = [], isLoading: typesLoading } = useVerificationTypes();
  const { data: mdlProviders = [], isLoading: providersLoading } = useMdlProviders();
  const { data: myResourceIds = [], isLoading: idsLoading } = useMyAdminResourceIds();

  const updateType = useUpdateVerificationType();
  const updateProvider = useUpdateMdlProvider();
  const createProvider = useCreateMdlProvider();
  const deleteProvider = useDeleteMdlProvider();
  const upsertResourceId = useUpsertAdminResourceId();
  const deleteResourceId = useDeleteAdminResourceId();

  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const getResourceIdValue = (typeKey: string): string => {
    if (editValues[typeKey] !== undefined) return editValues[typeKey];
    const existing = myResourceIds.find(r => r.typeKey === typeKey);
    return existing?.resourceId || '';
  };

  const handleSaveResourceId = (typeKey: string) => {
    const value = getResourceIdValue(typeKey);
    if (value.trim()) upsertResourceId.mutate({ typeKey, resourceId: value.trim() });
  };

  const handleDeleteResourceId = (typeKey: string) => {
    const existing = myResourceIds.find(r => r.typeKey === typeKey);
    if (existing) {
      deleteResourceId.mutate(existing.id);
      setEditValues(prev => { const next = { ...prev }; delete next[typeKey]; return next; });
    }
  };

  const handleUpdateType = (id: string, updates: Partial<VerificationTypeConfig>) => {
    updateType.mutate({ id, updates: {
      displayName: updates.displayName,
      description: updates.description || undefined,
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

  const isLoading = typesLoading || providersLoading || idsLoading;

  return (
    <div className="space-y-8">
      {/* Verification Types Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Verification Types</h2>
          <p className="text-sm text-muted-foreground">
            {isGlobalAdmin
              ? 'Enable or disable verification methods and manage their configuration'
              : 'Available verification methods'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="glass-card animate-pulse"><CardContent className="h-40" /></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verificationTypes.map(type => (
              <VerificationTypeCard
                key={type.id}
                type={type}
                onUpdate={(updates) => handleUpdateType(type.id, updates)}
                isMdl={type.typeKey === 'mdl'}
                mdlProviders={mdlProviders}
                onUpdateProvider={handleUpdateProvider}
                onDeleteProvider={(id) => deleteProvider.mutate(id)}
                onAddProvider={() => setAddProviderOpen(true)}
                isGlobalAdmin={isGlobalAdmin}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* My Resource IDs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">My Resource IDs</h2>
            <p className="text-sm text-muted-foreground">
              Your personal default Resource IDs per verification type
            </p>
          </div>
        </div>

        <Card className="glass-card border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Resource ID Hierarchy</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li><strong>Customer Level</strong> — Set per demo in the Verification Path config (highest priority)</li>
                  <li><strong>Admin Level</strong> — Your personal defaults (below)</li>
                  <li><strong>Global Level</strong> — Platform-wide defaults</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-card animate-pulse"><CardContent className="h-20" /></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {verificationTypes.map(type => {
              const existing = myResourceIds.find(r => r.typeKey === type.typeKey);
              const currentValue = getResourceIdValue(type.typeKey);
              const hasChanged = currentValue !== (existing?.resourceId || '');

              return (
                <Card key={type.id} className="glass-card">
                  <CardContent className="py-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">{type.displayName}</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{type.typeKey}</Badge>
                          {existing && <Badge variant="secondary" className="text-[10px]">Override active</Badge>}
                        </div>
                        <Input
                          value={currentValue}
                          onChange={(e) => setEditValues(prev => ({ ...prev, [type.typeKey]: e.target.value }))}
                          placeholder={type.defaultResourceId || 'Enter your resource ID...'}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveResourceId(type.typeKey)}
                        disabled={!currentValue.trim() || !hasChanged || upsertResourceId.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />Save
                      </Button>
                      {existing && (
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteResourceId(type.typeKey)} disabled={deleteResourceId.isPending}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddProviderDialog
        open={addProviderOpen}
        onOpenChange={setAddProviderOpen}
        onAdd={(data) => createProvider.mutate(data)}
      />
    </div>
  );
}
