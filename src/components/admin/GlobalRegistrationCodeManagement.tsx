import { useState } from "react";
import { Plus, Trash2, Copy, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GlobalCode {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
}

function parseGlobalCodes(rows: Array<{ id: string; key: string; value: string; description: string | null }>): GlobalCode[] {
  return rows.map(r => {
    try {
      const parsed = JSON.parse(r.value);
      return { id: r.id, code: parsed.code || '', label: parsed.label || '', isActive: parsed.isActive !== false };
    } catch {
      return { id: r.id, code: r.value, label: r.description || '', isActive: true };
    }
  });
}

export function GlobalRegistrationCodeManagement() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['global-registration-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .like('key', 'global_reg_code_%')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return parseGlobalCodes(data || []);
    },
  });

  const addCode = useMutation({
    mutationFn: async ({ code, label }: { code: string; label: string }) => {
      const key = `global_reg_code_${Date.now()}`;
      const { error } = await supabase.from('global_settings').insert({
        key,
        value: JSON.stringify({ code, label, isActive: true }),
        description: label,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-registration-codes'] });
      toast.success('Registration code added');
      setAddOpen(false);
      setNewCode('');
      setNewLabel('');
    },
    onError: () => toast.error('Failed to add code'),
  });

  const toggleCode = useMutation({
    mutationFn: async ({ id, code, label, isActive }: GlobalCode) => {
      const { error } = await supabase.from('global_settings').update({
        value: JSON.stringify({ code, label, isActive }),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['global-registration-codes'] }),
    onError: () => toast.error('Failed to update code'),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-registration-codes'] });
      toast.success('Registration code deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete code'),
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAdd = () => {
    if (!newCode.trim()) return;
    addCode.mutate({ code: newCode.trim(), label: newLabel.trim() });
  };

  const codeToDelete = codes.find(c => c.id === deleteId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Global Registration Codes</h2>
          <p className="text-sm text-muted-foreground">
            These codes work across all demo environments, bypassing per-demo user lookup.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />Add Code
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i} className="glass-card animate-pulse"><CardContent className="h-16" /></Card>
          ))}
        </div>
      ) : codes.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-8 text-center">
            <KeyRound className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No global registration codes configured.</p>
            <p className="text-xs text-muted-foreground mt-1">Add a code that works across all demos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map(c => (
            <Card key={c.id} className={`glass-card transition-all ${!c.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold">{c.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(c.code)}>
                        {copiedCode === c.code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                      {c.isActive ? (
                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                      )}
                    </div>
                    {c.label && <p className="text-xs text-muted-foreground truncate">{c.label}</p>}
                  </div>
                  <Switch
                    checked={c.isActive}
                    onCheckedChange={(checked) => toggleCode.mutate({ ...c, isActive: checked })}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Global Registration Code</DialogTitle>
            <DialogDescription>This code will work across all demo environments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g., 445566" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g., Master demo code" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newCode.trim() || addCode.isPending}>Add Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Code <strong className="font-mono">{codeToDelete?.code}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteCode.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
