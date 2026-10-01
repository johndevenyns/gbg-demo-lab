import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoBuildStore } from "@/stores/demoBuildStore";
import { DemoCreationWizard } from "./DemoCreationWizard";

/**
 * Mounted once at app level so a running demo build survives page navigation.
 * When the dialog is hidden mid-build, a floating status pill lets the user reopen it.
 */
export function GlobalDemoWizard() {
  const navigate = useNavigate();
  const { open, setOpen, minimized, status, customerName, progress, restore, clear } = useDemoBuildStore();

  return (
    <>
      <DemoCreationWizard
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => navigate(`/admin/demo/${id}`)}
      />
      {minimized && status && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
          {status === 'building' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {status === 'complete' && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {status === 'failed' && <AlertTriangle className="h-4 w-4 text-destructive" />}
          <div className="text-sm">
            <div className="font-medium">
              {status === 'building' ? `Building ${customerName ?? 'demo'}…` : status === 'complete' ? `${customerName ?? 'Demo'} is ready` : `${customerName ?? 'Demo'} build had problems`}
            </div>
            {status === 'building' && <div className="text-xs text-muted-foreground">{progress}% complete</div>}
          </div>
          <Button size="sm" variant="outline" onClick={restore}>
            {status === 'building' ? 'View progress' : 'View results'}
          </Button>
          {status !== 'building' && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clear} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </>
  );
}
