import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DemoEnvironment } from "@/types/demo";
import { DemoUseCaseLink } from "@/types/useCase";
import { toast } from "sonner";

interface SaveAsNewDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demo: DemoEnvironment;
  useCaseLinks: DemoUseCaseLink[];
  onSuccess: (newDemoId: string) => void;
}

export function SaveAsNewDemoDialog({ open, onOpenChange, demo, useCaseLinks, onSuccess }: SaveAsNewDemoDialogProps) {
  const [name, setName] = useState(`${demo.customerName} (Copy)`);
  const [saving, setSaving] = useState(false);

  const generateSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const slug = generateSlug(name);

      // Clone the demo environment
      const { data: newDemo, error: demoErr } = await supabase
        .from('demo_environments')
        .insert({
          slug,
          customer_name: name.trim(),
          industry_template: demo.industryTemplate as any,
          industry_id: demo.industryId || null,
          portal_type: demo.portalType || 'none',
          verification_type: demo.verificationType as any,
          return_url: demo.returnUrl || '',
          approved_url: demo.approvedUrl || '',
          rejected_url: demo.rejectedUrl || '',
          resource_id: demo.resourceId || '',
          resource_id_dataonly: demo.resourceIdDataOnly || '',
          resource_id_databio: demo.resourceIdDataBio || '',
          resource_id_docbio: demo.resourceIdDocBio || '',
          reference_id_prefix: '',
          logo_url: demo.logoUrl || '',
          uploaded_logo_url: demo.uploadedLogoUrl || '',
          use_uploaded_logo: demo.useUploadedLogo ?? false,
          header_bg_color: demo.headerBgColor || '#1a1a2e',
          header_text_color: demo.headerTextColor || '#ffffff',
          button_color: demo.buttonColor || '#6366f1',
          include_qr: demo.includeQr ?? true,
          include_address_verification: demo.includeAddressVerification ?? false,
          form_steps: JSON.parse(JSON.stringify(demo.formSteps || [])),
          form_style: JSON.parse(JSON.stringify(demo.formStyle || {})),
          customer_site_url: demo.customerSiteUrl || '',
          mirror_active_method: demo.mirrorActiveMethod || 'html',
          mirror_html_header_html: demo.mirrorHtmlHeaderHtml || '',
          mirror_html_footer_html: demo.mirrorHtmlFooterHtml || '',
          mirror_html_css: demo.mirrorHtmlCss || '',
          mirror_screenshot_header_html: demo.mirrorScreenshotHeaderHtml || '',
          mirror_screenshot_footer_html: demo.mirrorScreenshotFooterHtml || '',
          mirror_screenshot_css: demo.mirrorScreenshotCss || '',
          header_cta_selector: demo.headerCtaSelector || '',
          header_cta_use_case_id: demo.headerCtaUseCaseId || null,
          stored_test_data: demo.storedTestData ? JSON.parse(JSON.stringify(demo.storedTestData)) : null,
          is_active: true,
          created_by: user?.id || null,
          created_by_email: user?.email || null,
        })
        .select()
        .single();

      if (demoErr) throw demoErr;

      // Clone use case links
      if (useCaseLinks.length > 0) {
        const linkInserts = useCaseLinks.map(link => ({
          demo_id: newDemo.id,
          use_case_id: link.useCaseId,
          is_enabled: link.isEnabled,
          display_order: link.displayOrder,
          show_on_landing_page: link.showOnLandingPage,
          form_steps_override: link.formStepsOverride ? JSON.parse(JSON.stringify(link.formStepsOverride)) : null,
          verification_type_override: link.verificationTypeOverride || null,
          page_content_override: link.pageContentOverride ? JSON.parse(JSON.stringify(link.pageContentOverride)) : null,
          portal_type_override: link.portalTypeOverride || null,
        }));

        const { error: linkErr } = await supabase.from('demo_use_case_links').insert(linkInserts);
        if (linkErr) throw linkErr;
      }

      toast.success('Demo cloned successfully');
      onOpenChange(false);
      onSuccess(newDemo.id);
    } catch (err: any) {
      toast.error(`Failed to clone demo: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as New Demo</DialogTitle>
          <DialogDescription>Clone this demo environment with a new customer name. All settings, use cases, and configurations will be copied.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Customer Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" autoFocus />
          </div>
          <p className="text-xs text-muted-foreground">
            Slug: <span className="font-mono">/demo/{generateSlug(name || 'preview')}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cloning...</> : 'Clone Demo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
