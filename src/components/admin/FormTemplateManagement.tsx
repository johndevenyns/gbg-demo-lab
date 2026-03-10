import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormStep, INDUSTRY_TEMPLATES, IndustryTemplate, DemoEnvironment } from '@/types/demo';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { FormBuilderCanvas } from '@/components/formBuilder/FormBuilderCanvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LayoutTemplate, Bookmark, Plus, Pencil, Trash2, Loader2, Save, Copy,
  Building2, Car, Gamepad2, HeartPulse, Shield, ShoppingBag, Wand2,
} from 'lucide-react';

const INDUSTRY_ICONS: Record<IndustryTemplate, React.ReactNode> = {
  bank: <Building2 className="w-5 h-5" />,
  rental_car: <Car className="w-5 h-5" />,
  online_gambling: <Gamepad2 className="w-5 h-5" />,
  healthcare: <HeartPulse className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  retail: <ShoppingBag className="w-5 h-5" />,
  custom: <Wand2 className="w-5 h-5" />,
};

const INDUSTRY_NAMES: Record<IndustryTemplate, string> = {
  bank: 'Banking',
  rental_car: 'Rental Car',
  online_gambling: 'Online Gambling',
  healthcare: 'Healthcare',
  insurance: 'Insurance',
  retail: 'Retail',
  custom: 'Custom',
};

const TEMPLATE_CATEGORIES = [
  { value: 'custom', label: 'Custom' },
  { value: 'banking', label: 'Banking & Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'retail', label: 'Retail' },
  { value: 'gaming', label: 'Gaming & Gambling' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' },
];

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  form_steps: FormStep[];
  form_style: FormStyleConfig | null;
  created_at: string;
  updated_at: string;
}

// Minimal DemoEnvironment stub for FormBuilderCanvas
function createStubDemo(steps: FormStep[], formStyle?: FormStyleConfig): DemoEnvironment {
  return {
    id: 'template-editor',
    slug: 'template-editor',
    customerName: 'Template Editor',
    industryTemplate: 'custom',
    verificationType: 'docBio',
    returnUrl: '',
    resourceId: '',
    includeQr: false,
    headerBgColor: '#1a1a2e',
    headerTextColor: '#ffffff',
    buttonColor: '#6366f1',
    includeAddressVerification: false,
    formSteps: steps,
    formStyle: formStyle || DEFAULT_FORM_STYLE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };
}

// Editor dialog for templates
function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id?: string;
    name: string;
    description: string;
    category: string;
    steps: FormStep[];
    formStyle?: FormStyleConfig;
    isIndustry?: boolean;
    industryKey?: IndustryTemplate;
  } | null;
  onSave: (data: {
    id?: string;
    name: string;
    description: string;
    category: string;
    steps: FormStep[];
    formStyle?: FormStyleConfig;
  }) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [steps, setSteps] = useState<FormStep[]>([]);
  const [formStyle, setFormStyle] = useState<FormStyleConfig | undefined>();

  useEffect(() => {
    if (template && open) {
      setName(template.name);
      setDescription(template.description);
      setCategory(template.category);
      setSteps(JSON.parse(JSON.stringify(template.steps)));
      setFormStyle(template.formStyle);
    }
  }, [template, open]);

  const stubDemo = createStubDemo(steps, formStyle);

  const handleUpdateSteps = useCallback((newSteps: FormStep[]) => {
    setSteps(newSteps);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            {template?.id ? 'Edit Template' : template?.isIndustry ? `Edit Industry Template: ${template.name}` : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            {template?.isIndustry
              ? 'Modify this industry template. Changes will be saved as a custom override.'
              : 'Configure the template details and form steps.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meta fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Bank Account Opening" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
            </div>
          </div>

          {/* Form builder canvas */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Form Steps</h3>
            <FormBuilderCanvas
              steps={steps}
              onUpdateSteps={handleUpdateSteps}
              demo={stubDemo}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={() => onSave({ id: template?.id, name, description, category, steps, formStyle })}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {template?.id ? 'Update' : 'Save'} Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FormTemplateManagement() {
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Parameters<typeof TemplateEditorDialog>[0]['template']>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedTemplate | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSavedTemplates((data || []) as unknown as SavedTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreateNew = () => {
    setEditingTemplate({
      name: '',
      description: '',
      category: 'custom',
      steps: [{ id: crypto.randomUUID(), title: 'Step 1', order: 1, fields: [] }],
    });
    setEditorOpen(true);
  };

  const handleEditSaved = (t: SavedTemplate) => {
    setEditingTemplate({
      id: t.id,
      name: t.name,
      description: t.description || '',
      category: t.category,
      steps: t.form_steps,
      formStyle: t.form_style || undefined,
    });
    setEditorOpen(true);
  };

  // Find a saved override for an industry key by matching the name
  const findIndustryOverride = (key: IndustryTemplate): SavedTemplate | undefined => {
    return savedTemplates.find(t => t.name === INDUSTRY_NAMES[key]);
  };

  const handleEditIndustry = (key: IndustryTemplate) => {
    const override = findIndustryOverride(key);
    const t = INDUSTRY_TEMPLATES[key];
    if (override) {
      // Edit the existing saved override
      setEditingTemplate({
        id: override.id,
        name: override.name,
        description: override.description || `Industry template for ${INDUSTRY_NAMES[key]}`,
        category: override.category,
        steps: JSON.parse(JSON.stringify(override.form_steps || [])),
        formStyle: override.form_style || undefined,
        isIndustry: true,
        industryKey: key,
      });
    } else {
      // Create from hardcoded defaults
      setEditingTemplate({
        name: INDUSTRY_NAMES[key],
        description: `Industry template for ${INDUSTRY_NAMES[key]}`,
        category: key,
        steps: JSON.parse(JSON.stringify(t.formSteps || [])),
        isIndustry: true,
        industryKey: key,
      });
    }
    setEditorOpen(true);
  };

  const handleDuplicateSaved = (t: SavedTemplate) => {
    setEditingTemplate({
      name: `${t.name} (Copy)`,
      description: t.description || '',
      category: t.category,
      steps: JSON.parse(JSON.stringify(t.form_steps)),
      formStyle: t.form_style || undefined,
    });
    setEditorOpen(true);
  };

  const handleSave = async (data: {
    id?: string;
    name: string;
    description: string;
    category: string;
    steps: FormStep[];
    formStyle?: FormStyleConfig;
  }) => {
    setIsSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || null,
        category: data.category,
        form_steps: JSON.parse(JSON.stringify(data.steps)),
        form_style: data.formStyle ? JSON.parse(JSON.stringify(data.formStyle)) : null,
      };

      if (data.id) {
        const { error } = await supabase.from('form_templates').update(payload).eq('id', data.id);
        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase.from('form_templates').insert([payload]);
        if (error) throw error;
        toast.success('Template created');
      }

      setEditorOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('form_templates').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setSavedTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleteTarget(null);
    }
  };

  const industryKeys = Object.keys(INDUSTRY_TEMPLATES) as IndustryTemplate[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Form Templates</h2>
          <p className="text-sm text-muted-foreground">Create and manage reusable form templates for demo environments</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="saved" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Saved Templates
            {savedTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{savedTemplates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="industry" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Industry Templates
          </TabsTrigger>
        </TabsList>

        {/* Saved Templates */}
        <TabsContent value="saved" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedTemplates.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No saved templates</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a new template or edit an industry template to get started.</p>
                <Button onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            savedTemplates.map((t) => (
              <Card key={t.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{t.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {t.form_steps?.length || 0} step{(t.form_steps?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                        {t.category !== 'custom' && (
                          <Badge variant="secondary" className="text-xs capitalize">{t.category}</Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{t.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {new Date(t.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditSaved(t)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicateSaved(t)} title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t)} title="Delete">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Industry Templates */}
        <TabsContent value="industry" className="space-y-3">
          <p className="text-sm text-muted-foreground mb-3">
            Edit industry templates to customize defaults. Changes are saved as new templates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {industryKeys.filter(k => k !== 'custom').map((key) => {
              const t = INDUSTRY_TEMPLATES[key];
              const stepCount = t.formSteps?.length || 0;
              return (
                <Card key={key} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                        {INDUSTRY_ICONS[key]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{INDUSTRY_NAMES[key]}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{stepCount} step{stepCount !== 1 ? 's' : ''}</Badge>
                          <Badge variant="secondary" className="text-xs capitalize">{t.verificationType}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditIndustry(key)} title="Edit & Save as Template">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor dialog */}
      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
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
