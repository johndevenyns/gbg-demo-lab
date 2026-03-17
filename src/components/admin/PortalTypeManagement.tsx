import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Monitor, Eye } from "lucide-react";
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
import * as LucideIcons from "lucide-react";

function PortalTypeCard({ pt, onUpdate, onDelete, onPreview }: {
  pt: PortalType;
  onUpdate: (updates: Partial<PortalType>) => void;
  onDelete: () => void;
  onPreview: () => void;
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

export function PortalTypeManagement() {
  const { data: portalTypes = [], isLoading } = usePortalTypes();
  const createMutation = useCreatePortalType();
  const updateMutation = useUpdatePortalType();
  const deleteMutation = useDeletePortalType();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState({ typeKey: '', displayName: '', description: '' });
  const [previewType, setPreviewType] = useState<string | null>(null);

  // Derive admin user's display name from email
  const adminName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Admin User';
  const adminEmail = user?.email || 'admin@demo.com';

  const handleAdd = () => {
    if (!newType.typeKey || !newType.displayName) return;
    createMutation.mutate(newType, { onSuccess: () => { setAddOpen(false); setNewType({ typeKey: '', displayName: '', description: '' }); } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Portal Types</h2>
          <p className="text-sm text-muted-foreground">Manage the portal experiences available when creating demos</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Portal Type</Button>
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
            />
          ))}
        </div>
      )}

      {/* Portal Preview Dialog */}
      <PortalPreviewDialog
        open={!!previewType}
        onOpenChange={(open) => { if (!open) setPreviewType(null); }}
        portalType={previewType || 'none'}
        brandingOverrides={{
          bankName: 'Demo Bank',
        }}
        userNameOverride={adminName}
        userEmailOverride={adminEmail}
      />

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
