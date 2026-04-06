import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ArrowUpDown, Plug, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGlobalFieldConfigs,
  useCreateGlobalFieldConfig,
  useUpdateGlobalFieldConfig,
  useDeleteGlobalFieldConfig,
  GlobalFieldConfig,
  GlobalFieldConfigInsert,
} from "@/hooks/useGlobalFieldConfigs";

const CATEGORIES = [
  { value: 'personal', label: 'Personal Info' },
  { value: 'contact', label: 'Contact' },
  { value: 'address', label: 'Address' },
  { value: 'identity', label: 'Identity' },
  { value: 'financial', label: 'Financial' },
  { value: 'custom', label: 'Custom Fields' },
  { value: 'content', label: 'Content & Text' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'date_of_birth', label: 'Date of Birth' },
  { value: 'ssn', label: 'SSN (Masked)' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'consent_checkbox', label: 'Consent Checkbox' },
  { value: 'heading', label: 'Heading (Display Only)' },
  { value: 'paragraph', label: 'Paragraph (Display Only)' },
  { value: 'divider', label: 'Divider (Display Only)' },
];

// Fields whose api_name maps to Loqate address verification parameters
const ADDRESS_VERIFICATION_API_NAMES = new Set([
  'address_street', 'address_city', 'address_state', 'address_zip', 'address_country',
  'streetAddress', 'city', 'state', 'zipCode', 'country',
  'Address1', 'Locality', 'AdministrativeArea', 'PostalCode', 'Country',
]);

const emptyForm: GlobalFieldConfigInsert = {
  field_type: 'text',
  api_name: '',
  display_name: '',
  is_api_field: true,
  category: 'custom',
  placeholder: '',
  required_by_default: false,
  display_order: 100,
};

export function GlobalFieldConfigManagement({ readOnly = false }: { readOnly?: boolean }) {
  const { data: fields = [], isLoading } = useGlobalFieldConfigs();
  const createField = useCreateGlobalFieldConfig();
  const updateField = useUpdateGlobalFieldConfig();
  const deleteField = useDeleteGlobalFieldConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GlobalFieldConfigInsert>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<GlobalFieldConfig | null>(null);

  const openAdd = (category?: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, display_order: (fields.length + 1) * 10, category: category || 'custom' });
    setDialogOpen(true);
  };

  const openEdit = (f: GlobalFieldConfig) => {
    setEditingId(f.id);
    setForm({
      field_type: f.field_type,
      api_name: f.api_name,
      display_name: f.display_name,
      is_api_field: f.is_api_field,
      category: f.category,
      placeholder: f.placeholder,
      required_by_default: f.required_by_default,
      display_order: f.display_order,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.display_name) return;
    if (editingId) {
      updateField.mutate({ id: editingId, updates: form });
    } else {
      createField.mutate(form);
    }
    setDialogOpen(false);
  };

  // Group fields by category — show ALL categories so user can add to empty ones
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    fields: fields.filter(f => f.category === cat.value),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Field Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Manage form fields available in the builder. Fields marked as API fields are posted to the verification API.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading fields…</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <Card key={group.value} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <CardDescription>{group.fields.length} field{group.fields.length !== 1 ? 's' : ''}</CardDescription>
                  </div>
                  {!readOnly && (
                    <Button variant="outline" size="sm" onClick={() => openAdd(group.value)} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {group.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No fields yet. Click Add to create one.</p>
                ) : (
                <div className="divide-y divide-border">
                  {group.fields.map(field => (
                    <div key={field.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{field.display_name}</span>
                          {field.is_api_field ? (
                            <Badge variant="default" className="text-xs gap-1">
                              <Plug className="w-3 h-3" /> API
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <FileText className="w-3 h-3" /> Form Only
                            </Badge>
                          )}
                          {field.required_by_default && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                          {field.is_api_field && ADDRESS_VERIFICATION_API_NAMES.has(field.api_name) && (
                            <Badge variant="outline" className="text-xs gap-1 border-green-500/50 text-green-600 dark:text-green-400">
                              <MapPin className="w-3 h-3" /> Address Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">type: {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}</span>
                          {field.is_api_field && field.api_name && (
                            <span className="font-mono">api: {field.api_name}</span>
                          )}
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(field)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(field)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Field' : 'Add New Field'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update field configuration.' : 'Create a new form field available in the builder.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Account Number" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={form.field_type} onValueChange={v => setForm(p => ({ ...p, field_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm font-medium">API Field</Label>
                <p className="text-xs text-muted-foreground">Posted to the verification API</p>
              </div>
              <Switch checked={form.is_api_field} onCheckedChange={v => setForm(p => ({ ...p, is_api_field: v }))} />
            </div>

            {form.is_api_field && (
              <div className="space-y-2">
                <Label>API Name</Label>
                <Input value={form.api_name} onChange={e => setForm(p => ({ ...p, api_name: e.target.value }))} placeholder="e.g. accountNumber" className="font-mono" />
                <p className="text-xs text-muted-foreground">The field name sent in the API payload</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input value={form.placeholder} onChange={e => setForm(p => ({ ...p, placeholder: e.target.value }))} placeholder="Placeholder text" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label className="text-sm">Required by Default</Label>
                <Switch checked={form.required_by_default} onCheckedChange={v => setForm(p => ({ ...p, required_by_default: v }))} />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.display_name}>
              {editingId ? 'Save Changes' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteTarget?.display_name}" from the global field list. Existing demos using this field will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) deleteField.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
