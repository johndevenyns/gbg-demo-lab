import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Code2, Save, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const MDL_LAUNCH_HTML_KEY = "mdl_launch_html";
export const MDL_REDIRECT_HTML_KEY = "mdl_redirect_html";

export const DEFAULT_LAUNCH_HTML = `<div style="text-align:center;padding:2rem;font-family:system-ui,sans-serif;">
  <h2 style="margin:0 0 .5rem 0;">Mobile Verification</h2>
  <p style="color:#6b7280;margin:0 0 1.5rem 0;">
    A secure verification window will open. Complete the steps and we'll bring you right back here.
  </p>
  <button data-popup-launch-button
    style="background:#0f172a;color:#fff;padding:.75rem 1.5rem;border:0;border-radius:.5rem;font-weight:600;cursor:pointer;">
    Start Mobile Verification
  </button>
</div>`;

export const DEFAULT_REDIRECT_HTML = `<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:1.5rem;">
  <div style="text-align:center;max-width:28rem;">
    <h1 style="font-size:1.25rem;font-weight:600;margin:0 0 .5rem 0;">Returning to Verification…</h1>
    <p style="font-size:.875rem;color:#6b7280;margin:0;">
      You can close this window if it does not close automatically.
    </p>
  </div>
</main>`;

type PageKey = typeof MDL_LAUNCH_HTML_KEY | typeof MDL_REDIRECT_HTML_KEY;

export function useMdlPageHtml(key: PageKey) {
  return useQuery({
    queryKey: ["global_settings", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("global_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return (data?.value as string | undefined) ?? null;
    },
  });
}

function HtmlEditorDialog({
  open, onOpenChange, settingKey, title, description, defaultHtml,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settingKey: PageKey;
  title: string;
  description: string;
  defaultHtml: string;
}) {
  const queryClient = useQueryClient();
  const { data: current, isLoading } = useMdlPageHtml(settingKey);
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (open) setHtml(current ?? defaultHtml);
  }, [open, current, defaultHtml]);

  const save = useMutation({
    mutationFn: async (value: string) => {
      const { data: existing } = await supabase
        .from("global_settings")
        .select("id")
        .eq("key", settingKey)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("global_settings")
          .update({ value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("global_settings")
          .insert({ key: settingKey, value, description: title });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global_settings", settingKey] });
      toast.success("HTML saved");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={18}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {settingKey === MDL_LAUNCH_HTML_KEY ? (
                <>
                  Add <code className="px-1 py-0.5 rounded bg-muted">data-popup-launch-button</code> to any
                  element you want to trigger the popup launch (e.g. <code className="px-1 py-0.5 rounded bg-muted">&lt;button data-popup-launch-button&gt;…&lt;/button&gt;</code>).
                </>
              ) : (
                <>
                  This page automatically calls <code className="px-1 py-0.5 rounded bg-muted">signalRedirectFromPopup</code> on load —
                  the HTML below is just the visible content shown to the user briefly before the window closes.
                </>
              )}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setHtml(defaultHtml)}
            disabled={save.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Reset to default
          </Button>
          <Button onClick={() => save.mutate(html)} disabled={save.isPending}>
            {save.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving</>
            ) : (
              <><Save className="w-4 h-4 mr-1" /> Save</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MdlPageHtmlEditor() {
  const [launchOpen, setLaunchOpen] = useState(false);
  const [redirectOpen, setRedirectOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Digital ID Popup Pages</h4>
          <p className="text-xs text-muted-foreground">
            Customize the HTML for the Launch Page and the Redirect Page used by the Digital ID popup.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setLaunchOpen(true)}>
          <Code2 className="w-3.5 h-3.5 mr-1" /> Edit Launch Page
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRedirectOpen(true)}>
          <Code2 className="w-3.5 h-3.5 mr-1" /> Edit Redirect Page
        </Button>
      </div>

      <HtmlEditorDialog
        open={launchOpen}
        onOpenChange={setLaunchOpen}
        settingKey={MDL_LAUNCH_HTML_KEY}
        title="Launch Page"
        description="Shown inside the verification step before the user clicks to open the mobile popup."
        defaultHtml={DEFAULT_LAUNCH_HTML}
      />
      <HtmlEditorDialog
        open={redirectOpen}
        onOpenChange={setRedirectOpen}
        settingKey={MDL_REDIRECT_HTML_KEY}
        title="Redirect Page"
        description="Shown on /verify/redirect — the page the popup lands on before signalling back to the opener and closing."
        defaultHtml={DEFAULT_REDIRECT_HTML}
      />
    </div>
  );
}
