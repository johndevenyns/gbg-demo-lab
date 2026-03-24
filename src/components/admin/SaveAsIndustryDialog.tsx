import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DemoEnvironment } from "@/types/demo";
import { DemoUseCaseLink } from "@/types/useCase";
import { toast } from "sonner";

interface SaveAsIndustryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demo: DemoEnvironment;
  useCaseLinks: DemoUseCaseLink[];
  onSuccess: () => void;
}

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export function SaveAsIndustryDialog({ open, onOpenChange, demo, useCaseLinks, onSuccess }: SaveAsIndustryDialogProps) {
  const [title, setTitle] = useState(demo.customerName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);

  const updateStep = (index: number, status: 'active' | 'done') => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const progressSteps: ProgressStep[] = [
      { label: 'Creating industry', status: 'pending' },
      { label: 'Creating use cases', status: 'pending' },
      { label: 'Linking use cases to industry', status: 'pending' },
    ];
    setSteps(progressSteps);

    try {
      // Step 1: Create the industry
      updateStep(0, 'active');

      // Get max display order
      const { data: existingIndustries } = await supabase
        .from('industries')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      const nextOrder = ((existingIndustries?.[0]?.display_order as number) ?? 0) + 1;

      const { data: industry, error: indErr } = await supabase
        .from('industries')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          icon_name: 'Building2',
          portal_type: demo.portalType || 'none',
          portal_config: {},
          display_order: nextOrder,
          is_enabled: true,
        })
        .select()
        .single();

      if (indErr) throw indErr;
      updateStep(0, 'done');

      // Step 2: Create global use cases from the demo's linked use cases (if they have overrides, create new ones)
      updateStep(1, 'active');

      // Fetch existing global use cases to check for duplicates
      const { data: existingUseCases } = await supabase
        .from('global_use_cases')
        .select('id, title');
      const existingTitles = new Set((existingUseCases ?? []).map(uc => (uc.title as string).toLowerCase()));

      const createdUseCaseIds: string[] = [];

      for (const link of useCaseLinks) {
        const ucTitle = link.globalUseCase?.title ?? 'Untitled';
        const hasOverrides = link.formStepsOverride || link.verificationTypeOverride || link.pageContentOverride || link.portalTypeOverride;

        if (hasOverrides) {
          // Create a new global use case from the override
          const newTitle = existingTitles.has(ucTitle.toLowerCase())
            ? `${ucTitle} (${title.trim()})`
            : ucTitle;

          const { data: newUc, error: ucErr } = await supabase
            .from('global_use_cases')
            .insert({
              title: newTitle,
              description: link.globalUseCase?.description ?? null,
              icon_name: link.globalUseCase?.iconName ?? 'Package',
              default_form_steps: link.formStepsOverride
                ? JSON.parse(JSON.stringify(link.formStepsOverride)) as unknown as null
                : JSON.parse(JSON.stringify(link.globalUseCase?.defaultFormSteps ?? [])) as unknown as null,
              default_verification_type: link.verificationTypeOverride ?? link.globalUseCase?.defaultVerificationType ?? 'docBio',
              default_page_content: link.pageContentOverride
                ? JSON.parse(JSON.stringify(link.pageContentOverride)) as unknown as null
                : JSON.parse(JSON.stringify(link.globalUseCase?.defaultPageContent ?? {})) as unknown as null,
              portal_type: link.portalTypeOverride ?? link.globalUseCase?.portalType ?? null,
              display_order: link.displayOrder,
              is_enabled: true,
              show_fill_pass: link.globalUseCase?.showFillPass ?? false,
              show_fill_fail: link.globalUseCase?.showFillFail ?? false,
            })
            .select()
            .single();

          if (ucErr) throw ucErr;
          createdUseCaseIds.push(newUc.id);
          existingTitles.add(newTitle.toLowerCase());
        } else {
          // Use existing global use case as-is
          createdUseCaseIds.push(link.useCaseId);
        }
      }
      updateStep(1, 'done');

      // Step 3: The industry is now created with its use cases referenced.
      // Industries don't have a direct link table to use cases yet,
      // but we store a note that these use cases belong to this industry context.
      updateStep(2, 'active');

      // Update the industry portal_config to store the default use case IDs for this industry
      const { error: updateErr } = await supabase
        .from('industries')
        .update({
          portal_config: {
            defaultUseCaseIds: createdUseCaseIds,
            sourceDemo: demo.id,
            sourceDemoName: demo.customerName,
          },
        })
        .eq('id', industry.id);

      if (updateErr) throw updateErr;
      updateStep(2, 'done');

      toast.success(`Industry "${title.trim()}" created with ${createdUseCaseIds.length} use case(s)`);
      setTimeout(() => {
        onOpenChange(false);
        setSaving(false);
        setSteps([]);
        onSuccess();
      }, 800);
    } catch (err: any) {
      toast.error(`Failed to create industry: ${err.message}`);
      setSaving(false);
      setSteps([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save as Industry</DialogTitle>
          <DialogDescription>
            Create a reusable industry template from this demo. Use cases with custom overrides will be saved as new standalone use cases.
          </DialogDescription>
        </DialogHeader>

        {saving ? (
          <div className="py-6 space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {step.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={step.status === 'done' ? 'text-muted-foreground' : step.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Industry Name</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Banking, Healthcare" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this industry vertical" rows={2} />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-medium">What will be created:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• 1 new industry (portal type: {demo.portalType || 'none'})</li>
                <li>• {useCaseLinks.filter(l => l.formStepsOverride || l.verificationTypeOverride || l.pageContentOverride || l.portalTypeOverride).length} new use case(s) from custom overrides</li>
                <li>• {useCaseLinks.filter(l => !l.formStepsOverride && !l.verificationTypeOverride && !l.pageContentOverride && !l.portalTypeOverride).length} existing use case(s) will be referenced</li>
              </ul>
            </div>
          </div>
        )}

        {!saving && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              Create Industry
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
