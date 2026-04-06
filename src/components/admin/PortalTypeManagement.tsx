import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Monitor, Eye, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePortalTypes, useCreatePortalType, useUpdatePortalType, useDeletePortalType, PortalType,
} from "@/hooks/usePortalTypes";
import { useAuth } from "@/hooks/useAuth";
import { PortalPreviewDialog } from "./PortalPreviewDialog";
import { PortalConfig, DEFAULT_BANKING_CONFIG } from "@/types/portalConfig";
import * as LucideIcons from "lucide-react";

function PortalTypeCard({ pt, onUpdate, onDelete, onPreview, onConfigureContent, readOnly }: {
  pt: PortalType;
  onUpdate: (updates: Partial<PortalType>) => void;
  onDelete: () => void;
  onPreview: () => void;
  onConfigureContent: () => void;
  readOnly?: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVals, setEditVals] = useState({ displayName: pt.displayName, description: pt.description || '' });

  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComp = icons[pt.iconName] || Monitor;

  const handleSave = () => {
    onUpdate({ displayName: editVals.displayName, description: editVals.description } as any);
    setEditing(false);
  };

  return (
    <>
      <Card className={`glass-card transition-all ${pt.isEnabled ? '' : 'opacity-60'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <IconComp className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <Input value={editVals.displayName} onChange={e => setEditVals(p => ({ ...p, displayName: e.target.value }))} className="h-8" />
                  <Input value={editVals.description} onChange={e => setEditVals(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="h-8" />
                </div>
              ) : (
                <>
                  <h3 className="font-semibold">{pt.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{pt.description}</p>
                  <Badge variant="outline" className="text-xs mt-1 font-mono">{pt.typeKey}</Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pt.isEnabled} onCheckedChange={checked => onUpdate({ isEnabled: checked } as any)} />
              {editing ? (
                <>
                  <Button variant="ghost" size="icon" onClick={handleSave}><Check className="w-4 h-4 text-green-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="w-4 h-4 text-destructive" /></Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" onClick={onConfigureContent} title="Configure content">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onPreview} title="Preview portal">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setEditVals({ displayName: pt.displayName, description: pt.description || '' }); setEditing(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portal Type?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{pt.displayName}". Demos using this portal type will need to be updated.</AlertDialogDescription>
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

function PortalConfigEditorDialog({
  portalType,
  open,
  onOpenChange,
  onSaveConfig,
}: {
  portalType: PortalType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveConfig: (config: PortalConfig) => void;
}) {
  const cfg: PortalConfig = { ...DEFAULT_BANKING_CONFIG, ...portalType.defaultConfig };

  const saveConfig = (updates: Partial<PortalConfig>) => {
    const merged = { ...cfg, ...updates };
    onSaveConfig(merged);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Portal Content — {portalType.displayName}</DialogTitle>
          <DialogDescription>
            Customize the default content, accounts, transactions, and verification triggers for this portal type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* User Info */}
          <div>
            <h4 className="text-sm font-medium mb-2">Portal User</h4>
            <p className="text-xs text-muted-foreground mb-3">
              These are default values. When a demo user logs in, their profile data (name, email, phone) will automatically populate the portal instead.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Name</Label>
                <Input defaultValue={cfg.userName} className="h-8 text-sm"
                  placeholder="Populated from user profile"
                  onBlur={(e) => saveConfig({ userName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Email</Label>
                <Input defaultValue={cfg.userEmail} className="h-8 text-sm"
                  placeholder="Populated from user profile"
                  onBlur={(e) => saveConfig({ userEmail: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Phone</Label>
                <Input defaultValue={cfg.userPhone} className="h-8 text-sm"
                  placeholder="Populated from user profile"
                  onBlur={(e) => saveConfig({ userPhone: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Accounts */}
          <div>
            <h4 className="text-sm font-medium mb-3">Dashboard Accounts</h4>
            <div className="space-y-3">
              {(cfg.accounts || []).map((acct, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end border rounded-lg p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input defaultValue={acct.name} className="h-8 text-sm"
                      onBlur={(e) => {
                        const updated = [...(cfg.accounts || [])];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        saveConfig({ accounts: updated });
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Balance</Label>
                    <Input type="number" defaultValue={acct.balance} className="h-8 text-sm"
                      onBlur={(e) => {
                        const updated = [...(cfg.accounts || [])];
                        updated[idx] = { ...updated[idx], balance: parseFloat(e.target.value) || 0 };
                        saveConfig({ accounts: updated });
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last 4</Label>
                    <Input defaultValue={acct.lastFour} className="h-8 text-sm" maxLength={4}
                      onBlur={(e) => {
                        const updated = [...(cfg.accounts || [])];
                        updated[idx] = { ...updated[idx], lastFour: e.target.value };
                        saveConfig({ accounts: updated });
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">APY</Label>
                    <Input defaultValue={acct.apy || ''} className="h-8 text-sm" placeholder="e.g. 4.25%"
                      onBlur={(e) => {
                        const updated = [...(cfg.accounts || [])];
                        updated[idx] = { ...updated[idx], apy: e.target.value || undefined };
                        saveConfig({ accounts: updated });
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Triggers */}
          <div>
            <h4 className="text-sm font-medium mb-3">Verification Triggers</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Choose which settings actions require identity verification
            </p>
            <div className="space-y-2">
              {(cfg.verificationTriggers || []).map((trigger, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{trigger.label}</p>
                    <p className="text-xs text-muted-foreground">Action: "{trigger.action}"</p>
                  </div>
                  <Switch
                    checked={trigger.enabled}
                    onCheckedChange={(v) => {
                      const updated = [...(cfg.verificationTriggers || [])];
                      updated[idx] = { ...updated[idx], enabled: v };
                      saveConfig({ verificationTriggers: updated });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              Recent Transactions ({(cfg.transactions || []).length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(cfg.transactions || []).map((tx, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end border rounded-lg p-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Icon</Label>
                    <Input defaultValue={tx.icon} className="h-7 text-sm w-14"
                      onBlur={(e) => {
                        const updated = [...(cfg.transactions || [])];
                        updated[idx] = { ...updated[idx], icon: e.target.value };
                        saveConfig({ transactions: updated });
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Merchant</Label>
                    <Input defaultValue={tx.merchant} className="h-7 text-sm"
                      onBlur={(e) => {
                        const updated = [...(cfg.transactions || [])];
                        updated[idx] = { ...updated[idx], merchant: e.target.value };
                        saveConfig({ transactions: updated });
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input type="number" defaultValue={tx.amount} className="h-7 text-sm"
                      onBlur={(e) => {
                        const updated = [...(cfg.transactions || [])];
                        updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                        saveConfig({ transactions: updated });
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input defaultValue={tx.date} className="h-7 text-sm"
                      onBlur={(e) => {
                        const updated = [...(cfg.transactions || [])];
                        updated[idx] = { ...updated[idx], date: e.target.value };
                        saveConfig({ transactions: updated });
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PortalTypeManagement({ readOnly = false }: { readOnly?: boolean }) {
  const { data: portalTypes = [], isLoading } = usePortalTypes();
  const createMutation = useCreatePortalType();
  const updateMutation = useUpdatePortalType();
  const deleteMutation = useDeletePortalType();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState({ typeKey: '', displayName: '', description: '' });
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [configTypeId, setConfigTypeId] = useState<string | null>(null);

  const adminName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Admin User';
  const adminEmail = user?.email || 'admin@demo.com';

  const handleAdd = () => {
    if (!newType.typeKey || !newType.displayName) return;
    createMutation.mutate(newType, { onSuccess: () => { setAddOpen(false); setNewType({ typeKey: '', displayName: '', description: '' }); } });
  };

  const configPortalType = portalTypes.find(pt => pt.id === configTypeId);
  const previewPortalType = portalTypes.find(pt => pt.typeKey === previewType);
  const previewConfig = previewPortalType?.defaultConfig;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Portal Types</h2>
          <p className="text-sm text-muted-foreground">Manage the portal experiences available when creating demos</p>
        </div>
        {!readOnly && <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Portal Type</Button>}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : portalTypes.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No portal types configured yet.</p>
      ) : (
        <div className="grid gap-3">
          {portalTypes.map(pt => (
            <PortalTypeCard
              key={pt.id}
              pt={pt}
              onUpdate={updates => updateMutation.mutate({ id: pt.id, updates })}
              onDelete={() => deleteMutation.mutate(pt.id)}
              onPreview={() => setPreviewType(pt.typeKey)}
              onConfigureContent={() => setConfigTypeId(pt.id)}
            />
          ))}
        </div>
      )}

      {/* Portal Preview Dialog */}
      <PortalPreviewDialog
        open={!!previewType}
        onOpenChange={(open) => { if (!open) setPreviewType(null); }}
        portalType={previewType || 'none'}
        portalConfig={previewConfig}
        brandingOverrides={{
          bankName: previewPortalType?.displayName || 'Demo Bank',
        }}
        userNameOverride={previewConfig?.userName || adminName}
        userEmailOverride={previewConfig?.userEmail || adminEmail}
      />

      {/* Portal Config Editor Dialog */}
      {configPortalType && (
        <PortalConfigEditorDialog
          portalType={configPortalType}
          open={!!configTypeId}
          onOpenChange={(open) => { if (!open) setConfigTypeId(null); }}
          onSaveConfig={(config) => {
            updateMutation.mutate({ id: configPortalType.id, updates: { defaultConfig: config } });
          }}
        />
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Portal Type</DialogTitle>
            <DialogDescription>Create a new portal experience type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type Key</Label>
              <Input value={newType.typeKey} onChange={e => setNewType(p => ({ ...p, typeKey: e.target.value }))} placeholder="e.g., rental_car" />
              <p className="text-xs text-muted-foreground">Unique identifier (lowercase, underscores)</p>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={newType.displayName} onChange={e => setNewType(p => ({ ...p, displayName: e.target.value }))} placeholder="e.g., Rental Car" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newType.description} onChange={e => setNewType(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newType.typeKey || !newType.displayName || createMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
